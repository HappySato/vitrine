# Vitrine

Vitrine is a floor tool for a small retailer. A clerk loads who just walked in, the shelf reorders from that person's taste, and checkout creates a sandbox order. The sentences are written by an OpenAI-compatible model. Point that endpoint at vLLM on an AMD Instinct MI300X and each reply is badged **Served on AMD MI300X via vLLM/ROCm**.

Built for the [AMD Developer Hackathon: ACT III](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii), Reinvent Commerce track.

The commercial decision is not the language model. A published score ranks the shelf. Gross margin versus the bestsellers is arithmetic. The model only writes the note the clerk reads, and only about products the score already chose.

## Architecture

```mermaid
flowchart LR
  clerk[Clerk browser] --> app[Vitrine Next.js]
  app --> score[Scoring function]
  score --> taste[Taste provider]
  taste --> graph[Local taste graph]
  taste --> qloo[Qloo Insights API]
  app --> talk[Shopkeeper narration]
  talk --> llm[OpenAI-compatible /v1/chat/completions]
  llm --> gpu[vLLM on AMD Instinct MI300X / ROCm]
  app --> pay[Payment provider]
  pay --> mock[In-process sandbox]
  pay --> paypal[PayPal Orders v2 sandbox]
```

| Piece | What it does | Default with no keys |
| --- | --- | --- |
| Taste provider | Maps cultural signals onto shelf tags and a because-path | Local graph in `lib/taste/graph.ts` |
| Scoring | `inStock × (0.62 tasteFit + 0.23 marginRate + 0.15 novelty)` | Always on |
| Narration | Speaks to the clerk about the ranked shelf | Local planner |
| LLM | Replaces the planner's sentences when an endpoint answers | Off until `LLM_BASE_URL` is set |
| Payment | Creates an order and does not capture it | In-process mock |

Stock and the order ledger live in the Node process. Restarting the server, or **Restock the floor** on the desk, puts the fixture back.

## Run it locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:43123.

With an empty `LLM_BASE_URL` the floor still ranks, explains, and checks out. Reply badges say the local planner wrote them. That is intentional.

```bash
npm test
npm run lint
```

## Environment

See `.env.example`. Server-side only. Nothing secret is sent to the browser.

| Variable | Purpose |
| --- | --- |
| `LLM_BASE_URL` | OpenAI-compatible origin, with or without `/v1` |
| `LLM_MODEL` | Model id the server expects |
| `LLM_API_KEY` | Bearer token. vLLM often accepts any non-empty string |
| `LLM_BACKEND` | `auto`, `amd-mi300x`, `openai-compatible`, or `local` |
| `LLM_TIMEOUT_MS` | Default 60000. The first MI300X call compiles kernels and can use most of that |
| `LLM_FALLBACK` | `on` (default) falls back to the local planner if the endpoint fails. `off` returns an error instead |
| `TASTE_PROVIDER` | `mock` or `qloo` |
| `QLOO_API_KEY` | Sent as `X-Api-Key`. No key means the local graph |
| `QLOO_BASE_URL` | Default `https://hackathon.api.qloo.com`. Other hosts are refused |
| `PAYMENT_PROVIDER` | `mock` or `paypal-sandbox` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Sandbox REST app only |
| `PAYPAL_BASE_URL` | Must be `api-m.sandbox.paypal.com` or `api.sandbox.paypal.com` |

Set `LLM_BACKEND=amd-mi300x` only when the URL really is vLLM on an MI300X. A laptop Ollama server should stay on `auto`. The badge is a claim about the machine that produced the sentence, and a failed call never wears the AMD badge.

Local OpenAI-compatible example (Ollama):

```bash
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=llama3.1
LLM_BACKEND=auto
```

## Run the model on AMD Developer Cloud

The web app does not need a GPU. The GPU runs vLLM. The app calls it over HTTP. You need an AMD Developer Cloud VM (or any host) with an Instinct MI300X, the ROCm driver, and Docker. This repo does not create that account.

1. Sign in to AMD Developer Cloud from the [hackathon page](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii) (AMD AI Developer Program). The event notes that the workspace on `notebooks.amd.com/tokenfactory` does not ask for a card. Launch a GPU VM with an MI300X (`gfx942`) and a ROCm image that includes Docker. Add your user to `video` and `render` if `/dev/kfd` is not readable.
2. SSH to the VM. Confirm the GPU:

   ```bash
   rocm-smi
   ls /dev/kfd /dev/dri
   ```

3. Clone this repo on the VM and start vLLM. Qwen2.5 7B Instruct is the default: open weights, strong enough to follow the JSON reply, and small next to a 192 GB MI300X. Use `Qwen/Qwen2.5-32B-Instruct` when you want a better floor note. `meta-llama/Llama-3.1-8B-Instruct` also works if you `export HF_TOKEN` for the gated repo.

   ```bash
   export HF_TOKEN=hf_...          # only if the model repo is gated
   bash deploy/vllm-mi300x.sh
   ```

   The script pulls `vllm/vllm-openai-rocm:latest` and runs it with the ROCm devices (`/dev/kfd`, `/dev/dri`), `--ipc=host`, and the video group. Upstream vLLM documents this image; the older `rocm/vllm` images are deprecated. Override the image with `VLLM_IMAGE` if AMD's docs name a pinned tag during the event.

4. In another shell on the VM, check the endpoint. The first completion is slow while ROCm compiles kernels.

   ```bash
   bash deploy/verify-llm.sh
   ```

5. Start Vitrine where the clerk's browser can reach it. On the same VM:

   ```bash
   cp .env.example .env
   ```

   Put this in `.env`:

   ```bash
   LLM_BASE_URL=http://127.0.0.1:8000/v1
   LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
   LLM_API_KEY=EMPTY
   LLM_BACKEND=amd-mi300x
   ```

   Then:

   ```bash
   docker compose up --build
   ```

   Or, without Docker for the app: `npm install && npm run build && npm start`.

6. If the browser is on your laptop and vLLM is only bound on the VM, tunnel it. Do not leave port 8000 open on a public address.

   ```bash
   ssh -L 8000:127.0.0.1:8000 user@your-mi300x-vm
   ```

   Point the app at `http://127.0.0.1:8000/v1` with `LLM_BACKEND=amd-mi300x`.

7. Ask the floor something. The badge under that reply should read **Served on AMD MI300X via vLLM/ROCm**, with the model id beside it. The header says "Configured" as soon as the env is set. The per-reply badge changes only after a call succeeds.

If the event gives you a Token Factory base URL instead of a VM, you can set `LLM_BASE_URL` to it. Use `LLM_BACKEND=amd-mi300x` only when that endpoint is vLLM on MI300X. Otherwise leave the backend on `auto` and the badge will say it was an OpenAI-compatible endpoint.

## What needs an AMD GPU to be fully live

| Works with no GPU and no keys | Needs the MI300X endpoint |
| --- | --- |
| Shelf ranking, because-paths, floor math | The shopkeeper's sentences |
| Mock sandbox checkout and the desk | The AMD badge on a reply |
| Switching regulars, bag, restock | |

Qloo and PayPal sandbox are optional plugs. Without their keys the app uses the local taste graph and an in-process order id. It never calls live PayPal. A non-sandbox PayPal host throws before any request.

## Deploy the web app

The app is one container. vLLM stays on the GPU host as a second container; the ROCm image is not inside the app image.

```bash
docker compose up --build
```

The process listens on port **43123**. Pass the same env vars at runtime (`docker run -e LLM_BASE_URL=...`). They are read per request, so one image can move between a laptop and the GPU box without a rebuild.

Any host that runs Node 22 or this container can serve the UI. The GPU box only has to be reachable from that host at `LLM_BASE_URL`.

## Taste and payment plugs

- **Taste.** `lib/taste/provider.ts`. `mock` walks `TASTE_GRAPH`. `qloo` searches `GET /search` and calls `GET /v2/insights` with `signal.interests.entities`, then merges tags back onto the same retail graph. A failed or empty Qloo call falls back to the graph and says so.
- **Payment.** `lib/payments/provider.ts`. `mock` returns `SANDBOX-MOCK-…` and does not use the network. `paypal-sandbox` gets a sandbox token and `POST /v2/checkout/orders`. There is no capture call. `charged` is always `false`.

## Tests

`npm test` covers ranking, the margin gap on the fixture, budget filtering, the AMD badge (including a failed call that must not wear it), Qloo host allow-listing, and the PayPal sandbox guard.

## Demo

The 2–3 minute recording script is [DEMO.md](DEMO.md).

## Submission copy

**Short.** Vitrine is a taste-aware floor agent for an independent retailer. It ranks live inventory from a Qloo-style taste graph, explains the path, and opens a PayPal sandbox checkout. Margin math is a published formula, not the language model. The shopkeeper's words run on vLLM on AMD Instinct MI300X with ROCm.

**Track.** Reinvent Commerce. The user is the clerk. The action is a bag and a sandbox order. The desk shows gross margin of the taste top three against the store's bestsellers, and how often the fixture's real purchases sat in that top three. Both numbers are computed in `lib/desk.ts` and `lib/taste/score.ts`. The model is not in that path, which is the track rule for anything that looks like a forecast.

**Tags.** AMD Instinct MI300X, ROCm, vLLM, OpenAI-compatible inference, commerce, recommendations, Qloo-style taste, PayPal sandbox.

## License

[MIT](LICENSE).
