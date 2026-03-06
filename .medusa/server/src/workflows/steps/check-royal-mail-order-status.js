"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoyalMailOrderStatusStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const client_1 = require("../../lib/royal-mail-client/client");
/**
 * Calls client.getOrder() for a single Click & Drop order identifier.
 * Returns null on any error so a single bad order doesn't abort the whole poll.
 */
exports.checkRoyalMailOrderStatusStep = (0, workflows_sdk_1.createStep)("check-royal-mail-order-status", async (input, { container }) => {
    const logger = container.resolve("logger");
    const apiKey = process.env.ROYAL_MAIL_API_KEY;
    if (!apiKey) {
        throw new Error("ROYAL_MAIL_API_KEY environment variable is not set");
    }
    const client = new client_1.RoyalMailClient({ apiKey }, logger);
    try {
        const order = await client.getOrder(input.rmOrderIdentifier);
        return new workflows_sdk_1.StepResponse(order);
    }
    catch (error) {
        logger.warn(`[RoyalMail] Could not fetch status for order ${input.rmOrderIdentifier}: ${error.message}`);
        return new workflows_sdk_1.StepResponse(null);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stcm95YWwtbWFpbC1vcmRlci1zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3N0ZXBzL2NoZWNrLXJveWFsLW1haWwtb3JkZXItc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUE0RTtBQUU1RSwrREFBb0U7QUFPcEU7OztHQUdHO0FBQ1UsUUFBQSw2QkFBNkIsR0FBRyxJQUFBLDBCQUFVLEVBQ25ELCtCQUErQixFQUMvQixLQUFLLEVBQ0QsS0FBeUMsRUFDekMsRUFBRSxTQUFTLEVBQWtDLEVBQ00sRUFBRTtJQUNyRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUE7SUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUV0RCxJQUFJLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDNUQsT0FBTyxJQUFJLDRCQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FDUCxnREFBZ0QsS0FBSyxDQUFDLGlCQUFpQixLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FDOUYsQ0FBQTtRQUNELE9BQU8sSUFBSSw0QkFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7QUFDTCxDQUFDLENBQ0osQ0FBQSJ9