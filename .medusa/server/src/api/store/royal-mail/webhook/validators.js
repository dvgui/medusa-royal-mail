"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoyalMailWebhookSchema = void 0;
const zod_1 = require("zod");
exports.RoyalMailWebhookSchema = zod_1.z.object({
    orderReference: zod_1.z.string(),
    orderIdentifier: zod_1.z.number().optional(),
    orderStatus: zod_1.z.string(),
    trackingNumber: zod_1.z.string().optional(),
    trackingUrl: zod_1.z.string().optional(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvc3RvcmUvcm95YWwtbWFpbC93ZWJob29rL3ZhbGlkYXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQXVCO0FBRVYsUUFBQSxzQkFBc0IsR0FBRyxPQUFDLENBQUMsTUFBTSxDQUFDO0lBQzNDLGNBQWMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFO0lBQzFCLGVBQWUsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3RDLFdBQVcsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFO0lBQ3ZCLGNBQWMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3JDLFdBQVcsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ3JDLENBQUMsQ0FBQSJ9