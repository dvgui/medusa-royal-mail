# Medusa Royal Mail Click & Drop Plugin (v2)

This plugin integrates Royal Mail Click & Drop fulfillment services into your MedusaV2 commerce server.

## Installation

Install the plugin via your preferred package manager directly from the repository:

```bash
yarn add royal-mail-plugin@git+https://user:token@github.com/Baam25/medusa-royalmail-plugin.git#main
```

## Configuration

Add the module to your `medusa-config.ts` providers array inside the fulfillment module configuration:

```typescript
{
  resolve: "@medusajs/medusa/fulfillment",
  options: {
    providers: [
      {
        resolve: "royal-mail-plugin/modules/royal-mail",
        id: "royal-mail-fulfillment",
        options: {
          apiKey: process.env.ROYAL_MAIL_API_KEY || "dummy",
        },
      },
    ],
  },
}
```

## IMPORTANT: Database Sync (Required for Fulfillment Providers)

Unlike Payment Providers which evaluate dynamically, **Medusa v2 Fulfillment Providers must be hardcoded into your PostgreSQL database** before they will appear in the Admin Dashboard UI.

After installing and adding the code to `medusa-config.ts`, you **must** sync your database links:

```bash
npx medusa db:sync-links
```

*(Note: If you are deploying to a cloud host like Koyeb or Vercel, this happens automatically as long as your start script includes `medusa db:migrate`)*

## Admin Dashboard Setup

1. Boot your backend (`npm run dev`).
2. Log into the Medusa Admin.
3. Navigate to **Settings > Locations & Shipping**.
4. Click on your Stock Location and select **Create Shipping Option**.
5. Select the Provider: **`royal-mail-fulfillment_royal-mail-fulfillment`**
6. Save and test checkout!
