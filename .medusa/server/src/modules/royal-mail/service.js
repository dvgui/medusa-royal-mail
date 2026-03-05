"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
class RoyalMailProviderService extends utils_1.AbstractFulfillmentProviderService {
    constructor(container, options) {
        super();
        this.logger_ = container.logger;
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
                        weightInGrams: items.reduce((acc, item) => {
                            const raw = item;
                            return acc + (raw.weight || 0) * (item.quantity || 1);
                        }, 0),
                        packageFormatIdentifier: data?.package_format_identifier || "parcel",
                        contents: items.map(item => {
                            const raw = item;
                            return {
                                name: item.title || "Item",
                                SKU: item.sku || undefined,
                                quantity: item.quantity || 1,
                                unitValue: Number(raw.unit_price || 0),
                                unitWeightInGrams: Number(raw.weight || undefined) || undefined
                            };
                        })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFZOUUsK0RBQW9FO0FBT3BFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBSzVFLFlBQVksU0FBNkIsRUFBRSxPQUFnQjtRQUN2RCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUUvQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUM3QjtZQUNJLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtTQUN6QixFQUNELElBQUksQ0FBQyxPQUFPLENBQ2YsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3ZCLDZEQUE2RDtRQUM3RCxnRUFBZ0U7UUFDaEUsbUZBQW1GO1FBQ25GLE9BQU87WUFDSCxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDcEQsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUN0RCxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1NBQ3pELENBQUE7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUN6QixVQUFtQyxFQUNuQyxJQUE2QixFQUM3QixPQUFnQztRQUVoQyxrRkFBa0Y7UUFDbEYsT0FBTztZQUNI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