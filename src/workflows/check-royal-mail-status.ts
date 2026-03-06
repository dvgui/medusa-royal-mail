import {
    createWorkflow,
    WorkflowResponse,
    transform,
    when,
} from "@medusajs/framework/workflows-sdk"
import { createShipmentWorkflow } from "@medusajs/medusa/core-flows"
import { checkRoyalMailOrderStatusStep } from "./steps/check-royal-mail-order-status"

interface CreateShipmentWorkflowInput {
    id: string
    labels: {
        tracking_number: string
        tracking_url: string
        label_url: string
    }[]
}

export interface CheckRoyalMailStatusWorkflowInput {
    fulfillmentId: string
    rmOrderIdentifier: string
}

export interface CheckRoyalMailStatusWorkflowOutput {
    success: boolean
}

export const checkRoyalMailStatusWorkflow = createWorkflow(
    "check-royal-mail-status",
    function (
        input: CheckRoyalMailStatusWorkflowInput
    ): WorkflowResponse<CheckRoyalMailStatusWorkflowOutput> {
        const rmOrder = checkRoyalMailOrderStatusStep({
            rmOrderIdentifier: input.rmOrderIdentifier,
        })

        const result = when({ rmOrder }, (data) => {
            return !!data.rmOrder && data.rmOrder.status === "Despatched"
        }).then(() => {
            const shipmentData = transform({ input, rmOrder }, (data) => {
                const payload: CreateShipmentWorkflowInput = {
                    id: data.input.fulfillmentId,
                    labels: [
                        {
                            tracking_number: data.rmOrder?.trackingNumber ?? "",
                            tracking_url: data.rmOrder?.trackingUrl ?? "",
                            label_url: "",
                        },
                    ],
                }
                return payload
            })

            return createShipmentWorkflow.runAsStep({ input: shipmentData })
        })

        const exportedResult = transform({ result }, (data) => {
            const output: CheckRoyalMailStatusWorkflowOutput = {
                success: !!data.result,
            }
            return output
        })

        return new WorkflowResponse(exportedResult)
    }
)