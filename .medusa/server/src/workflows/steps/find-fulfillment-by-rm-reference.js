"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFulfillmentByRmReferenceStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/royal-mail-client/client");
exports.findFulfillmentByRmReferenceStep = (0, workflows_sdk_1.createStep)("find-fulfillment-by-rm-reference", async (input, { container }) => {
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    // 1. Robustness: Verify the status with Royal Mail API (The "Fena" pattern)
    if (input.rmOrderId) {
        const apiKey = process.env.ROYAL_MAIL_API_KEY;
        if (apiKey) {
            try {
                const client = new client_1.RoyalMailClient({ apiKey }, logger);
                const rmOrder = await client.getOrder(input.rmOrderId);
                if (rmOrder.status !== "Despatched") {
                    logger.warn(`[Royal Mail Webhook] RM Order ${input.rmOrderId} is not Despatched (Status: ${rmOrder.status}). Skipping update.`);
                    return new workflows_sdk_1.StepResponse(null);
                }
                logger.info(`[Royal Mail Webhook] Verified RM Order ${input.rmOrderId} status: Despatched`);
            }
            catch (error) {
                logger.error(`[Royal Mail Webhook] Failed to verify RM Order status: ${error.message}`);
                return new workflows_sdk_1.StepResponse(null);
            }
        }
    }
    // 2. Try to find the order by display_id (orderReference)
    const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "display_id", "fulfillments.*"],
        filters: {
            display_id: [`${input.orderReference}`],
        },
    });
    if (!orders?.length) {
        logger.warn(`[Royal Mail Webhook] Order not found for reference: ${input.orderReference}`);
        return new workflows_sdk_1.StepResponse(null);
    }
    const order = orders[0];
    // 3. Find the fulfillment that belongs to this RM order
    let fulfillment = order.fulfillments?.find((f) => {
        const data = f.data;
        return data?.rmOrderId === input.rmOrderId;
    });
    // Fallback: If rmOrderId is not provided or not found, pick the first non-shipped fulfillment
    if (!fulfillment && order.fulfillments?.length) {
        fulfillment = order.fulfillments.find((f) => !f.shipped_at);
    }
    if (!fulfillment) {
        logger.warn(`[Royal Mail Webhook] Fulfillment not found for order: ${order.id}`);
        return new workflows_sdk_1.StepResponse(null);
    }
    return new workflows_sdk_1.StepResponse(fulfillment.id);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1mdWxmaWxsbWVudC1ieS1ybS1yZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3N0ZXBzL2ZpbmQtZnVsZmlsbG1lbnQtYnktcm0tcmVmZXJlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUE0RTtBQUM1RSxxREFBcUU7QUFFckUsK0RBQW9FO0FBT3ZELFFBQUEsZ0NBQWdDLEdBQUcsSUFBQSwwQkFBVSxFQUN0RCxrQ0FBa0MsRUFDbEMsS0FBSyxFQUFFLEtBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFO0lBQ3RDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUVsRSw0RUFBNEU7SUFDNUUsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtRQUM3QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDO2dCQUNELE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUV0RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEtBQUssQ0FBQyxTQUFTLCtCQUErQixPQUFPLENBQUMsTUFBTSxxQkFBcUIsQ0FBQyxDQUFBO29CQUMvSCxPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakMsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxLQUFLLENBQUMsU0FBUyxxQkFBcUIsQ0FBQyxDQUFBO1lBQy9GLENBQUM7WUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLDBEQUEwRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDdkYsT0FBTyxJQUFJLDRCQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakMsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0lBRUQsMERBQTBEO0lBQzFELE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3ZDLE1BQU0sRUFBRSxPQUFPO1FBQ2YsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQztRQUM5QyxPQUFPLEVBQUU7WUFDTCxVQUFVLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUMxQztLQUNKLENBQWdFLENBQUE7SUFFakUsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUMxRixPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRXZCLHdEQUF3RDtJQUN4RCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQzdDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFrQyxDQUFBO1FBQ2pELE9BQU8sSUFBSSxFQUFFLFNBQVMsS0FBSyxLQUFLLENBQUMsU0FBUyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsOEZBQThGO0lBQzlGLElBQUksQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUM3QyxXQUFXLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNoRixPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQzNDLENBQUMsQ0FDSixDQUFBIn0=