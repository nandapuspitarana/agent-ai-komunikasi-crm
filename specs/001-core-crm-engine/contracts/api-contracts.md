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
  "version": "1.1.0",          // server release: CRM_VERSION, fallback package.json
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
| Server | `CRM_VERSION` in `.env` (same variable as the docker image tag; read at request time). `package.json` `version` is only the fallback when it is unset or `latest` |
| API contract | `API_VERSION` in `src/lib/version.ts` (minor = additive, major = breaking) |
| Flutter SDK | nothing: the archive served by the CRM is stamped with `CRM_VERSION` at build time (see "SDK distribution"). `version:` in the SDK `pubspec.yaml` / `aiAgentSdkVersion` are only the fallback for git/path consumers and must equal each other |
| Drop old SDKs | raise `SDK_MIN_SUPPORTED_VERSION` |

`tests/api/version.test.ts` fails if the SDK pubspec and the Dart constant disagree; `sdk.latest` in `/api/version` is the version of the archive actually built into the running deployment.
Build metadata: `docker build --build-arg APP_COMMIT=$(git rev-parse --short HEAD) --build-arg APP_BUILT_AT=$(date -u +%FT%TZ) .` (docker-compose passes the same as env `APP_COMMIT` / `APP_BUILT_AT`).

### Verifying a deployment (UAT / production)

The server version is `CRM_VERSION` from the environment's `.env` — the same variable docker-compose uses for the image tag — so bumping it is what "releases" a version. Each build also records when it was built and (optionally) from which commit:

```bash
# on the build machine, for each environment (.env with the new CRM_VERSION)
APP_COMMIT=$(git rev-parse --short=12 HEAD) APP_BUILT_AT=$(date -u +%FT%TZ) docker compose build web
docker compose up -d web
```

- `builtAt` is always filled (recorded by `next build`, so it changes on every build); `commit` needs `APP_COMMIT` because `.git` is not inside the image.
- Runtime `APP_COMMIT` / `APP_BUILT_AT` override the baked-in values.

Check what is really running, in all environments at once (URLs are not stored in the repo):

```bash
npm run check:deploy -- --expect 1.2.0 uat=https://<uat-host> prod=https://<prod-host>
# or: DEPLOY_TARGETS="uat=https://...,prod=https://..." EXPECT_VERSION=1.2.0 npm run check:deploy
```

```
OK       uat        v1.2.0  api 1.1.0  commit 4775e3384662  built 2026-10-01T08:00:00.000Z
MISMATCH prod       v1.1.0  ...  (expected 1.2.0, running 1.1.0)
```

Statuses: `OK`, `MISMATCH` (older/newer version running), `NO_ENDPOINT` (server predates `/api/version`), `UNREACHABLE`, `INVALID`. Exit code is 0 only if every target is `OK`, so it can gate a pipeline. `--expect` defaults to `CRM_VERSION`, then `package.json`.


## 4. SDK distribution (pub repository on the CRM server)

The CRM server hands out the Flutter SDK itself, versioned exactly like the CRM: build with `CRM_VERSION=1.0.24` and the package is `flutter_ai_agent_sdk 1.0.24`. No GitHub access is needed to fetch it.

**How it works**
- `npm run build` runs `scripts/build-sdk-package.js` first (npm `prebuild`): it packs `packages/flutter_ai_agent_sdk` (`lib/`, `pubspec.yaml`, `README.md`), stamps `version:` and `aiAgentSdkVersion` with `CRM_VERSION`, and writes `sdk-dist/<name>-<version>.tar.gz` + `manifest.json`. The Dockerfile passes `CRM_VERSION` to the build stage and copies `sdk-dist/` into the image (`docker-compose` forwards `CRM_VERSION` as a build arg).
- The server implements the pub repository spec v2: `GET /api/pub/api/packages/flutter_ai_agent_sdk` (listing) and `GET /api/pub/packages/flutter_ai_agent_sdk/versions/<version>.tar.gz` (archive, sha256 in the listing).
- **Closed by default**: every request needs `Authorization: Bearer $SDK_REGISTRY_TOKEN`; while that variable is unset the registry answers `503`. Behind a proxy the archive URL uses `X-Forwarded-Proto/Host`, or `PUBLIC_BASE_URL` if set.
- `GET /api/version` advertises it as `sdk.registry` and reports `sdk.latest` = the version of the archive actually built into this deployment.

**Consuming it (`pubspec.yaml` of the app)**
```yaml
dependencies:
  flutter_ai_agent_sdk:
    hosted:
      name: flutter_ai_agent_sdk
      url: https://<crm-host>/api/pub
    version: ^1.0.24
```
```bash
# once per machine (prompts for the token) ...
dart pub token add https://<crm-host>/api/pub
# ... or in CI, from a secret exposed as an environment variable:
dart pub token add https://<crm-host>/api/pub --env-var SDK_REGISTRY_TOKEN
flutter pub get
```

**Limits to know**
- Only the version built into the *currently running* deployment is listed. After the CRM is redeployed with a newer `CRM_VERSION`, the previous SDK version is gone from that server, so consumers must use a caret range (`^1.0.24`) and re-resolve rather than pin an exact old version.
- pub only sends tokens over HTTPS (or `localhost`).
