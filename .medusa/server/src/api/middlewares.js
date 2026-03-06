"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("@medusajs/framework/http");
const http_2 = require("@medusajs/framework/http");
const validators_1 = require("./store/royal-mail/webhook/validators");
exports.default = (0, http_1.defineMiddlewares)({
    routes: [
        {
            matcher: "/store/royal-mail/webhook",
            method: "POST",
            middlewares: [
                (0, http_2.validateAndTransformBody)(validators_1.RoyalMailWebhookSchema),
            ],
        },
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYXBpL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQTREO0FBQzVELG1EQUFtRTtBQUNuRSxzRUFBOEU7QUFFOUUsa0JBQWUsSUFBQSx3QkFBaUIsRUFBQztJQUM3QixNQUFNLEVBQUU7UUFDSjtZQUNJLE9BQU8sRUFBRSwyQkFBMkI7WUFDcEMsTUFBTSxFQUFFLE1BQU07WUFDZCxXQUFXLEVBQUU7Z0JBQ1QsSUFBQSwrQkFBd0IsRUFBQyxtQ0FBc0IsQ0FBQzthQUNuRDtTQUNKO0tBQ0o7Q0FDSixDQUFDLENBQUEifQ==