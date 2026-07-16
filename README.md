# Recypic Backend API

Express backend for the Recypic AI waste segmentation app. All AI vision calls
(OpenAI GPT-4.1, Google Gemini 2.5 Flash), prompt templates, image compression,
response parsing, and usage/cost accounting live here — the React frontend is
purely a UI that posts `multipart/form-data` and renders the response.

- **Runtime**: Node.js ≥ 18.17 (ESM / `"type": "module"`)
- **Framework**: Express 4.21
- **Image processing**: sharp (server-side compression with EXIF rotate)
- **AI SDKs**: `openai` v6, `@google/generative-ai` v0.24
- **Uploads**: multer with `memoryStorage`

---

## Quick start

```bash
cd server
npm install
cp .env.example .env        # then fill in OPENAI_API_KEY and GEMINI_API_KEY
npm start                   # node src/index.js
# or, for auto-restart on file changes:
npm run dev                 # node --watch src/index.js
```

From the repository root you can also use the convenience scripts:

```bash
npm run server:install
npm run server
```

The server listens on `http://localhost:3001` by default. A liveness probe is
available at `GET /healthz`.

---

## Environment variables

All variables are loaded from `server/.env` via `dotenv`. `OPENAI_API_KEY` and
`GEMINI_API_KEY` are required — the process exits on startup if either is
missing (see [src/config.js](src/config.js)).

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `3001` | HTTP port the Express server binds to. |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Allowed origin for browser requests. |
| `MAX_UPLOAD_BYTES` | no | `15728640` (15 MiB) | Per-file upload size limit enforced by multer. |
| `OPENAI_API_KEY` | **yes** | — | OpenAI API key. |
| `OPENAI_MODEL` | no | `gpt-4.1` | OpenAI model id used for vision calls. |
| `GEMINI_API_KEY` | **yes** | — | Google Generative AI key. |

Gemini vision model is hardcoded in [src/config.js](src/config.js) as `gemini-2.5-flash` (fallback: `gemini-2.0-flash`). `GEMINI_MODEL` / `GEMINI_FALLBACK_MODELS` env vars are ignored.

`server/.env` is git-ignored — never commit real keys.

---

## Request / response contract

Every endpoint accepts `multipart/form-data` and returns the same envelope:

```jsonc
{
  "data":  { /* fully normalized result, shape depends on endpoint */ },
  "usage": { /* token counts + computed cost, or null if unavailable */ }
}
```

The `usage` object has this shape (see [src/utils/usage.js](src/utils/usage.js)):

```jsonc
{
  "provider": "openai" | "gemini",
  "model": "gpt-4.1",
  "inputTokens": 1234,
  "outputTokens": 456,
  "totalTokens": 1690,
  "inputCost": 0.00617,
  "outputCost": 0.00684,
  "totalCost": 0.01301,
  "currency": "USD"
}
```

Pricing is hardcoded per model in `PRICING_PER_MILLION` — update that table
when new models are added.

### Error envelope

Non-2xx responses always return:

```jsonc
{ "error": { "code": "SOME_CODE", "message": "Human-readable message." } }
```

Common codes:

| Code | Status | When |
| --- | --- | --- |
| `MISSING_FILE` | 400 | A required image field was not uploaded. |
| `INVALID_PROVIDER` | 400 | `provider` was not `openai` or `gemini`. |
| `INVALID_PROMPT_VERSION` | 400 | `promptVersion` is not in the allowed list. |
| `INVALID_FILE_TYPE` | 400 | Uploaded file is not `image/*`. |
| `LIMIT_FILE_SIZE` | 413 | File exceeds `MAX_UPLOAD_BYTES`. |
| `OPENAI_UPSTREAM_ERROR` | 502 | OpenAI call failed or returned malformed JSON. |
| `GEMINI_UPSTREAM_ERROR` | 502 | Gemini call failed or returned malformed JSON. |
| `INTERNAL_ERROR` | 500 | Catch-all. Logged server-side with stack. |
| `NOT_FOUND` | 404 | Unknown route. |

---

## Endpoints

Base path: `/api`

### `GET /healthz`

Returns `{ "status": "ok" }`. No auth, no side effects.

---

### `POST /api/analyze/single`

Single-image product identification with optional bounding boxes.

**Form fields**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `image` | file | yes | Image of the scene. |
| `provider` | string | yes | `openai` or `gemini`. |
| `promptVersion` | string | no (default `v1`) | One of `v1`, `v2`, `v3`. |

**Response `data`**

```jsonc
{
  "products": [
    {
      "id": "product_1",
      "brand": "coca-cola",
      "brand_confidence": 0.92,
      "category": "beverage_bottle",
      "category_confidence": 0.95,
      "material": "plastic",
      "material_confidence": 0.9,
      "color": "red",
      "color_confidence": 0.88,
      "bbox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4 }
    }
  ],
  "food_waste_items": ["banana peel"],
  "containers_with_food_or_drink": ["half-full soda bottle"],
  "organics_contamination_present": true,
  "organics_contamination_items": ["plastic wrapper"]
}
```

Temperature: `0.1`. Compression preset: `768 px · JPEG · q=0.18`.

---

### `POST /api/analyze/multi`

Multi-object identification that accepts **two** images of the same scene and
merges duplicates across them. A special `v4` prompt instead runs on a single
image and returns an approximate coffee-capsule group count.

**Form fields**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `image1` | file | yes | First image. |
| `image2` | file | yes (no for `v4`) | Second image of the same scene. Ignored when `promptVersion=v4`. |
| `provider` | string | yes | `openai` or `gemini`. |
| `promptVersion` | string | no (default `v1`) | One of `v1`, `v2`, `v3`, `v4`. |

**Response `data` — standard (v1/v2/v3)**

```jsonc
{
  "merged":        [ /* deduped products with a `source` tag */ ],
  "image1Results": [ /* normalized products from image1 */ ],
  "image2Results": [ /* normalized products from image2 */ ]
}
```

Each merged product gains `source: "both_images" | "image1_only" | "image2_only"`
and, when merged from both, `image1_bbox` / `image2_bbox` fields. The merge
rules (brand/category/material/color/cap_color/zindex) are ported verbatim
from the original client-side logic to preserve deduplication behavior — see
[src/parsers/multiObject.js](src/parsers/multiObject.js).

**Response `data` — capsule group (v4)**

```jsonc
{
  "capsuleGroup": {
    "approx_count": 42,
    "count_range": { "min": 35, "max": 50 },
    "brand": "nespresso",
    "brand_confidence": 0.88,
    "category": "coffee_capsule",
    "category_confidence": 0.95,
    "material": "aluminum",
    "material_confidence": 0.9
  }
}
```

Temperature: `0`. Compression preset: `512 px · WebP · q=0.70`. Standard cases
call the vision API twice in parallel via `Promise.all`; usage is combined with
`mergeUsageSummaries`.

---

### `POST /api/analyze/food-waste`

Food-waste caddy analysis. Detects organic waste, packaging/non-organics
contamination, recyclables accidentally dropped into the caddy, and any other
items.

**Form fields**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `image` | file | yes | Image of the food waste caddy. |
| `provider` | string | yes | `openai` or `gemini`. |

No `promptVersion` — this endpoint uses a single tuned prompt.

**Response `data`**

```jsonc
{
  "has_organic_food_waste": true,
  "food_waste_confidence": 0.93,
  "organics_contamination_present": true,
  "organics_contamination_items": ["plastic coffee lid", "aluminum foil"],
  "recyclables_present": true,
  "recyclable_items": ["plastic coffee lid", "aluminum foil"],
  "other_items": [
    {
      "id": "item_1",
      "brand": "unknown",
      "brand_confidence": 0,
      "category": "beverage_bottle",
      "category_confidence": 0.7,
      "material": "plastic",
      "material_confidence": 0.8,
      "color": "clear",
      "color_confidence": 0.6,
      "bbox": null
    }
  ]
}
```

Temperature: `0`. Compression preset: `768 px · JPEG · q=0.18`.

**Safety-net behavior.** If the model fills `organics_contamination_items`
with something that mentions a recyclable material
(`plastic|bottle|cap|lid|film|paper|glass|metal|foil|…`) but leaves
`recyclable_items` empty, the parser infers the recyclables from that text and
populates both `recyclable_items` and `recyclables_present`. The regex is
intentionally broad — we prefer false positives over missed recyclables. See
`deriveRecyclablesFromText` in
[src/parsers/foodWaste.js](src/parsers/foodWaste.js).

---

### `POST /api/analyze/recyclables`

Recyclables-in-a-transparent-bag detection with a bio-waste contamination
score.

**Form fields**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `image` | file | yes | Image of the transparent bag. |
| `provider` | string | yes | `openai` or `gemini`. |

No `promptVersion` — single prompt.

**Response `data`**

```jsonc
{
  "recyclables_present": true,
  "contamination_score": 4,
  "contamination_items": ["apple core", "banana peel"],
  "contamination_reason": "unknown",
  "food_waste_items": ["apple core", "banana peel"]
}
```

`contamination_reason` is kept as a legacy string field. The parser also
understands two legacy response formats: `contamination_reason` as an array and
as a comma-separated string — see
[src/parsers/recyclables.js](src/parsers/recyclables.js).

Temperature: `0`. Compression preset: `1024 px · JPEG · q=0.40` (higher quality
than the other endpoints because this screen needs to see thin film/residue).

---

## Directory layout

```
server/
├── .env.example           # Template — copy to .env and fill in keys
├── package.json           # ESM, scripts, dependencies
└── src/
    ├── index.js           # Express app, middleware chain, graceful shutdown
    ├── config.js          # Env var parsing + validation
    ├── compression.js     # sharp-based compression + presets per endpoint
    ├── routes/
    │   └── analysis.js    # Wires upload middleware to controllers
    ├── controllers/
    │   ├── singleImage.js
    │   ├── multiObject.js
    │   ├── foodWaste.js
    │   └── recyclables.js
    ├── services/
    │   ├── ai.js          # Provider-agnostic dispatcher (callVision)
    │   ├── openai.js      # OpenAI chat.completions vision call
    │   └── gemini.js      # Gemini generateContent + code-fence stripping
    ├── prompts/
    │   ├── singleImage.js # v1–v3
    │   ├── multiObject.js # v1–v4 (v4 = capsule group)
    │   ├── foodWaste.js
    │   └── recyclables.js
    ├── parsers/
    │   ├── common.js      # parseJsonResponse, extractArray, numberOr, …
    │   ├── singleImage.js
    │   ├── multiObject.js # normalize + mergeProducts dedup logic
    │   ├── foodWaste.js   # includes deriveRecyclablesFromText safety net
    │   └── recyclables.js # legacy contamination_reason handling
    ├── middleware/
    │   ├── upload.js      # multer memoryStorage + image mime filter
    │   ├── validate.js    # requireFile / requireProvider / requirePromptVersion
    │   └── errorHandler.js# Unified JSON error envelope, MulterError handling
    └── utils/
        └── usage.js       # buildUsageSummary, mergeUsageSummaries, pricing table
```

---

## Architecture notes

**Controller pattern.** Each endpoint has one controller that does the same
four steps: validate (`requireFile` / `requireProvider` / `requirePromptVersion`),
compress (`compressImage` with a preset), call vision (`callVision` dispatcher),
parse. Errors are propagated via `next(error)` and caught by
[errorHandler.js](src/middleware/errorHandler.js).

**Provider-agnostic dispatch.** `callVision({ provider, imageBuffer, mimeType,
prompt, temperature })` in [src/services/ai.js](src/services/ai.js) chooses
between `callOpenAIVision` and `callGeminiVision` and returns a unified
`{ content, usage }` envelope. Controllers never see provider-specific shapes.
OpenAI calls use `response_format: { type: "json_object" }`; Gemini calls
strip ` ```json` / ``` ``` ``` code fences before parsing.

**Compression presets are intentionally different.** See `COMPRESSION_PRESETS`
in [src/compression.js](src/compression.js). Do not unify them — the recyclables
endpoint in particular needs 1024 px / q=0.4 to pick up thin residue that the
lower-quality presets miss. All presets call `sharp().rotate()` so portrait
photos from phones land in the correct orientation.

**Uploads.** `multer.memoryStorage()` keeps the buffer in RAM (small, short
requests — no disk I/O). `fileFilter` rejects anything whose mimetype doesn't
start with `image/`. Dual-image endpoints use `upload.fields([{ name: 'image1'
}, { name: 'image2' }])` with `maxCount: 1` per field and a global `files: 2`
cap.

**Usage tracking.** `buildUsageSummary` normalizes token counts from both SDK
response shapes (OpenAI `response.usage`, Gemini `response.usageMetadata`) and
computes cost using `PRICING_PER_MILLION` in
[src/utils/usage.js](src/utils/usage.js). `mergeUsageSummaries` sums results
from parallel calls (used by the dual-image multi-object endpoint).

**Graceful shutdown.** On `SIGINT` / `SIGTERM` the HTTP server calls
`server.close()` before exiting so in-flight requests can finish —
see [src/index.js](src/index.js).

---

## Adding a new endpoint

1. Create a prompt module under `src/prompts/`. Export a `get…Prompt(version)`
   helper and, if the endpoint has multiple versions, a
   `…_PROMPT_VERSIONS` array used for validation.
2. Create a parser module under `src/parsers/`. Use `parseJsonResponse` and
   the helpers in `common.js` to enforce defaults and shape.
3. If compression needs differ from the existing presets, add a new entry to
   `COMPRESSION_PRESETS` in [src/compression.js](src/compression.js).
4. Create a controller under `src/controllers/` that calls `requireFile`,
   `requireProvider`, `requirePromptVersion`, then `compressImage`,
   `callVision`, and finally your parser. Return `res.json({ data, usage })`.
5. Wire the route in [src/routes/analysis.js](src/routes/analysis.js) with
   `singleImageUpload` or `dualImageUpload`.
6. Add a matching helper to `src/api/client.js` on the frontend if a UI screen
   needs it.

---

## Testing with curl

```bash
# Health check
curl http://localhost:3001/healthz

# Single image (OpenAI, prompt v1)
curl -X POST http://localhost:3001/api/analyze/single \
  -F image=@/path/to/scene.jpg \
  -F provider=openai \
  -F promptVersion=v1

# Multi object (Gemini, dual image, v2)
curl -X POST http://localhost:3001/api/analyze/multi \
  -F image1=@/path/to/front.jpg \
  -F image2=@/path/to/back.jpg \
  -F provider=gemini \
  -F promptVersion=v2

# Capsule count (v4, single image, image2 omitted)
curl -X POST http://localhost:3001/api/analyze/multi \
  -F image1=@/path/to/capsules.jpg \
  -F provider=openai \
  -F promptVersion=v4

# Food waste caddy
curl -X POST http://localhost:3001/api/analyze/food-waste \
  -F image=@/path/to/caddy.jpg \
  -F provider=openai

# Transparent bag recyclables
curl -X POST http://localhost:3001/api/analyze/recyclables \
  -F image=@/path/to/bag.jpg \
  -F provider=gemini
```
