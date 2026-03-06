"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const handle_royal_mail_status_update_1 = require("../../../../workflows/handle-royal-mail-status-update");
async function POST(req, res) {
    const logger = req.scope.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    logger.info("[Royal Mail Plugin] Received Webhook Payload");
    logger.info(JSON.stringify(req.validatedBody, null, 2));
    // Basic validation - check for secret if configured
    const secret = req.query.secret;
    if (process.env.ROYAL_MAIL_WEBHOOK_SECRET && secret !== process.env.ROYAL_MAIL_WEBHOOK_SECRET) {
        logger.warn("[Royal Mail Plugin] Unauthorized Webhook attempt.");
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const { result } = await (0, handle_royal_mail_status_update_1.handleRoyalMailStatusUpdateWorkflow)(req.scope).run({
            input: req.validatedBody
        });
        return res.status(200).json({
            message: "Webhook processed",
            success: !!result
        });
    }
    catch (error) {
        logger.error(`[Royal Mail Plugin] Error processing Webhook: ${error.message}`);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3JveWFsLW1haWwvd2ViaG9vay9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUtBLG9CQTZCQztBQWpDRCxxREFBcUU7QUFDckUsMkdBQTJHO0FBR3BHLEtBQUssVUFBVSxJQUFJLENBQ3RCLEdBQTBDLEVBQzFDLEdBQW1CO0lBRW5CLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRWxFLE1BQU0sQ0FBQyxJQUFJLENBQUMsOENBQThDLENBQUMsQ0FBQTtJQUMzRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV2RCxvREFBb0Q7SUFDcEQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFDL0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU0sS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDNUYsTUFBTSxDQUFDLElBQUksQ0FBQyxtREFBbUQsQ0FBQyxDQUFBO1FBQ2hFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSxxRUFBbUMsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3hFLEtBQUssRUFBRSxHQUFHLENBQUMsYUFBYTtTQUMzQixDQUFDLENBQUE7UUFFRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxtQkFBbUI7WUFDNUIsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNO1NBQ3BCLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsaURBQWlELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzlFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7QUFDTCxDQUFDIn0=