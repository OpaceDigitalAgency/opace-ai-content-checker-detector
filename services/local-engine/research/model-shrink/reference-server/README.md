# Opace detector — inference endpoint

The server-side route for the AI content checker. Live at
`https://opace-detector-877422072168.europe-west1.run.app`, Cloud Run,
europe-west1, scale to zero.

Two things this service has to get right beyond returning a number:

1. **It must score the same as the browser.** The in-browser route reads the
   whole document by scoring it in sections; if the server only read the
   opening, the same document would score differently depending on which route
   ran, which is worse than either bug alone. Segmentation here mirrors
   `src/lib/local-signals/segments.ts` exactly — see [Segmentation](#segmentation).
2. **It must not be able to generate a bill.** Every limit below exists for
   that, and [`SECURITY.md`](SECURITY.md) carries the threat model, the
   arithmetic and the residual risks.

Files: `app.py` (endpoints and every guard), `segments.py` (the parity port),
`wordpress_channel.py` and `extension_channel.py` (the disabled-by-default
non-website credential protocols), `test_segments.py` and `test_wordpress_*`
(golden/security cases), `deploy.sh`, `disable-service.sh`,
`enable-service.sh`, `SECURITY.md`.

---

## Segmentation

The classifier reads at most 512 WordPiece tokens. A 3,000-word draft used to
be judged entirely on its opening.

`segments.py` is a port of the reference implementation in the website repo,
following its SERVER PARITY CONTRACT (v2) rule for rule:

- Words are matches of `/\S+/`. Nothing is normalised first.
- Every word's WordPiece token count is **measured**. A segment is bounded by
  tokens, not by a word-count proxy.
- A document whose measured tokens plus `[CLS]`/`[SEP]` fit in 512 is exactly
  one segment, the input verbatim.
- Otherwise the document is cut into the **fewest** consecutive segments that
  all fit, as near equal in tokens as word boundaries allow. Every candidate
  segment is measured before it is accepted; if one overshoots, the split
  widens by one part and repeats.
- A word too big for the window on its own — punctuation is split out before
  WordPiece runs, so one 987-character `:;:;…` run in the corpus tokenises to
  987 tokens — is sliced at 510 code units and each slice gets a segment to
  itself. That fired on 1 word in 6,916,005 measured.
- **The document verdict is the MAXIMUM segment score, never the mean.**
  Averaging was measured to dilute detection from 93.3% to 57.8% on the same
  documents: one AI section inside an otherwise human draft is washed out by
  the human sections around it.

### Why v2 replaced the v1 word rule

v1 cut every 340 words on the premise that 340 words always fits 512 tokens.
Tokenising every v1 segment of the whole 5,558-document fresh long-form corpus
without truncation:

| | v1 | v2 |
|---|---|---|
| segments at or over the 512-token window | 1,348 of 23,318 (5.78%) | **0 of 21,093** |
| documents with at least one | 684 of 5,558 (12.31%) | **0** |
| worst single segment | 3,406 tokens (2,894 dropped) | 512 |
| tokens silently dropped | 276,466 of 9,287,413 (2.98%) | 0 |

Word-to-token expansion ran from 1.04 to 3.89 tokens per word. The proxy failed
hardest on AI academic literature reviews (26.2% of documents) and AI white
papers (25.2%).

Note for anyone reading `truncated` in a `/v1/check` response: under v1 that
flag fired on 5.78% of segments and was **not** the route-drift signal the code
called it, because both routes truncated identically. Under v2 every segment is
measured to fit before it is scored, so it is now genuinely a "should never
happen".

Golden cases, asserted by `test_segments.py` and copied from the reference file.
Word counts alone no longer determine the split, so each case names its text:

| text | segment words | segment tokens |
|---|---|---|
| `"word " × 340` | `[340]` | `[342]` |
| `"word " × 505` | `[505]` | `[507]` |
| `"word " × 511` | `[256, 255]` | `[258, 257]` |
| `"word " × 1020` | `[510, 510]` | `[512, 512]` |
| `"word " × 1021` | `[341, 340, 340]` | `[343, 342, 342]` |
| `"word " × 3000` | `[500] × 6` | `[502] × 6` |
| `"w0 w1 w2 …"` × 700 | `[161, 137, 137, 137, 128]` | `[414, 412, 412, 412, 410]` |
| `":" × 900` (one word) | `[1, 0]` | `[512, 392]` |

```sh
python3 test_segments.py     # or: python -m pytest test_segments.py -q
```

`deploy.sh` runs these before it builds and refuses to continue if they fail.
Structural parity is proven; **numerical parity between the two runtimes is
not yet** — see `SECURITY.md` §7.10.

Segments are scored middle-first, then the end, then the opening, matching the
browser's `scoringOrder`. The verdict is a maximum, so order cannot change the
answer; matching it means a failure part-way through leaves both routes with
the same evidence.

---

## Limits, and why each one is that number

Full reasoning in `SECURITY.md` §§3–6. Every one is an environment variable, so
any of them can be changed with `gcloud run services update --update-env-vars`
without a rebuild.

### The global daily cap — the one that matters

| | |
|---|---|
| `GLOBAL_DAILY_INFERENCES` | **12,000 per UTC day, service-wide** |

Denominated in **inferences, not requests**, because a request is no longer a
fixed unit of cost: one 4,000-word document is twelve forward passes. A cap of
5,000 requests would authorise up to 60,000 forward passes — and would have
cost about £7.65/month instead of £0 (`SECURITY.md` §4 shows the working).

12,000 comes from working backwards from the free tier: 180,000 vCPU-seconds a
month is 5,914 a day; at a pessimistic 0.30 vCPU-seconds per inference plus
0.10 per request, 12,000 inferences a day uses 146,112 vCPU-seconds a month
against 180,000 free. **18.8% headroom.** In practice that is roughly 6,000 to
8,000 checks a day at a realistic mix of document lengths.

The counter lives in **Firestore (Native mode)**, one document per UTC day,
because an in-memory counter dies with the instance and a scale-to-zero service
recycles instances constantly. Native mode is chosen for its server-side atomic
`Increment`: no read-modify-write, so no transaction, no retry loop, and none
of the one-write-per-second contention a Cloud Storage object with a generation
precondition would hit exactly when it matters. Writes are batched (25
inferences or 15 seconds), so the counter costs ~14,600 writes a *month*
against a free tier of 20,000 a *day*. **£0.** A refusal never writes, so a
flood cannot exhaust the write quota and make the cap fail open.

When the cap is hit the endpoint returns 429 `daily_allowance_exhausted` with
the local-model offer. Not an error — a redirection.

### Per-client limits

Keyed on a BLAKE2b hash of the client's **network** with a 16-byte pepper
generated at process start and never persisted. IPv6 is bucketed to **/64**,
because one residential customer is routinely handed a whole /64 and limiting
on the full 128-bit address limits nothing. IPv4 is limited on the address
itself; /24 would sweep up shared office egress.

| | per minute | per hour | per day |
|---|---|---|---|
| Requests | 5 | 30 | 100 |
| Inferences | 20 | 150 | 500 |

Two ledgers, both sliding-window, both returning 429 with `Retry-After`. The
request ledger stops rapid trivial calls; the inference ledger charges each
request its segment count, so someone submitting 4,000-word articles exhausts
their allowance twelve times faster than someone submitting paragraphs.
Charging by request alone would let the expensive traffic through the cheap
gate.

The client IP is read from the **last** `X-Forwarded-For` entry, not the first.
Cloud Run appends the address it observed to whatever the caller sent, so the
last entry is the only one that cannot be spoofed; taking the first — the
reflex, and correct behind Cloudflare's `CF-Connecting-IP` — would let anyone
defeat every per-IP limit with a random header. `PROXY_IP_POSITION` exists so
this stays correct if a CDN is put in front later.

These limits are per-instance and per-process, which is a real weakness with a
name and a number: `SECURITY.md` §7.2. The Dockerfile runs one worker rather
than two specifically to halve it.

### Size

| | |
|---|---|
| `MAX_BODY_BYTES` | 700,000 — refused on `Content-Length` before anything reads it; large enough for 100,000 UTF-16 code units in WordPress's largest valid JSON representation plus the request envelope |
| `MAX_CHARS` | 100,000 |
| `MAX_WORDS` | **8,000** |

`MAX_WORDS` and `MAX_CHARS` bound the price of a request independently of the
JSON representation used by a client. At 8,000 words a request costs at most
20 inferences. The larger byte ceiling is transport headroom, not permission
to score more text: WordPress's JSON encoder may use six ASCII bytes per UTF-16
code unit. Anything beyond either decoded-text
limit is refused with a 413 that offers the on-device route, which has no
shared daily allowance.

`MIN_WORDS` is 60, unchanged: below 200 words accuracy falls sharply and below
100 the result is not meaningful.

### Bot resistance

- **Origin**, enforced server-side, not merely via CORS. CORS is enforced by
  browsers; a script ignores it. Both are configured.
- **User-Agent**: absent, or a known tool (`curl`, `python-requests`, `k6`,
  `puppeteer`, and thirty more), or not starting `Mozilla/` → 403.
- **Signed token with proof of work.** The page fetches a challenge, finds a
  nonce whose SHA-256 has 14 leading zero bits (~16,000 hashes, under 100 ms in
  a worker), and exchanges it for a token covering its next 20 checks for 15
  minutes. Tokens are HMAC-signed and bound to the requesting /64.

Origin and User-Agent are forgeable strings and are not counted as a security
boundary anywhere (`SECURITY.md` §7.5). The proof of work is deliberately weak:
it turns a one-line `curl` loop into a small program, and no more (§7.6).

**Cloudflare Turnstile: recommended against, for now**, with the reasoning and
the trigger that would change the answer in `SECURITY.md` §8. In short, it does
not touch the exposure that actually costs money, and it puts a third party on
a page whose selling point is that nobody watches you.

### Platform

```
--memory 1Gi --cpu 1 --min-instances 0 --max-instances 2
--concurrency 3 --timeout 60s
```

`--max-instances 2` is the only hard ceiling Cloud Run offers on CPU and
memory. **It does not bound the request charge, and nothing in Cloud Run
does** — which is why the £50 requirement is met by the kill switch, not by
these flags. `SECURITY.md` §6 has the arithmetic, including the £519/month
figure that applies if the kill switch is missing.

---

## API

TLS only. JSON in, JSON out. Text is only ever sent in a POST body, never in a
URL or query string, so no request log anywhere can contain a document.

### `GET /v1/challenge`

```jsonc
{ "challenge": "1756…", "algorithm": "sha256(challenge + ':' + nonce)",
  "difficulty_bits": 14, "expires_in": 120, "instructions": "…" }
```

### `POST /v1/token`

```jsonc
// request
{ "challenge": "…", "nonce": "48213" }
// 200
{ "token": "…", "expires_at": 1756…, "max_checks": 20, "header": "x-opace-token" }
// 400  { "error": "challenge_failed", "detail": "insufficient_work", … }
```

### `POST /v1/check`

Header **`x-opace-token: <token>`**. Not `Authorization: Bearer` — that header
is ignored and the request is refused `token_required`. This has caught more
than one person, including during the 29 August 2026 deployment testing, so it
is worth stating twice.

The full client contract is three calls: `GET /v1/challenge` for a challenge,
solve the 14-bit proof of work (`sha256(challenge + ':' + nonce)`, roughly
16,000 hashes, under 100 ms in a worker), `POST /v1/token` to exchange it, then
send the returned token in `x-opace-token` on each `POST /v1/check`. One token
covers 20 checks for 15 minutes and is bound to the requesting /64.

```jsonc
// request
{ "text": "…", "full_word_count": 1840 }   // full_word_count is now advisory only

// 200
{ "model": "tier3-cycle2", "model_build": "a1b2…", "precision": "fp32",
  "segmentation_contract": "segments-v2", "aggregation": "max",
  "probability_ai": 0.9912,        // the MAXIMUM segment score
  "margin": 5.83, "flagged": true, "threshold": 0.98,
  "word_count": 1840, "segment_count": 6, "strongest_segment": 3,
  "segments": [
    { "index": 0, "word_start": 0, "word_end": 340,
      "words": 340, "char_start": 0, "char_end": 1993,
      "probability_ai": 0.3311, "margin": -0.58, "flagged": false,
      "tokens_scored": 461, "truncated": false },
    … ],
  "tokens_scored": 2766, "truncated": false,
  "inference_ms": 1284.3, "inferences": 6,
  "processed": "server", "retained": "nothing",
  "daily_allowance_remaining": 11732 }
```

`probability_ai`, `margin` and `flagged` keep their old meaning at the document
level, so existing callers do not break. `tokens_scored` is now the sum across
segments and `truncated` should never be true — it can only become true if one
segment exceeded the window, which the segmentation rules are designed to make
impossible. If it is ever true in production, the two routes have drifted.

`char_start` and `char_end` are UTF-16 code unit offsets, matching JavaScript
string indices, so the interface can highlight exactly the passage a score came
from.

### `GET /v1/status`

The limits the running service believes it has, plus the day's remaining
allowance, so the front end can warn someone before they paste 2,000 words.

### `GET /v1/health`

Ungated, so Cloud Run and any uptime check can reach it. Discloses nothing
about any request.

### WordPress service channel: local candidate only

`/v1/wordpress/challenge`, `/v1/wordpress/token` and `/v1/wordpress/check`
form a separate server-to-server credential class. They do not treat browser
Origin or user-agent values as WordPress authentication, and browser tokens
cannot be used on them. The score route enters the same scoring function as
`/v1/check`; only the channel gate and scoped limits differ.

This channel is **disabled by default** (`ENABLE_WORDPRESS_CHANNEL=0`) and has
not been deployed. Enabling it requires `WP_REPLAY_BACKEND=firestore`, an
atomic create-if-absent replay collection with an `expires_at` TTL policy, the
PHP consent/client integration, staged log and kill-switch drills, and owner
acceptance. Memory replay mode is for one-process local tests only. The full
decision and gate record is in
`.agent/docs/ai-content-integrity/WORDPRESS-SERVICE-CHANNEL-2026-09-02.md`.

### Chrome extension service channel: local candidate only

`/v1/chrome/challenge`, `/v1/chrome/token` and `/v1/chrome/check` form a third
credential class. The channel requires all of: a user-granted optional host
permission for the exact service origin; an exact `chrome-extension://` Origin;
an extension ID in the server's fixed allowlist; body-bound proof of work and a
one-shot token; and per-network, IP, extension and install rate limits. Website
and WordPress tokens are cryptographically unusable on this route.

This channel is **disabled by default** (`ENABLE_CHROME_CHANNEL=0`) and has not
been deployed. It cannot be enabled for the public candidate until the Chrome
Web Store assigns the production extension ID, that ID is set in
`CHROME_EXTENSION_IDS`, the separate Firestore replay collection has an
`expires_at` TTL policy, the exact packaged extension passes its optional
permission and denial/fallback tests, and the renewed service privacy,
concurrency and kill-switch drills pass. Unpacked IDs may be allowlisted only
in a local test environment.

---

## What the front end must do when a check is blocked

**Every** blocking response — 401, 403, 413, 429, 500 — carries the same
three things:

```jsonc
{ "error": "daily_allowance_exhausted",
  "message": "…plain English, already written for a visitor to read…",
  "processed": "none",
  "retained": "nothing",
  "retryable": true,
  "retry_after": 41230,
  "fallback": {
    "available": true,
    "mode": "local-browser",
    "action": "offer_local_model",
    "download_mb": 34.3,
    "label": "Run the check in your browser instead",
    "note": "A one-off 34 MB download, then nothing leaves your device…"
  }
}
```

The contract is: **`fallback.action === "offer_local_model"` means show the
in-browser route as the next step, not an error.** `message` is written to be
displayed verbatim. `retryable` says whether "try again" is worth offering
alongside; `retry_after` (also in the `Retry-After` header) says when.

`processed: "none"` lets the same rendering path that handles a 200 tell that
no assessment was made — which the interface must say plainly rather than
implying a negative result.

The tool must never dead-end. Every reason the server can refuse has a working
alternative on the same page, and the two now score the same document the same
way.

Error codes: `origin_not_allowed`, `automation_detected`, `token_required`,
`challenge_failed`, `rate_limited` (with `scope` of `per_connection`),
`daily_allowance_exhausted` (`scope: service_wide`), `too_large`, `too_long`,
`too_short`, `internal`.

### Solving the proof of work in the page

Use a synchronous SHA-256 in a Web Worker, not `crypto.subtle.digest` — the
async API is roughly ten times slower per hash and turns 100 ms into a second.
Fetch a token once per session, reuse it for 20 checks, and fetch another when
a check returns 401 with `detail: "token_exhausted"` or `"token_expired"`.

---

## Running it locally

```sh
docker build -t opace-inference .
docker run -p 8080:8080 \
  -e ALLOWED_ORIGINS=https://opace.agency \
  -e QUOTA_BACKEND=memory \
  -e REQUIRE_TOKEN=0 \
  -e TOKEN_SECRET=local-dev \
  opace-inference

curl -s localhost:8080/v1/status | python3 -m json.tool
curl -sX POST localhost:8080/v1/check \
  -H 'content-type: application/json' -H 'origin: https://opace.agency' \
  -H 'user-agent: Mozilla/5.0 (local test harness)' \
  -d '{"text":"…at least 60 words…"}'
```

`QUOTA_BACKEND=memory` and `REQUIRE_TOKEN=0` are for local work only. Both
default to the hardened setting; neither is set that way in `deploy.sh`.

`model/` is deliberately absent from the repository — copy
`tier3-cycle2-e5small-fp32.onnx` from `../../models/` and `tokenizer/` from
`../../cycle2-train/cycle2-checkpoint/` before building. fp32 rather than int8
is the point: on a server there is no download to shrink, and fp32 is about 25%
faster (see `../SERVER-INFERENCE-PLAN.md` §3.1).

---

## Deploying

```sh
./deploy.sh --dry-run     # read every command first
./deploy.sh
```

It enables the APIs, creates the Firestore database and the token secret if
absent, grants the runtime service account `secretAccessor` and
`datastore.user`, builds, deploys with every limit above set as an environment
variable, adds the log exclusion, and prints the verification steps.

**The deploy is not finished when the script ends.** The budget and the kill
switch are what deliver the £50 ceiling, not any Cloud Run flag.

**Both are now built and tested (29 August 2026).** Pub/Sub topic
`detector-killswitch`; Cloud Function `detector-killswitch` (gen2, python312,
europe-west1) ACTIVE, revoking the `allUsers` invoker binding and closing
ingress on any message, deleting nothing; a Cloud Monitoring policy firing at
10 requests/second sustained 5 minutes; and the £10 budget as a slow backstop.
Verified end to end: publish to the topic → health **404 within 10 seconds** →
restored to 200.

It failed twice first — a POST to an endpoint that wanted a GET, then a missing
`run.services.setIamPolicy` permission — and in the first case it failed
*silently*, with the service happily serving for the full 200 seconds under
observation. `SECURITY.md` §6.3.2 has both. **Fire the alert deliberately after
every redeploy and every IAM change**; an untested kill switch is not a
control, and this one proved it twice.

`./disable-service.sh` makes the endpoint unreachable in seconds by removing
the `allUsers` invoker binding and closing ingress. It deletes nothing.
`./enable-service.sh` reverses it. Both take `--dry-run`.

---

## The zero-retention claim

The response says `retained: nothing`. That is checkable, and the procedure is
in `SECURITY.md` §9: no logging call in this codebase takes request-derived
data (there is no `logging` import at all), access logging is off, ONNX
Runtime's log level is raised, the exception handler discards the request
because the framework default prints the body into the traceback, and Cloud
Run's own request log records URLs and never bodies — with text never appearing
in a URL. `deploy.sh` adds a log exclusion for the service's request log
regardless.

What *is* retained is one integer per UTC day: the count of inferences
performed, associated with nothing.

**The log check in `SECURITY.md` §9.1 has now been run against the live service
(29 August 2026), and it holds — on the scoring path.** A unique high-entropy
marker was embedded in a document body and submitted through the real gated
path. It scored normally (`probability_ai: 0.0552`, `retained: "nothing"`)
rather than being refused at a gate, which is what makes the probe valid, and
then appeared in **zero** log entries anywhere in the project across
`textPayload`, `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`. The
whole service produced only 4 log entries in that window.

That covers the path a successful check takes. It does **not** cover refusal
paths (413, 429) or error paths, which run different code and have not been
probed — so the claim is "audited on the scoring path", not "audited end to
end". Probe those two before calling it comprehensive.

**Re-run the probe with a fresh marker after every redeploy**, for the same
reason the kill switch is re-fired. The request-log exclusion is a deploy-time
flag, and a deploy that dropped it would silently falsify the shipped privacy
copy with nothing failing anywhere.
