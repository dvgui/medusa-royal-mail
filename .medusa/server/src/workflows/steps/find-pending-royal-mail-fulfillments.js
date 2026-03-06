"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPendingRoyalMailFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
/**
 * Queries for fulfillments that have been submitted to Royal Mail
 * (fulfillment.data.rmOrderId is set by the provider) but not yet shipped.
 *
 * The provider stores the RM identifier in CreateFulfillmentResult.data:
 *   { data: { rmOrderId: response.orders[0].orderIdentifier } }
 * Medusa persists this on fulfillment.data — NOT fulfillment.metadata.
 */
exports.findPendingRoyalMailFulfillmentsStep = (0, workflows_sdk_1.createStep)("find-pending-royal-mail-fulfillments", async (_input, { container }) => {
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: fulfillments } = await query.graph({
        entity: "fulfillment",
        fields: ["id", "shipped_at", "data"],
        filters: {
            shipped_at: null,
        },
    });
    const pending = fulfillments
        .filter((f) => f.data &&
        typeof f.data === "object" &&
        typeof f.data.rmOrderId === "string")
        .map((f) => ({
        fulfillmentId: f.id,
        rmOrderIdentifier: f.data.rmOrderId,
    }));
    console.log(`[RoyalMail] Found ${pending.length} fulfillment(s) pending despatch confirmation`);
    return new workflows_sdk_1.StepResponse(pending);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wZW5kaW5nLXJveWFsLW1haWwtZnVsZmlsbG1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zdGVwcy9maW5kLXBlbmRpbmctcm95YWwtbWFpbC1mdWxmaWxsbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBQzVFLHFEQUFxRTtBQVFyRTs7Ozs7OztHQU9HO0FBQ1UsUUFBQSxvQ0FBb0MsR0FBRyxJQUFBLDBCQUFVLEVBQzFELHNDQUFzQyxFQUN0QyxLQUFLLEVBQ0QsTUFBNkIsRUFDN0IsRUFBRSxTQUFTLEVBQWtDLEVBQ08sRUFBRTtJQUN0RCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRWhFLE1BQU0sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQzdDLE1BQU0sRUFBRSxhQUFhO1FBQ3JCLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDO1FBQ3BDLE9BQU8sRUFBRTtZQUNMLFVBQVUsRUFBRSxJQUFJO1NBQ25CO0tBQ0osQ0FBQyxDQUFBO0lBRUYsTUFBTSxPQUFPLEdBQWtDLFlBQVk7U0FDdEQsTUFBTSxDQUNILENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDRixDQUFDLENBQUMsSUFBSTtRQUNOLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRO1FBQzFCLE9BQVEsQ0FBQyxDQUFDLElBQWdDLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FDeEU7U0FDQSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDVCxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUU7UUFDbkIsaUJBQWlCLEVBQUcsQ0FBQyxDQUFDLElBQStCLENBQUMsU0FBUztLQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVQLE9BQU8sQ0FBQyxHQUFHLENBQ1AscUJBQXFCLE9BQU8sQ0FBQyxNQUFNLCtDQUErQyxDQUNyRixDQUFBO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDcEMsQ0FBQyxDQUNKLENBQUEifQ==