import { defineMiddlewares } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { RoyalMailWebhookSchema } from "./store/royal-mail/webhook/validators"

export default defineMiddlewares({
    routes: [
        {
            matcher: "/store/royal-mail/webhook",
            method: "POST",
            middlewares: [
                validateAndTransformBody(RoyalMailWebhookSchema),
            ],
        },
    ],
})
