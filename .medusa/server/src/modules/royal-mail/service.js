"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
class RoyalMailProviderService extends utils_1.AbstractFulfillmentProviderService {
    constructor({ logger, query }, options) {
        super();
        this.logger_ = logger;
        this.query_ = query;
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
    async getSmartWeight(variantId, currentWeight) {
        if (currentWeight && currentWeight > 0) {
            return currentWeight;
        }
        try {
            const { data: [variant] } = await this.query_.graph({
                entity: "product_variant",
                fields: ["weight", "product.weight"],
                filters: { id: variantId },
            });
            const weight = variant?.weight || variant?.product?.weight;
            return weight && weight > 0 ? Number(weight) : 1;
        }
        catch (e) {
            return 1;
        }
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
                            const weight = await this.getSmartWeight(variantId, Number(raw.weight));
                            return acc + (weight * (item.quantity || 1));
                        }, Promise.resolve(0))),
                        packageFormatIdentifier: data?.package_format_identifier || "parcel",
                        contents: await Promise.all(items.map(async (item) => {
                            const raw = item;
                            const variantId = raw.variant_id || raw.line_item?.variant_id;
                            const weight = await this.getSmartWeight(variantId, Number(raw.weight));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3JveWFsLW1haWwvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBOEU7QUFhOUUsK0RBQW9FO0FBWXBFLE1BQWEsd0JBQXlCLFNBQVEsMENBQWtDO0lBTTVFLFlBQVksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUF3QixFQUFFLE9BQWdCO1FBQ2pFLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFFbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywrREFBK0QsQ0FBQyxDQUFBO1FBQ3RGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FDN0I7WUFDSSxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07U0FDekIsRUFDRCxJQUFJLENBQUMsT0FBTyxDQUNmLENBQUE7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUN2Qiw2REFBNkQ7UUFDN0QsZ0VBQWdFO1FBQ2hFLG1GQUFtRjtRQUNuRixPQUFPO1lBQ0gsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNwRCxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDdEQsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRTtTQUN6RCxDQUFBO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FDekIsVUFBbUMsRUFDbkMsSUFBNkIsRUFDN0IsT0FBZ0M7UUFFaEMsa0ZBQWtGO1FBQ2xGLE9BQU87WUFDSCxHQUFHLFVBQVU7WUFDYixHQUFHLElBQUk7U0FDVixDQUFBO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBNkI7UUFDOUMscURBQXFEO1FBQ3JELE9BQU8sSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBNkI7UUFDNUMsb0VBQW9FO1FBQ3BFLE9BQU8sS0FBSyxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUNoQixVQUF5RCxFQUN6RCxJQUE2QyxFQUM3QyxPQUFtRDtRQUVuRCxnRUFBZ0U7UUFDaEUsT0FBTztZQUNILGlCQUFpQixFQUFFLEdBQUcsRUFBRSxRQUFRO1lBQ2hDLGlDQUFpQyxFQUFFLElBQUk7U0FDMUMsQ0FBQTtJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQWlCLEVBQUUsYUFBc0I7UUFDbEUsSUFBSSxhQUFhLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sYUFBYSxDQUFBO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNoRCxNQUFNLEVBQUUsaUJBQWlCO2dCQUN6QixNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7YUFDN0IsQ0FBQyxDQUFBO1lBRUYsTUFBTSxNQUFNLEdBQUksT0FBZSxFQUFFLE1BQU0sSUFBSyxPQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQTtZQUM1RSxPQUFPLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNULE9BQU8sQ0FBQyxDQUFBO1FBQ1osQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQ25CLElBQTZCLEVBQzdCLEtBQXlELEVBQ3pELEtBQStDLEVBQy9DLFdBQTRFO1FBRTVFLElBQUksQ0FBQztZQUNELG9EQUFvRDtZQUNwRCxNQUFNLE9BQU8sR0FBbUI7Z0JBQzVCLGNBQWMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssRUFBRSxFQUFFO2dCQUMxRCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2xFLFFBQVEsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsY0FBYyxJQUFJLENBQUMsQ0FBQztnQkFDdkQsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQztnQkFDaEMsU0FBUyxFQUFFO29CQUNQLE9BQU8sRUFBRTt3QkFDTCxRQUFRLEVBQUUsR0FBRyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxJQUFJLEVBQUUsSUFBSSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRTt3QkFDM0csWUFBWSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLElBQUksRUFBRTt3QkFDdEQsWUFBWSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLElBQUksU0FBUzt3QkFDN0QsSUFBSSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLElBQUksRUFBRTt3QkFDekMsUUFBUSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLElBQUksRUFBRTt3QkFDcEQsV0FBVyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTtxQkFDMUU7b0JBQ0QsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFLLElBQUksU0FBUztvQkFDdkMsV0FBVyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLElBQUksU0FBUztpQkFDM0Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNOO3dCQUNJLGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRTs0QkFDckUsTUFBTSxHQUFHLEdBQUcsTUFBTSxVQUFVLENBQUE7NEJBQzVCLE1BQU0sR0FBRyxHQUFHLElBQVcsQ0FBQTs0QkFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQTs0QkFDN0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7NEJBQ3ZFLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNoRCxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN2Qix1QkFBdUIsRUFBRyxJQUFJLEVBQUUseUJBQW9DLElBQUksUUFBUTt3QkFDaEYsUUFBUSxFQUFFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTs0QkFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBVyxDQUFBOzRCQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFBOzRCQUM3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs0QkFDdkUsT0FBTztnQ0FDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssSUFBSSxNQUFNO2dDQUMxQixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxTQUFTO2dDQUMxQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDO2dDQUM1QixTQUFTLEVBQUUsTUFBTSxDQUFFLEdBQUcsQ0FBQyxVQUFrQixJQUFJLENBQUMsQ0FBQztnQ0FDL0MsaUJBQWlCLEVBQUUsTUFBTTs2QkFDNUIsQ0FBQTt3QkFDTCxDQUFDLENBQUMsQ0FBQztxQkFDTjtpQkFDSjthQUNKLENBQUE7WUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUE7WUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUE7WUFDekQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO1lBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO1lBRXhELElBQUksUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRSxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsT0FBTztnQkFDSCxJQUFJLEVBQUU7b0JBQ0YsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlO2lCQUNuRDtnQkFDRCxNQUFNLEVBQUUsRUFBRTthQUNiLENBQUE7UUFDTCxDQUFDO1FBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtZQUM1RCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN4QixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDN0UsTUFBTSxDQUFDLENBQUE7UUFDWCxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxXQUE0RTtRQUNoRyxxRkFBcUY7UUFDckYsbUZBQW1GO1FBQ25GLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNwRixPQUFPLEVBQUUsQ0FBQTtJQUNiLENBQUM7O0FBL0tMLDREQWdMQztBQS9LVSxtQ0FBVSxHQUFHLHdCQUF3QixDQUFBIn0=