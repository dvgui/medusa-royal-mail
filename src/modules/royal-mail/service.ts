import {
    AbstractFulfillmentProviderService,
    ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import {
    Logger,
    CreateFulfillmentResult,
    FulfillmentDTO,
    FulfillmentItemDTO,
    FulfillmentOrderDTO,
    FulfillmentOption,
    CalculateShippingOptionPriceDTO,
    CalculatedShippingOptionPrice,
    CreateShippingOptionDTO,
    RemoteQueryFunction,
} from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { RoyalMailOrder } from "../../lib/royal-mail-client/types"

type InjectedDependencies = {
    logger: Logger
    [ContainerRegistrationKeys.QUERY]?: RemoteQueryFunction
}

type Options = {
    apiKey: string
}

type Dimensions = {
    weight: number
    length: number
    width: number
    height: number
}

type HydratedVariant = {
    id?: string | null
    weight?: number | null
    length?: number | null
    width?: number | null
    height?: number | null
    sku?: string | null
    product_id?: string | null
    product?: {
        id?: string | null
        weight?: number | null
        length?: number | null
        width?: number | null
        height?: number | null
    } | null
}

type HydratedItem = {
    id?: string
    line_item_id?: string | null
    title?: string | null
    quantity?: number | null
    sku?: string | null
    unit_price?: number | string | null
    variant_id?: string | null
    product_id?: string | null
    weight?: number | null
    length?: number | null
    width?: number | null
    height?: number | null
    variant?: HydratedVariant | null
}

const toPositive = (v: unknown): number | undefined => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

export class RoyalMailProviderService extends AbstractFulfillmentProviderService {
    static identifier = "royal-mail-fulfillment"
    private client: RoyalMailClient
    private logger_: Logger
    private query_?: RemoteQueryFunction

    constructor(deps: InjectedDependencies, options: Options) {
        super()
        this.logger_ = deps.logger

        // Fulfillment provider containers don't always register `query`. Awilix
        // throws on missing keys, so probe defensively and fall back to undefined.
        try {
            this.query_ = (deps as Record<string, unknown>)[
                ContainerRegistrationKeys.QUERY
            ] as RemoteQueryFunction | undefined
        } catch {
            this.query_ = undefined
        }

        if (!options.apiKey) {
            this.logger_.warn("[Royal Mail] apiKey is missing in fulfillment module options.")
        }

        this.client = new RoyalMailClient({ apiKey: options.apiKey }, this.logger_)
    }

    private async fetchProductDimensions(
        productId: string
    ): Promise<Partial<Dimensions>> {
        if (!this.query_) return {}
        try {
            const { data } = await this.query_.graph({
                entity: "product",
                fields: ["id", "weight", "length", "width", "height"],
                filters: { id: productId },
            })
            const p = data?.[0]
            if (!p) return {}
            return {
                weight: toPositive(p.weight),
                length: toPositive(p.length),
                width: toPositive(p.width),
                height: toPositive(p.height),
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            this.logger_.warn(
                `[Royal Mail] Failed to fetch product ${productId} dimensions: ${message}`
            )
            return {}
        }
    }

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        return [
            { id: "rm-signed-for-1st", name: "Royal Mail Signed For 1st Class" },
            { id: "rm-international-tracked-signed", name: "International Tracked and Signed" }
        ]
    }

    async validateFulfillmentData(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<any> {
        return { ...optionData, ...data }
    }

    async validateOption(data: Record<string, unknown>) {
        return true
    }

    async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
        return false
    }

    async calculatePrice(
        optionData: CalculateShippingOptionPriceDTO["optionData"],
        data: CalculateShippingOptionPriceDTO["data"],
        context: CalculateShippingOptionPriceDTO["context"]
    ): Promise<CalculatedShippingOptionPrice> {
        return {
            calculated_amount: 500,
            is_calculated_price_tax_inclusive: true,
        }
    }

    private async getSmartWeight(
        variantId: string | undefined,
        order: Partial<FulfillmentOrderDTO> | undefined,
        currentWeight?: number
    ): Promise<Dimensions> {
        const items = (order?.items ?? []) as HydratedItem[]
        const orderItem = variantId
            ? items.find((i) => i.variant_id === variantId)
            : undefined
        const variant = orderItem?.variant ?? undefined
        const product = variant?.product ?? undefined

        let weight =
            toPositive(currentWeight) ??
            toPositive(variant?.weight) ??
            toPositive(orderItem?.weight) ??
            toPositive(product?.weight)

        let length =
            toPositive(variant?.length) ??
            toPositive(orderItem?.length) ??
            toPositive(product?.length)
        let width =
            toPositive(variant?.width) ??
            toPositive(orderItem?.width) ??
            toPositive(product?.width)
        let height =
            toPositive(variant?.height) ??
            toPositive(orderItem?.height) ??
            toPositive(product?.height)

        const productId = product?.id ?? variant?.product_id ?? orderItem?.product_id
        const needsFetch = !weight || !length || !width || !height
        if (needsFetch && productId) {
            const fetched = await this.fetchProductDimensions(productId)
            weight = weight ?? fetched.weight
            length = length ?? fetched.length
            width = width ?? fetched.width
            height = height ?? fetched.height
        }

        if (!weight) {
            throw new Error(
                `Weight missing or invalid for variant ${variantId}. Royal Mail requires accurate weights for all items.`
            )
        }

        return {
            weight,
            length: length ?? 0,
            width: width ?? 0,
            height: height ?? 0,
        }
    }

    private getSmartPackageFormat(totalWeight: number, maxL: number, maxW: number, totalH: number): string {
        // Letter: 24 x 16.5 x 0.5 cm, Max 100g
        if (totalWeight <= 100 && maxL <= 24 && maxW <= 16.5 && totalH <= 0.5) {
            return "letter"
        }

        // Large Letter: 35.3 x 25 x 2.5 cm, Max 750g (using 1000g for tracked as safe buffer)
        if (totalWeight <= 1000 && maxL <= 35.3 && maxW <= 25 && totalH <= 2.5) {
            return "largeLetter"
        }

        // Small Parcel: 45 x 35 x 16 cm, Max 2kg
        if (totalWeight <= 2000 && maxL <= 45 && maxW <= 35 && totalH <= 16) {
            return "smallParcel"
        }

        // Medium Parcel: 61 x 46 x 46 cm, Max 20kg
        if (totalWeight <= 20000 && maxL <= 61 && maxW <= 46 && totalH <= 46) {
            return "mediumParcel"
        }

        // Large Parcel: Up to 30kg
        if (totalWeight <= 30000) {
            return "largeParcel"
        }

        return "undefined"
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
        order: Partial<FulfillmentOrderDTO> | undefined,
        fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
    ): Promise<CreateFulfillmentResult> {
        try {
            const fulfillmentData =
                (fulfillment as { data?: Record<string, unknown> }).data ?? {}

            const existingRmOrderId = fulfillmentData.rmOrderId as
                | string
                | undefined

            if (existingRmOrderId) {
                this.logger_.info(
                    `[Royal Mail] Skipping createOrders – existing rmOrderId=${existingRmOrderId} on fulfillment ${fulfillment.id}`
                )

                return {
                    data: {
                        ...fulfillmentData,
                        rmOrderId: String(existingRmOrderId),
                    },
                    labels: [],
                }
            }

            let totalWeight = 0
            let maxL = 0
            let maxW = 0
            let totalH = 0

            const orderItems = (order?.items ?? []) as HydratedItem[]

            const resolvedContents = await Promise.all(
                items.map(async (rawItem) => {
                    const item = rawItem as HydratedItem & { quantity?: number; title?: string | null; sku?: string | null }
                    const lineItemId = item.line_item_id
                    const orderItem = orderItems.find((i) => i.id === lineItemId)
                    const variantId = orderItem?.variant_id ?? item.variant_id ?? undefined

                    const stats = await this.getSmartWeight(
                        variantId ?? undefined,
                        order,
                        toPositive(item.weight) ?? toPositive(orderItem?.variant?.weight)
                    )

                    const qty = item.quantity ?? 1
                    totalWeight += stats.weight * qty
                    maxL = Math.max(maxL, stats.length)
                    maxW = Math.max(maxW, stats.width)
                    totalH += stats.height * qty

                    return {
                        name: item.title ?? orderItem?.title ?? "Item",
                        SKU: item.sku ?? orderItem?.variant?.sku ?? undefined,
                        quantity: qty,
                        unitValue: Number(
                            item.unit_price ?? orderItem?.unit_price ?? 0
                        ),
                        unitWeightInGrams: stats.weight,
                    }
                })
            )

            const packageFormat =
                (data?.package_format_identifier as string) ||
                this.getSmartPackageFormat(totalWeight, maxL, maxW, totalH)

            const rmOrder: RoyalMailOrder = {
                orderReference: order?.display_id?.toString() || order?.id,
                orderDate: new Date(order?.created_at || Date.now()).toISOString(),
                subtotal: Number(order?.item_total || 0),
                shippingCostCharged: Number(order?.shipping_total || 0),
                total: Number(order?.total || 0),
                recipient: {
                    address: {
                        fullName: `${order?.shipping_address?.first_name || ""} ${order?.shipping_address?.last_name || ""
                            }`.trim(),
                        addressLine1: order?.shipping_address?.address_1 || "",
                        addressLine2: order?.shipping_address?.address_2 || undefined,
                        city: order?.shipping_address?.city || "",
                        postcode: order?.shipping_address?.postal_code || "",
                        countryCode:
                            order?.shipping_address?.country_code?.toUpperCase() || "",
                    },
                    emailAddress: order?.email || undefined,
                    phoneNumber: order?.shipping_address?.phone || undefined,
                },
                packages: [
                    {
                        weightInGrams: totalWeight,
                        packageFormatIdentifier: packageFormat,
                        contents: resolvedContents,
                    },
                ],
            }

            console.log("====== MEDUSA TO ROYAL MAIL PAYLOAD ======")
            console.log(JSON.stringify(rmOrder, null, 2))
            console.log("==========================================")

            const response = await this.client.createOrders([rmOrder])

            console.log("====== ROYAL MAIL SUCCESS RESPONSE ======")
            console.log(JSON.stringify(response, null, 2))
            console.log("=========================================")

            if (response.errorsCount && response.errorsCount > 0) {
                const failReasons = JSON.stringify(response.failedOrders, null, 2)
                throw new Error(`Click & Drop Validation Failed: ${failReasons}`)
            }

            const orderIdentifier =
                response.createdOrders?.[0]?.orderIdentifier ??
                response.orders?.[0]?.orderIdentifier

            this.logger_.info(
                `[Royal Mail] Order created successfully. RM identifier: ${orderIdentifier}`
            )

            return {
                data: {
                    ...fulfillmentData,
                    rmOrderId: String(orderIdentifier),
                },
                labels: [],
            }
        } catch (e: any) {
            console.error("====== CRITICAL ROYAL MAIL API ERROR ======")
            console.error(e.message)
            console.error(JSON.stringify(e, null, 2))
            console.error("=========================================")
            this.logger_.error(
                `[Royal Mail] Failed to create fulfillment: ${e.message}`
            )
            throw e
        }
    }

    async cancelFulfillment(
        fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
    ): Promise<any> {
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`)
        return {}
    }
}