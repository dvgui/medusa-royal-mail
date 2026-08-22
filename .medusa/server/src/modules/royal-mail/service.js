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
            const fulfillmentMetadata = fulfillment.metadata ?? {};
            const resendClaimId = typeof fulfillmentMetadata.resend_claim_id === "string"
                ? fulfillmentMetadata.resend_claim_id
                : undefined;
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
                const originalLineItemId = typeof orderItem?.metadata?.resend_original_line_item_id ===
                    "string"
                    ? orderItem.metadata.resend_original_line_item_id
                    : undefined;
                const valueSource = originalLineItemId
                    ? orderItems.find((i) => i.id === originalLineItemId) ??
                        orderItem
                    : orderItem;
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
                    unitValue: Number(resendClaimId
                        ? valueSource?.unit_price ?? 0
                        : item.unit_price ?? orderItem?.unit_price ?? 0),
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
            const declaredSubtotal = mergedContents.reduce((sum, item) => sum + item.unitValue * item.quantity, 0);
            const rmOrder = {
                orderReference: resendClaimId
                    ? `${order?.display_id?.toString() || order?.id}-R-${resendClaimId.slice(-8)}`
                    : order?.display_id?.toString() || order?.id,
                orderDate: new Date(order?.created_at || Date.now()).toISOString(),
                subtotal: resendClaimId
                    ? declaredSubtotal
                    : Number(order?.item_total || 0),
                shippingCostCharged: resendClaimId
                    ? 0
                    : Number(order?.shipping_total || 0),
                total: resendClaimId
                    ? declaredSubtotal
                    : Number(order?.total || 0),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFJa0M7QUFjbEMsK0RBQW9FO0FBcURwRSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQVUsRUFBc0IsRUFBRTtJQUNsRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbkIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0FBQ3RELENBQUMsQ0FBQTtBQUVELE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBTTVFLFlBQVksSUFBMEIsRUFBRSxPQUFnQjtRQUNwRCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxQix3RUFBd0U7UUFDeEUsMkVBQTJFO1FBQzNFLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxNQUFNLEdBQUksSUFBZ0MsQ0FDM0MsaUNBQXlCLENBQUMsS0FBSyxDQUNDLENBQUE7UUFDeEMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVP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