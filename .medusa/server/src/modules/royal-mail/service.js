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
            };
            const response = await this.client.createOrders([rmOrder]);
            // Return tracking details and any RM specific IDs
            return {
                data: {
                    rmOrderId: response.orders?.[0]?.orderIdentifier,
                },
                labels: []
            };
        }
        catch (e) {
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