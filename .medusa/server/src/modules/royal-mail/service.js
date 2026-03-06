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
        this.client = new client_1.RoyalMailClient({ apiKey: options.apiKey }, this.logger_);
    }
    async getFulfillmentOptions() {
        return [
            { id: "rm-1st-class", name: "Royal Mail 1st Class" },
            { id: "rm-2nd-class", name: "Royal Mail 2nd Class" },
            { id: "rm-tracked-24", name: "Royal Mail Tracked 24" },
            { id: "rm-tracked-48", name: "Royal Mail Tracked 48" }
        ];
    }
    async validateFulfillmentData(optionData, data, context) {
        return { ...optionData, ...data };
    }
    async validateOption(data) {
        return true;
    }
    async canCalculate(data) {
        return false;
    }
    async calculatePrice(optionData, data, context) {
        return {
            calculated_amount: 500,
            is_calculated_price_tax_inclusive: true,
        };
    }
    async getSmartWeight(variantId, order, currentWeight) {
        if (currentWeight && currentWeight > 0)
            return currentWeight;
        const orderItem = order?.items?.find(i => i.variant_id === variantId);
        const weight = orderItem?.variant?.weight || orderItem?.variant?.product?.weight;
        return weight && weight > 0 ? Number(weight) : 1;
    }
    async createFulfillment(data, items, order, fulfillment) {
        try {
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
            const orderIdentifier = response.createdOrders?.[0]?.orderIdentifier ??
                response.orders?.[0]?.orderIdentifier;
            this.logger_.info(`[Royal Mail] Order created successfully. RM identifier: ${orderIdentifier}`);
            return {
                data: {
                    rmOrderId: String(orderIdentifier),
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
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`);
        return {};
    }
}
exports.RoyalMailProviderService = RoyalMailProviderService;
RoyalMailProviderService.identifier = "royal-mail-fulfillment";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFZOUUsK0RBQW9FO0FBV3BFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBSzVFLFlBQVksRUFBRSxNQUFNLEVBQXdCLEVBQUUsT0FBZ0I7UUFDMUQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUVyQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDdkIsT0FBTztZQUNILEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDcEQsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNwRCxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3RELEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7U0FDekQsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQ3pCLFVBQW1DLEVBQ25DLElBQTZCLEVBQzdCLE9BQWdDO1FBRWhDLE9BQU8sRUFBRSxHQUFHLFVBQVUsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxL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