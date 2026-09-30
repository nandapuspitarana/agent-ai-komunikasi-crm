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

## 3. Versioning & SDK version check

Public, unauthenticated, no tenant data.

### `GET /api/version[?sdk=<client SDK version>]`

```json
{
  "name": "agent-komunikasi",
  "version": "1.1.0",          // server release (package.json)
  "apiVersion": "1.1.0",       // widget / mobile API contract
  "commit": "abcdef123456",    // null unless the image was built with APP_COMMIT
  "builtAt": "2026-09-30T10:00:00Z",
  "sdk": {
    "latest": "1.1.0",         // newest Flutter SDK release
    "minSupported": "1.0.0",   // older than this = update required
    "client": "1.0.5",         // what the caller reported (null if none)
    "status": "outdated",      // current | outdated | unsupported | unknown
    "updateAvailable": true
  }
}
```

Also returned as headers `X-App-Version` / `X-API-Version`. The same block is included as `version` in the response of `POST /api/widget/init` (the SDK sends `sdkVersion` in that request body).

### Flutter SDK

```dart
final info = await controller.checkVersion();      // ServerVersionInfo? (never throws)
controller.versionInfo;                            // also filled by initialize()
controller.sdkStatus;                              // SdkStatus.current | updateAvailable | unsupported | unknown
aiAgentSdkVersion;                                 // '1.1.0' — the SDK's own version
```

`unsupported` means the app should ask the user to update; `updateAvailable` is informational.

### Releasing

| What | Where to bump |
|---|---|
| Server | `version` in `package.json` (and lockfile root) |
| API contract | `API_VERSION` in `src/lib/version.ts` (minor = additive, major = breaking) |
| Flutter SDK | `version:` in the SDK `pubspec.yaml`, `aiAgentSdkVersion` in `lib/src/version.dart`, `SDK_LATEST_VERSION` in `src/lib/version.ts` |
| Drop old SDKs | raise `SDK_MIN_SUPPORTED_VERSION` |

`tests/api/version.test.ts` fails if the SDK pubspec, the Dart constant and `SDK_LATEST_VERSION` disagree.
Build metadata: `docker build --build-arg APP_COMMIT=$(git rev-parse --short HEAD) --build-arg APP_BUILT_AT=$(date -u +%FT%TZ) .` (docker-compose passes the same as env `APP_COMMIT` / `APP_BUILT_AT`).
