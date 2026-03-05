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
                recipient: {
                    address: {
                        fullName: `${order?.shipping_address?.first_name || ''} ${order?.shipping_address?.last_name || ''}`.trim(),
                        addressLine1: order?.shipping_address?.address_1,
                        city: order?.shipping_address?.city,
                        postcode: order?.shipping_address?.postal_code,
                        countryCode: order?.shipping_address?.country_code?.toUpperCase(),
                    },
                    phoneNumber: order?.shipping_address?.phone || "0000000000",
                    emailAddress: order?.email,
                },
                items: items.map(item => ({
                    name: item.title,
                    sku: item.sku,
                    quantity: item.quantity,
                    value: item.unit_price || 0,
                    weightInGrams: item.weight || 100, // Fallback to 100g if missing
                    orderDate: new Date(order?.created_at || Date.now()).toISOString(),
                    subtotal: order?.item_total || 0,
                    shippingCostCharged: order?.shipping_total || 0,
                    total: order?.total || 0,
                }))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFFOUUsK0RBQW9FO0FBTXBFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBSzVFLFlBQVksU0FBNkIsRUFBRSxPQUFnQjtRQUN2RCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUUvQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUM3QjtZQUNJLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtTQUN6QixFQUNELElBQUksQ0FBQyxPQUFPLENBQ2YsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQ3ZCLDZEQUE2RDtRQUM3RCxnRUFBZ0U7UUFDaEUsbUZBQW1GO1FBQ25GLE9BQU87WUFDSCxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDcEQsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUN0RCxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1NBQ3pELENBQUE7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUN6QixVQUFtQyxFQUNuQyxJQUE2QixFQUM3QixPQUFnQztRQUVoQyxrRkFBa0Y7UUFDbEYsT0FBTztZQUNI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