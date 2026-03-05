import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"

type Options = {
    apiKey: string
}

export class RoyalMailProviderService extends AbstractFulfillmentProviderService {
    static identifier = "royal-mail-fulfillment"
    private client: RoyalMailClient
    private logger_: Logger

    constructor(container: { logger: Logger }, options: Options) {
        super()
        this.logger_ = container.logger

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

    async getFulfillmentOptions() {
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
    ) {
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

    async canCalculate(data: any): Promise<boolean> {
        // Return false unless we implement dynamic rate calculation via API
        return false
    }

    async calculatePrice(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<any> {
        // Return a dummy price or dynamic price if canCalculate is true
        return {
            calculated_amount: 500, // £5.00
            is_calculated_price_tax_inclusive: true,
        }
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: any[],
        order: any,
        fulfillment: any
    ): Promise<any> {
        try {
            // Map Medusa order data to Royal Mail API structure
            const rmOrder = {
                // Basic mapping example (will be refined based on exact RM API needs)
                orderReference: order?.display_id?.toString() || order?.id,
                recipient: {
                    address: {
                        fullName: `${order?.shipping_address?.first_name || ''} ${order?.shipping_address?.last_name || ''}`.trim(),
                        addressLine1: order?.shipping_address?.address_1,
                        city: order?.shipping_address?.city,
                        postcode: order?.shipping_address?.postal_code,
                        countryCode: order?.shipping_address?.country_code?.toUpperCase(),
                    },
                    phoneNumber: order?.shipping_address?.phone,
                    emailAddress: order?.email,
                },
                items: items.map(item => ({
                    name: item.title,
                    sku: item.sku,
                    quantity: item.quantity,
                    value: item.unit_price || 0,
                    weightInGrams: item.weight || 0,
                }))
            }

            const response = await this.client.createOrders([rmOrder])

            // Return tracking details and any RM specific IDs
            return {
                data: {
                    rmOrderId: response.orders?.[0]?.orderIdentifier,
                },
                labels: []
            }
        } catch (e: any) {
            this.logger_.error(`[Royal Mail] Failed to create fulfillment: ${e.message}`)
            throw e
        }
    }

    async cancelFulfillment(fulfillment: Record<string, unknown>) {
        // Royal Mail doesn't always support canceling via typical API if labels are printed,
        // but we can try removing order if RM supports it or just mark canceled in Medusa.
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`)
        return {}
    }
}
