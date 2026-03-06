import {
    createWorkflow,
    WorkflowResponse,
    transform,
    when,
} from "@medusajs/framework/workflows-sdk"
import { createShipmentWorkflow } from "@medusajs/medusa/core-flows"
import { findFulfillmentByRmReferenceStep } from "./steps/find-fulfillment-by-rm-reference"

// Defining the input type for createShipmentWorkflow locally to ensure 
// cross-version compatibility and resolve import issues.
interface CreateShipmentWorkflowInput {
    id: string
    labels: {
        tracking_number: string
        tracking_url: string
        label_url: string
    }[]
}

export interface HandleRoyalMailStatusUpdateWorkflowInput {
    orderReference: string
    orderIdentifier?: number
    orderStatus: string
    trackingNumber?: string
    trackingUrl?: string
}

export const handleRoyalMailStatusUpdateWorkflow = createWorkflow(
    "handle-royal-mail-status-update",
    function (input: HandleRoyalMailStatusUpdateWorkflowInput) {
        const fulfillmentId = findFulfillmentByRmReferenceStep({
            orderReference: input.orderReference,
            rmOrderId: input.orderIdentifier?.toString(),
        })

        // Use 'when' for conditional execution as per Medusa best practices
        const result = when({ fulfillmentId, input }, (data) => {
            return !!data.fulfillmentId && data.input.orderStatus === "Despatched"
        }).then(() => {
            const shipmentData = transform({ fulfillmentId, input }, (data) => {
                const payload: CreateShipmentWorkflowInput = {
                    id: data.fulfillmentId!,
                    labels: [
                        {
                            tracking_number: data.input.trackingNumber || "",
                            tracking_url: data.input.trackingUrl || "",
                            label_url: "", // Required by DTO
                        },
                    ],
                }
                return payload
            })

            return createShipmentWorkflow.runAsStep({
                input: shipmentData,
            })
        })

        const exportedResult = transform({ result }, (data) => {
            return data.result ? { success: true } : { success: false }
        })

        return new WorkflowResponse(exportedResult)
    }
)
