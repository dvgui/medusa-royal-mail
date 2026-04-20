"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
const toPositive = (v) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
class RoyalMailProviderService extends utils_1.AbstractFulfillmentProviderService {
    constructor(deps, options) {
        super();
        this.logger_ = deps.logger;
        // Fulfillment provider containers don't always register `query`. Awilix
        // throws on missing keys, so probe defensively and fall back to undefined.
        try {
            this.query_ = deps[utils_1.ContainerRegistrationKeys.QUERY];
        }
        catch {
            this.query_ = undefined;
        }
        if (!options.apiKey) {
            this.logger_.warn("[Royal Mail] apiKey is missing in fulfillment module options.");
        }
        this.client = new client_1.RoyalMailClient({ apiKey: options.apiKey }, this.logger_);
    }
    async fetchProductDimensions(productId) {
        if (!this.query_)
            return {};
        try {
            const { data } = await this.query_.graph({
                entity: "product",
                fields: ["id", "weight", "length", "width", "height"],
                filters: { id: productId },
            });
            const p = data?.[0];
            if (!p)
                return {};
            return {
                weight: toPositive(p.weight),
                length: toPositive(p.length),
                width: toPositive(p.width),
                height: toPositive(p.height),
            };
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            this.logger_.warn(`[Royal Mail] Failed to fetch product ${productId} dimensions: ${message}`);
            return {};
        }
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
        const items = (order?.items ?? []);
        const orderItem = variantId
            ? items.find((i) => i.variant_id === variantId)
            : undefined;
        const variant = orderItem?.variant ?? undefined;
        const product = variant?.product ?? undefined;
        let weight = toPositive(currentWeight) ??
            toPositive(variant?.weight) ??
            toPositive(orderItem?.weight) ??
            toPositive(product?.weight);
        let length = toPositive(variant?.length) ??
            toPositive(orderItem?.length) ??
            toPositive(product?.length);
        let width = toPositive(variant?.width) ??
            toPositive(orderItem?.width) ??
            toPositive(product?.width);
        let height = toPositive(variant?.height) ??
            toPositive(orderItem?.height) ??
            toPositive(product?.height);
        const productId = product?.id ?? variant?.product_id ?? orderItem?.product_id;
        const needsFetch = !weight || !length || !width || !height;
        if (needsFetch && productId) {
            const fetched = await this.fetchProductDimensions(productId);
            weight = weight ?? fetched.weight;
            length = length ?? fetched.length;
            width = width ?? fetched.width;
            height = height ?? fetched.height;
        }
        if (!weight) {
            throw new Error(`Weight missing or invalid for variant ${variantId}. Royal Mail requires accurate weights for all items.`);
        }
        return {
            weight,
            length: length ?? 0,
            width: width ?? 0,
            height: height ?? 0,
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
            const fulfillmentData = fulfillment.data ?? {};
            const existingRmOrderId = fulfillmentData.rmOrderId;
            if (existingRmOrderId) {
                this.logger_.info(`[Royal Mail] Skipping createOrders – existing rmOrderId=${existingRmOrderId} on fulfillment ${fulfillment.id}`);
                return {
                    data: {
                        ...fulfillmentData,
                        rmOrderId: String(existingRmOrderId),
                    },
                    labels: [],
                };
            }
            let totalWeight = 0;
            let maxL = 0;
            let maxW = 0;
            let totalH = 0;
            const orderItems = (order?.items ?? []);
            const resolvedContents = await Promise.all(items.map(async (rawItem) => {
                const item = rawItem;
                const lineItemId = item.line_item_id;
                const orderItem = orderItems.find((i) => i.id === lineItemId);
                const variantId = orderItem?.variant_id ?? item.variant_id ?? undefined;
                const stats = await this.getSmartWeight(variantId ?? undefined, order, toPositive(item.weight) ?? toPositive(orderItem?.variant?.weight));
                const qty = item.quantity ?? 1;
                totalWeight += stats.weight * qty;
                maxL = Math.max(maxL, stats.length);
                maxW = Math.max(maxW, stats.width);
                totalH += stats.height * qty;
                return {
                    name: item.title ?? orderItem?.title ?? "Item",
                    SKU: item.sku ?? orderItem?.variant?.sku ?? undefined,
                    quantity: qty,
                    unitValue: Number(item.unit_price ?? orderItem?.unit_price ?? 0),
                    unitWeightInGrams: stats.weight,
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
                        fullName: `${order?.shipping_address?.first_name || ""} ${order?.shipping_address?.last_name || ""}`.trim(),
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
                        contents: resolvedContents,
                    },
                ],
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
                    ...fulfillmentData,
                    rmOrderId: String(orderIdentifier),
                },
                labels: [],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFHa0M7QUFhbEMsK0RBQW9FO0FBb0RwRSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQVUsRUFBc0IsRUFBRTtJQUNsRCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBWSxDQUFBO0lBQy9ELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUN0RCxDQUFDLENBQUE7QUFFRCxNQUFhLHdCQUF5QixTQUFRLDBDQUFrQztJQU01RSxZQUFZLElBQTBCLEVBQUUsT0FBZ0I7UUFDcEQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFFMUIsd0VBQXdFO1FBQ3hFLDJFQUEyRTtRQUMzRSxJQUFJLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSxHQUFJLElBQWdDLENBQzNDLGlDQUF5QixDQUFDLEtBQUssQ0FDQyxDQUFBO1FBQ3hDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywrREFBK0QsQ0FBQyxDQUFBO1FBQ3RGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMs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