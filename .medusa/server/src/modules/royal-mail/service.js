"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
const toPositive = (v) => {
    const n = Number(v);
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
    /**
     * Resolve dimensions straight from the variant id — the reliable source of
     * truth. Medusa doesn't always hydrate `order.items[].variant` (and thus
     * product_id) in the fulfillment payload, so the product-level fetch can be
     * unreachable; the variant id is always passed to getSmartWeight. Falls back
     * to the variant's product-level dims when the variant itself has none.
     */
    async fetchVariantDimensions(variantId) {
        if (!this.query_)
            return {};
        try {
            const { data } = await this.query_.graph({
                entity: "product_variant",
                fields: [
                    "id",
                    "weight",
                    "length",
                    "width",
                    "height",
                    "product.weight",
                    "product.length",
                    "product.width",
                    "product.height",
                ],
                filters: { id: variantId },
            });
            const v = data?.[0];
            if (!v)
                return {};
            return {
                weight: toPositive(v.weight) ?? toPositive(v.product?.weight),
                length: toPositive(v.length) ?? toPositive(v.product?.length),
                width: toPositive(v.width) ?? toPositive(v.product?.width),
                height: toPositive(v.height) ?? toPositive(v.product?.height),
            };
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            this.logger_.warn(`[Royal Mail] Failed to fetch variant ${variantId} dimensions: ${message}`);
            return {};
        }
    }
    async getFulfillmentOptions() {
        return [
            { id: "rm-signed-for-1st", name: "Royal Mail Signed For 1st Class" },
            { id: "rm-international-tracked-signed", name: "International Tracked and Signed" }
        ];
    }
    async validateFulfillmentData(optionData, data, _context) {
        return { ...optionData, ...data };
    }
    async validateOption(_data) {
        return true;
    }
    async canCalculate(_data) {
        return false;
    }
    async calculatePrice(_optionData, _data, _context) {
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
        // Primary fallback: look the dims up by variant id. The order payload is
        // often NOT hydrated with variant/product (so the hydrated reads above
        // and the product-level fetch below are unreachable), but the variant id
        // is always available — and that's where per-dosage weights live.
        let needsFetch = !weight || !length || !width || !height;
        if (needsFetch && variantId) {
            const fetched = await this.fetchVariantDimensions(variantId);
            weight = weight ?? fetched.weight;
            length = length ?? fetched.length;
            width = width ?? fetched.width;
            height = height ?? fetched.height;
        }
        // Secondary fallback: product-level dims (covers items with no variant).
        const productId = product?.id ?? variant?.product_id ?? orderItem?.product_id;
        needsFetch = !weight || !length || !width || !height;
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
            // Click & Drop rejects packages where the same SKU appears in more
            // than one contents row (error 77), which happens when an order has
            // multiple line items for the same variant (e.g. promo-priced
            // duplicates). Merge them, averaging unitValue to preserve the total.
            const mergedContents = [...resolvedContents
                    .reduce((acc, content) => {
                    const key = content.SKU;
                    if (!key) {
                        acc.set(Symbol(), content);
                        return acc;
                    }
                    const existing = acc.get(key);
                    if (!existing) {
                        acc.set(key, { ...content });
                        return acc;
                    }
                    const totalQty = existing.quantity + content.quantity;
                    existing.unitValue =
                        Math.round(((existing.unitValue * existing.quantity +
                            content.unitValue * content.quantity) /
                            totalQty) *
                            100) / 100;
                    existing.unitWeightInGrams = Math.max(existing.unitWeightInGrams, content.unitWeightInGrams);
                    existing.quantity = totalQty;
                    return acc;
                }, new Map())
                    .values()];
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
                        contents: mergedContents,
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
            // Surface the real reason to the admin. Medusa's default error
            // handler hides plain Error messages as "An unknown error occurred";
            // a MedusaError passes the message through (here as a 400) so the
            // admin sees the actual cause (weight/validation/API/config).
            if (e instanceof utils_1.MedusaError)
                throw e;
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, e instanceof Error ? e.message : String(e));
        }
    }
    async cancelFulfillment(fulfillment) {
        this.logger_.info(`[Royal Mail] Cancel fulfillment requested for ${fulfillment.id}`);
        return {};
    }
}
exports.RoyalMailProviderService = RoyalMailProviderService;
RoyalMailProviderService.identifier = "royal-mail-fulfillment";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFJa0M7QUFjbEMsK0RBQW9FO0FBb0RwRSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQVUsRUFBc0IsRUFBRTtJQUNsRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbkIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0FBQ3RELENBQUMsQ0FBQTtBQUVELE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBTTVFLFlBQVksSUFBMEIsRUFBRSxPQUFnQjtRQUNwRCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxQix3RUFBd0U7UUFDeEUsMkVBQTJFO1FBQzNFLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxNQUFNLEdBQUksSUFBZ0MsQ0FDM0MsaUNBQXlCLENBQUMsS0FBSyxDQUNDLENBQUE7UUFDeEMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVP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