"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
class RoyalMailProviderService extends utils_1.AbstractFulfillmentProviderService {
    constructor({ logger }, options) {
        super();
        this.logger_ = logger;
        if (!options.apiKey) {
            this.logger_.warn("[Royal Mail] apiKey is missing in fulfillment module options.");
        }
        this.client = new client_1.RoyalMailClient({
            apiKey: options.apiKey,
        }, this.logger_);
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
        ];
    }
    async validateFulfillmentData(optionData, data, context) {
        // e.g. check if the customer provided a valid address or phone number if required
        return {
            ...optionData,
            ...data,
        };
    }
    async validateOption(data) {
        // Validate if the shipping option is supported by RM
        return true;
    }
    async canCalculate(data) {
        // Return false unless we implement dynamic rate calculation via API
        return false;
    }
    async calculatePrice(optionData, data, context) {
        // Return a dummy price or dynamic price if canCalculate is true
        return {
            calculated_amount: 500, // £5.00
            is_calculated_price_tax_inclusive: true,
        };
    }
    async getSmartWeight(variantId, order, currentWeight) {
        if (currentWeight && currentWeight > 0) {
            return currentWeight;
        }
        // Try to find the weight in the order items if available
        const orderItem = order?.items?.find(i => i.variant_id === variantId);
        const weight = orderItem?.variant?.weight || orderItem?.variant?.product?.weight;
        return weight && weight > 0 ? Number(weight) : 1;
    }
    async createFulfillment(data, items, order, fulfillment) {
        try {
            // Map Medusa order data to Royal Mail API structure
            const rmOrder = {
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
                            const acc = await accPromise;
                            const raw = item;
                            const variantId = raw.variant_id || raw.line_item?.variant_id;
                            const weight = await this.getSmartWeight(variantId, order, Number(raw.weight));
                            return acc + (weight * (item.quantity || 1));
                        }, Promise.resolve(0))),
                        packageFormatIdentifier: data?.package_format_identifier || "parcel",
                        contents: await Promise.all(items.map(async (item) => {
                            const raw = item;
                            const variantId = raw.variant_id || raw.line_item?.variant_id;
                            const weight = await this.getSmartWeight(variantId, order, Number(raw.weight));
                            return {
                                name: item.title || "Item",
                                SKU: item.sku || undefined,
                                quantity: item.quantity || 1,
                                unitValue: Number(raw.unit_price || 0),
                                unitWeightInGrams: weight
                            };
                        }))
                    }
                ]
            };
            console.log("====== MEDUSA TO ROYAL MAIL PAYLOAD ======");
            console.log(JSON.stringify(rmOrder, null, 2));
            console.log("==========================================");
            const response = await this.client.createOrders([rmOrder]);
            console.log("====== ROYAL MAIL SUCCESS RESPONSE ======");
            console.log(JSON.stringify(response, null, 2));
            console.log("=========================================");
            if (response.errorsCount && response.errorsCount > 0) {
                const failReasons = JSON.stringify(response.failedOrders, null, 2);
                throw new Error(`Click & Drop Validation Failed: ${failReasons}`);
            }
            // Return tracking details and any RM specific IDs
            return {
                data: {
                    rmOrderId: response.orders?.[0]?.orderIdentifier,
                },
                labels: []
            };
        }
        catch (e) {
            console.error("====== CRITICAL ROYAL MAIL API ERROR ======");
            console.error(e.message);
            console.error(JSON.stringify(e, null, 2));
            console.error("=========================================");
            this.logger_.error(`[Royal Mail] Failed to create fulfillment: ${e.message}`);
            throw e;
        }
    }
    async cancelFulfillment(fulfillment) {
        // Royal Mail doesn't always support canceling via typical API if labels are printed,
        // but we can try removing order if RM supports it or just mark canceled in Medusa.
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`);
        return {};
    }
}
exports.RoyalMailProviderService = RoyalMailProviderService;
RoyalMailProviderService.identifier = "royal-mail-fulfillment";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFZOUUsK0RBQW9FO0FBV3BFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBSzVFLFlBQVksRUFBRSxNQUFNLEVBQXdCLEVBQUUsT0FBZ0I7UUFDMUQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUVyQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUM3QjtZQUNJLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtTQUN6QixFQUNELElBQUksQ0FBQyxPQUFPLENBQ2YsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3ZCLDZEQUE2RDtRQUM3RCxnRUFBZ0U7UUFDaEUsbUZBQW1GO1FBQ25GLE9BQU87WUFDSCxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDcEQsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUN0RCxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1NBQ3pELENBQUE7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUN6QixVQUFtQyxFQUNuQyxJQUE2QixFQUM3QixPQUFnQztRQUVoQyxrRkFBa0Y7UUFDbEYsT0FBTztZQUNI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