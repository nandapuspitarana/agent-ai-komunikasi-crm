# Widget & API Contracts

## 1. Embeddable Widget SDK

Host websites will load the CRM widget using the following snippet:

```html
<script src="https://cdn.yourcrm.com/widget.js" defer></script>
<script>
  window.addEventListener('load', () => {
    window.CRMSDK.init({
      tenantId: "TENANT_UUID_HERE",
      primaryColor: "#0f172a", // Optional branding
      position: "bottom-right" // Optional positioning
    });
  });
</script>
```

## 2. Webhook Payload Contract (Meta API)

The backend `/api/webhooks/whatsapp` must accept payloads in the standard Meta Cloud API format and immediately dispatch them to BullMQ for processing:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messages": [{
          "from": "PHONE_NUMBER",
          "id": "wamid.ID",
          "text": { "body": "Hello!" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```
