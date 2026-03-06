import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderDTO, FulfillmentDTO } from "@medusajs/framework/types"
import { RoyalMailClient } from "../../lib/royal-mail-client/client"

interface StepInput {
    orderReference: string
    rmOrderId?: string
}

export const findFulfillmentByRmReferenceStep = createStep(
    "find-fulfillment-by-rm-reference",
    async (input: StepInput, { container }) => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

        // 1. Robustness: Verify the status with Royal Mail API (The "Fena" pattern)
        if (input.rmOrderId) {
            const apiKey = process.env.ROYAL_MAIL_API_KEY
            if (apiKey) {
                try {
                    const client = new RoyalMailClient({ apiKey }, logger)
                    const rmOrder = await client.getOrder(input.rmOrderId)

                    if (rmOrder.status !== "Despatched") {
                        logger.warn(`[Royal Mail Webhook] RM Order ${input.rmOrderId} is not Despatched (Status: ${rmOrder.status}). Skipping update.`)
                        return new StepResponse(null)
                    }
                    logger.info(`[Royal Mail Webhook] Verified RM Order ${input.rmOrderId} status: Despatched`)
                } catch (error: any) {
                    logger.error(`[Royal Mail Webhook] Failed to verify RM Order status: ${error.message}`)
                    return new StepResponse(null)
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
        }) as { data: (OrderDTO & { fulfillments: FulfillmentDTO[] })[] }

        if (!orders?.length) {
            logger.warn(`[Royal Mail Webhook] Order not found for reference: ${input.orderReference}`)
            return new StepResponse(null)
        }

        const order = orders[0]

        // 3. Find the fulfillment that belongs to this RM order
        let fulfillment = order.fulfillments?.find((f) => {
            const data = f.data as Record<string, any> | null
            return data?.rmOrderId === input.rmOrderId
        })

        // Fallback: If rmOrderId is not provided or not found, pick the first non-shipped fulfillment
        if (!fulfillment && order.fulfillments?.length) {
            fulfillment = order.fulfillments.find((f) => !f.shipped_at)
        }

        if (!fulfillment) {
            logger.warn(`[Royal Mail Webhook] Fulfillment not found for order: ${order.id}`)
            return new StepResponse(null)
        }

        return new StepResponse(fulfillment.id)
    }
)
