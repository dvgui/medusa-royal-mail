"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRoyalMailStatusUpdateWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const find_fulfillment_by_rm_reference_1 = require("./steps/find-fulfillment-by-rm-reference");
exports.handleRoyalMailStatusUpdateWorkflow = (0, workflows_sdk_1.createWorkflow)("handle-royal-mail-status-update", function (input) {
    const fulfillmentId = (0, find_fulfillment_by_rm_reference_1.findFulfillmentByRmReferenceStep)({
        orderReference: input.orderReference,
        rmOrderId: input.orderIdentifier?.toString(),
    });
    // Use 'when' for conditional execution as per Medusa best practices
    const result = (0, workflows_sdk_1.when)({ fulfillmentId, input }, (data) => {
        return !!data.fulfillmentId && data.input.orderStatus === "Despatched";
    }).then(() => {
        const shipmentData = (0, workflows_sdk_1.transform)({ fulfillmentId, input }, (data) => {
            const payload = {
                id: data.fulfillmentId,
                labels: [
                    {
                        tracking_number: data.input.trackingNumber || "",
                        tracking_url: data.input.trackingUrl || "",
                        label_url: "", // Required by DTO
                    },
                ],
            };
            return payload;
        });
        return core_flows_1.createShipmentWorkflow.runAsStep({
            input: shipmentData,
        });
    });
    const exportedResult = (0, workflows_sdk_1.transform)({ result }, (data) => {
        return data.result ? { success: true } : { success: false };
    });
    return new workflows_sdk_1.WorkflowResponse(exportedResult);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlLXJveWFsLW1haWwtc3RhdHVzLXVwZGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3MvaGFuZGxlLXJveWFsLW1haWwtc3RhdHVzLXVwZGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFLMEM7QUFDMUMsNERBQW9FO0FBQ3BFLCtGQUEyRjtBQXFCOUUsUUFBQSxtQ0FBbUMsR0FBRyxJQUFBLDhCQUFjLEVBQzdELGlDQUFpQyxFQUNqQyxVQUFVLEtBQStDO0lBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUEsbUVBQWdDLEVBQUM7UUFDbkQsY0FBYyxFQUFFLEtBQUssQ0FBQyxjQUFjO1FBQ3BDLFNBQVMsRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRTtLQUMvQyxDQUFDLENBQUE7SUFFRixvRUFBb0U7SUFDcEUsTUFBTSxNQUFNLEdBQUcsSUFBQSxvQkFBSSxFQUFDLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbkQsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxZQUFZLENBQUE7SUFDMUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sWUFBWSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzlELE1BQU0sT0FBTyxHQUFnQztnQkFDekMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFjO2dCQUN2QixNQUFNLEVBQUU7b0JBQ0o7d0JBQ0ksZUFBZSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxJQUFJLEVBQUU7d0JBQ2hELFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxFQUFFO3dCQUMxQyxTQUFTLEVBQUUsRUFBRSxFQUFFLGtCQUFrQjtxQkFDcEM7aUJBQ0o7YUFDSixDQUFBO1lBQ0QsT0FBTyxPQUFPLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLG1DQUFzQixDQUFDLFNBQVMsQ0FBQztZQUNwQyxLQUFLLEVBQUUsWUFBWTtTQUN0QixDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sY0FBYyxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbEQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDL0QsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksZ0NBQWdCLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDL0MsQ0FBQyxDQUNKLENBQUEifQ==