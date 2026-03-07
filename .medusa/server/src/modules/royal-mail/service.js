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
            { id: "rm-signed-for-1st", name: "Royal Mail Signed For 1st Class" },
            { id: "rm-international-tracked-signed", name: "International Tracked and Signed" }
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
        const orderItem = variantId ? order?.items?.find(i => i.variant_id === variantId) : null;
        const v = orderItem?.variant;
        const weight = currentWeight || v?.weight || orderItem?.weight || v?.product?.weight;
        const length = v?.length || orderItem?.length || v?.product?.length || 0;
        const width = v?.width || orderItem?.width || v?.product?.width || 0;
        const height = v?.height || orderItem?.height || v?.product?.height || 0;
        if (!weight || Number(weight) <= 0) {
            throw new Error(`Weight missing or invalid for variant ${variantId}. Royal Mail requires accurate weights for all items.`);
        }
        return {
            weight: Number(weight),
            length: Number(length),
            width: Number(width),
            height: Number(height)
        };
    }
    getSmartPackageFormat(totalWeight, maxL, maxW, totalH) {
        // Letter: 24 x 16.5 x 0.5 cm, Max 100g
        if (totalWeight <= 100 && maxL <= 24 && maxW <= 16.5 && totalH <= 0.5) {
            return "letter";
        }
        // Large Letter: 35.3 x 25 x 2.5 cm, Max 750g (using 1000g for tracked as safe buffer)
        if (totalWeight <= 1000 && maxL <= 35.3 && maxW <= 25 && totalH <= 2.5) {
            return "largeLetter";
        }
        // Small Parcel: 45 x 35 x 16 cm, Max 2kg
        if (totalWeight <= 2000 && maxL <= 45 && maxW <= 35 && totalH <= 16) {
            return "smallParcel";
        }
        // Medium Parcel: 61 x 46 x 46 cm, Max 20kg
        if (totalWeight <= 20000 && maxL <= 61 && maxW <= 46 && totalH <= 46) {
            return "mediumParcel";
        }
        // Large Parcel: Up to 30kg
        if (totalWeight <= 30000) {
            return "largeParcel";
        }
        return "undefined";
    }
    async createFulfillment(data, items, order, fulfillment) {
        try {
            let totalWeight = 0;
            let maxL = 0;
            let maxW = 0;
            let totalH = 0;
            const resolvedContents = await Promise.all(items.map(async (item) => {
                const lineItemId = item.line_item_id;
                const orderItem = order?.items?.find(i => i.id === lineItemId);
                const variantId = orderItem?.variant_id || item.variant_id;
                const stats = await this.getSmartWeight(variantId, order, Number(item.weight || orderItem?.variant?.weight));
                const qty = item.quantity || 1;
                totalWeight += (stats.weight * qty);
                maxL = Math.max(maxL, stats.length);
                maxW = Math.max(maxW, stats.width);
                totalH += (stats.height * qty);
                return {
                    name: item.title || orderItem?.title || "Item",
                    SKU: item.sku || orderItem?.variant?.sku || undefined,
                    quantity: qty,
                    unitValue: Number(item.unit_price || orderItem?.unit_price || 0),
                    unitWeightInGrams: stats.weight
                };
            }));
            const packageFormat = data?.package_format_identifier ||
                this.getSmartPackageFormat(totalWeight, maxL, maxW, totalH);
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
                        weightInGrams: totalWeight,
                        packageFormatIdentifier: packageFormat,
                        contents: resolvedContents
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFZOUUsK0RBQW9FO0FBV3BFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBSzVFLFlBQVksRUFBRSxNQUFNLEVBQXdCLEVBQUUsT0FBZ0I7UUFDMUQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUVyQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUI7UUFDdkIsT0FBTztZQUNILEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxpQ0FBaUMsRUFBRTtZQUNwRSxFQUFFLEVBQUUsRUFBRSxpQ0FBaUMsRUFBRSxJQUFJLEVBQUUsa0NBQWtDLEVBQUU7U0FDdEYsQ0FBQTtJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQ3pCLFVBQW1DLEVBQ25DLElBQTZCLEVBQzdCLE9BQWdDO1FBRWhDLE9BQU8sRUFBRSxHQUFHLFVBQVUsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQTZCO1FBQzlDLE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBNkI7UUFDNUMsT0FBTyxLQUFL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