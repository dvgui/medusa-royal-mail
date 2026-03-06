import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
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
} from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { RoyalMailOrder } from "../../lib/royal-mail-client/types"

type InjectedDependencies = {
    logger: Logger
}

type Options = {
    apiKey: string
}

export class RoyalMailProviderService extends AbstractFulfillmentProviderService {
    static identifier = "royal-mail-fulfillment"
    private client: RoyalMailClient
    private logger_: Logger

    constructor({ logger }: InjectedDependencies, options: Options) {
        super()
        this.logger_ = logger

        if (!options.apiKey) {
            this.logger_.warn("[Royal Mail] apiKey is missing in fulfillment module options.")
        }

        this.client = new RoyalMailClient({ apiKey: options.apiKey }, this.logger_)
    }

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        return [
            { id: "rm-1st-class", name: "Royal Mail 1st Class" },
            { id: "rm-2nd-class", name: "Royal Mail 2nd Class" },
            { id: "rm-tracked-24", name: "Royal Mail Tracked 24" },
            { id: "rm-tracked-48", name: "Royal Mail Tracked 48" }
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
        variantId: string,
        order: Partial<FulfillmentOrderDTO> | undefined,
        currentWeight?: number
    ): Promise<number> {
        if (currentWeight && currentWeight > 0) return currentWeight
        const orderItem = order?.items?.find(i => i.variant_id === variantId)
        const weight = (orderItem as any)?.variant?.weight || (orderItem as any)?.variant?.product?.weight
        return weight && weight > 0 ? Number(weight) : 1
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
        order: Partial<FulfillmentOrderDTO> | undefined,
        fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
    ): Promise<CreateFulfillmentResult> {
        try {
            const rmOrder: RoyalMailOrder = {
                orderReference: order?.display_id?.toString() || order?.id,
                orderDate: new Date(order?.created_at || Date.now()).toISOString(),
                subtotal: Number(order?.item_total || 0),
                shippingCostCharged: Number(order?.shipping_total || 0),
                total: Number(order?.total || 0),
                recipient: {
                    address: {
                        fullName: `${order?.shipping_address?.first_name || ''} ${order?.shipping_address?.last_name || ''}`.trim(),
                        addressLine1: order?.shipping_address?.address_1 || "",
                        addressLine2: order?.shipping_address?.address_2 || undefined,
                        city: order?.shipping_address?.city || "",
                        postcode: order?.shipping_address?.postal_code || "",
                        countryCode: order?.shipping_address?.country_code?.toUpperCase() || "",
                    },
                    emailAddress: order?.email || undefined,
                    phoneNumber: order?.shipping_address?.phone || undefined,
                },
                packages: [
                    {
                        weightInGrams: Math.max(1, await items.reduce(async (accPromise, item) => {
                            const acc = await accPromise
                            const raw = item as any
                            const variantId = raw.variant_id || raw.line_item?.variant_id
                            const weight = await this.getSmartWeight(variantId, order, Number(raw.weight))
                            return acc + (weight * (item.quantity || 1))
                        }, Promise.resolve(0))),
                        packageFormatIdentifier: (data?.package_format_identifier as string) || "parcel",
                        contents: await Promise.all(items.map(async item => {
                            const raw = item as any
                            const variantId = raw.variant_id || raw.line_item?.variant_id
                            const weight = await this.getSmartWeight(variantId, order, Number(raw.weight))
                            return {
                                name: item.title || "Item",
                                SKU: item.sku || undefined,
                                quantity: item.quantity || 1,
                                unitValue: Number((raw.unit_price as any) || 0),
                                unitWeightInGrams: weight
                            }
                        }))
                    }
                ]
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
                    rmOrderId: String(orderIdentifier),
                },
                labels: []
            }
        } catch (e: any) {
            console.error("====== CRITICAL ROYAL MAIL API ERROR ======")
            console.error(e.message)
            console.error(JSON.stringify(e, null, 2))
            console.error("=========================================")
            this.logger_.error(`[Royal Mail] Failed to create fulfillment: ${e.message}`)
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