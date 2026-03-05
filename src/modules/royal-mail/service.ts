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
    Query,
} from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"
import { RoyalMailOrder } from "../../lib/royal-mail-client/types"

type InjectedDependencies = {
    logger: Logger
    query: Query
}

type Options = {
    apiKey: string
}

export class RoyalMailProviderService extends AbstractFulfillmentProviderService {
    static identifier = "royal-mail-fulfillment"
    private client: RoyalMailClient
    private logger_: Logger
    private query_: Query

    constructor({ logger, query }: InjectedDependencies, options: Options) {
        super()
        this.logger_ = logger
        this.query_ = query

        if (!options.apiKey) {
            this.logger_.warn("[Royal Mail] apiKey is missing in fulfillment module options.")
        }

        this.client = new RoyalMailClient(
            {
                apiKey: options.apiKey,
            },
            this.logger_
        )
    }

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        // Return standard shipping options available via Royal Mail.
        // In a real scenario, this could be dynamic, but for click&drop
        // usually merchants set up fixed options like 1st Class, 2nd Class, Tracked 24/48.
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
        // e.g. check if the customer provided a valid address or phone number if required
        return {
            ...optionData,
            ...data,
        }
    }

    async validateOption(data: Record<string, unknown>) {
        // Validate if the shipping option is supported by RM
        return true
    }

    async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
        // Return false unless we implement dynamic rate calculation via API
        return false
    }

    async calculatePrice(
        optionData: CalculateShippingOptionPriceDTO["optionData"],
        data: CalculateShippingOptionPriceDTO["data"],
        context: CalculateShippingOptionPriceDTO["context"]
    ): Promise<CalculatedShippingOptionPrice> {
        // Return a dummy price or dynamic price if canCalculate is true
        return {
            calculated_amount: 500, // £5.00
            is_calculated_price_tax_inclusive: true,
        }
    }

    private async getSmartWeight(variantId: string, currentWeight?: number): Promise<number> {
        if (currentWeight && currentWeight > 0) {
            return currentWeight
        }

        try {
            const { data: [variant] } = await this.query_.graph({
                entity: "product_variant",
                fields: ["weight", "product.weight"],
                filters: { id: variantId },
            })

            const weight = (variant as any)?.weight || (variant as any)?.product?.weight
            return weight && weight > 0 ? Number(weight) : 1
        } catch (e) {
            return 1
        }
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
        order: Partial<FulfillmentOrderDTO> | undefined,
        fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
    ): Promise<CreateFulfillmentResult> {
        try {
            // Map Medusa order data to Royal Mail API structure
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
                            const weight = await this.getSmartWeight(variantId, Number(raw.weight))
                            return acc + (weight * (item.quantity || 1))
                        }, Promise.resolve(0))),
                        packageFormatIdentifier: (data?.package_format_identifier as string) || "parcel",
                        contents: await Promise.all(items.map(async item => {
                            const raw = item as any
                            const variantId = raw.variant_id || raw.line_item?.variant_id
                            const weight = await this.getSmartWeight(variantId, Number(raw.weight))
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

            // Return tracking details and any RM specific IDs
            return {
                data: {
                    rmOrderId: response.orders?.[0]?.orderIdentifier,
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

    async cancelFulfillment(fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>): Promise<any> {
        // Royal Mail doesn't always support canceling via typical API if labels are printed,
        // but we can try removing order if RM supports it or just mark canceled in Medusa.
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`)
        return {}
    }
}
