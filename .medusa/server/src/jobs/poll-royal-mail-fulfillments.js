"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = pollRoyalMailFulfillments;
const poll_royal_mail_fulfillments_1 = require("../workflows/poll-royal-mail-fulfillments");
/**
 * Scheduled job — polls Royal Mail Click & Drop for despatch updates.
 *
 * Royal Mail does not support outbound webhooks, so polling is the only
 * supported integration pattern.
 */
async function pollRoyalMailFulfillments(container) {
    const logger = container.resolve("logger");
    logger.info("[RoyalMail] Starting fulfillment status poll…");
    try {
        const { result } = await (0, poll_royal_mail_fulfillments_1.pollRoyalMailFulfillmentsWorkflow)(container).run({
            input: {},
        });
        logger.info(`[RoyalMail] Poll complete — processed: ${result.processed}, shipped: ${result.shipped}`);
    }
    catch (error) {
        // Don't rethrow — a failed poll should not crash the Medusa worker.
        logger.error(`[RoyalMail] Polling workflow failed: ${error.message}`);
    }
}
exports.config = {
    name: "poll-royal-mail-fulfillments",
    schedule: {
        /**
         * Interval in milliseconds — 5 minutes.
         */
        interval: 1 * 60 * 1000,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbC1yb3lhbC1tYWlsLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9qb2JzL3BvbGwtcm95YWwtbWFpbC1mdWxmaWxsbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBU0EsNENBa0JDO0FBMUJELDRGQUE2RjtBQUU3Rjs7Ozs7R0FLRztBQUNZLEtBQUssVUFBVSx5QkFBeUIsQ0FDbkQsU0FBMEI7SUFFMUIsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxNQUFNLENBQUMsSUFBSSxDQUFDLCtDQUErQyxDQUFDLENBQUE7SUFFNUQsSUFBSSxDQUFDO1FBQ0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSxnRUFBaUMsRUFBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDdEUsS0FBSyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsSUFBSSxDQUNQLDBDQUEwQyxNQUFNLENBQUMsU0FBUyxjQUFjLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FDM0YsQ0FBQTtJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ2xCLG9FQUFvRTtRQUNwRSxNQUFNLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0FBQ0wsQ0FBQztBQUVZLFFBQUEsTUFBTSxHQUFHO0lBQ2xCLElBQUksRUFBRSw4QkFBOEI7SUFDcEMsUUFBUSxFQUFFO1FBQ047O1dBRUc7UUFDSCxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJO0tBQzFCO0NBQ0osQ0FBQSJ9