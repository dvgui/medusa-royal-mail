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
                    emailAddress: order?.email,
                    ...(order?.shipping_address?.phone ? { phoneNumber: order.shipping_address.phone } : {}),
                },
                items: items.map(item => ({
                    name: item.title,
                    sku: item.sku,
                    quantity: item.quantity,
                    value: item.unit_price || 0,
                    orderDate: new Date(order?.created_at || Date.now()).toISOString(),
                    subtotal: order?.item_total || 0,
                    shippingCostCharged: order?.shipping_total || 0,
                    total: order?.total || 0,
                    ...(item.weight ? { weightInGrams: item.weight } : {})
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