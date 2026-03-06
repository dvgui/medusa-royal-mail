"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoyalMailStatusWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const check_royal_mail_order_status_1 = require("./steps/check-royal-mail-order-status");
exports.checkRoyalMailStatusWorkflow = (0, workflows_sdk_1.createWorkflow)("check-royal-mail-status", function (input) {
    const rmOrder = (0, check_royal_mail_order_status_1.checkRoyalMailOrderStatusStep)({
        rmOrderIdentifier: input.rmOrderIdentifier,
    });
    const result = (0, workflows_sdk_1.when)({ rmOrder }, (data) => {
        return !!data.rmOrder && data.rmOrder.status === "Despatched";
    }).then(() => {
        const shipmentData = (0, workflows_sdk_1.transform)({ input, rmOrder }, (data) => {
            const payload = {
                id: data.input.fulfillmentId,
                labels: [
                    {
                        tracking_number: data.rmOrder?.trackingNumber ?? "",
                        tracking_url: data.rmOrder?.trackingUrl ?? "",
                        label_url: "",
                    },
                ],
            };
            return payload;
        });
        return core_flows_1.createShipmentWorkflow.runAsStep({ input: shipmentData });
    });
    const exportedResult = (0, workflows_sdk_1.transform)({ result }, (data) => {
        const output = {
            success: !!data.result,
        };
        return output;
    });
    return new workflows_sdk_1.WorkflowResponse(exportedResult);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stcm95YWwtbWFpbC1zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL2NoZWNrLXJveWFsLW1haWwtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUswQztBQUMxQyw0REFBb0U7QUFDcEUseUZBQXFGO0FBb0J4RSxRQUFBLDRCQUE0QixHQUFHLElBQUEsOEJBQWMsRUFDdEQseUJBQXlCLEVBQ3pCLFVBQ0ksS0FBd0M7SUFFeEMsTUFBTSxPQUFPLEdBQUcsSUFBQSw2REFBNkIsRUFBQztRQUMxQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCO0tBQzdDLENBQUMsQ0FBQTtJQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsb0JBQUksRUFBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDdEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUE7SUFDakUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sWUFBWSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3hELE1BQU0sT0FBTyxHQUFnQztnQkFDekMsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYTtnQkFDNUIsTUFBTSxFQUFFO29CQUNKO3dCQUNJLGVBQWUsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsSUFBSSxFQUFFO3dCQUNuRCxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLElBQUksRUFBRTt3QkFDN0MsU0FBUyxFQUFFLEVBQUU7cUJBQ2hCO2lCQUNKO2FBQ0osQ0FBQTtZQUNELE9BQU8sT0FBTyxDQUFBO1FBQ2xCLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxtQ0FBc0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sY0FBYyxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbEQsTUFBTSxNQUFNLEdBQXVDO1lBQy9DLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU07U0FDekIsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxJQUFJLGdDQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQy9DLENBQUMsQ0FDSixDQUFBIn0=