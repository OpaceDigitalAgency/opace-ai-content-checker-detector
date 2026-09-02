# Lawful-basis privacy notice — hosted route of the AI checker

**Status: PUBLISHED, 1 September 2026. Not legal advice — no lawyer was involved in drafting it.**
**Owner decision, 31 August 2026: publish on engineering-verified factual accuracy rather than wait
for external/qualified legal review.** See "Publication decision" in Part 2 below.

**Version 1.0 — 1 September 2026 (published; supersedes draft 0.1 of 31 August 2026)**

Companion documents: [`DPIA.md`](DPIA.md) (draft 0.1, 29 August 2026, updated 1 September 2026) and
[`LAWFUL-BASIS-AND-TRANSPARENCY.md`](LAWFUL-BASIS-AND-TRANSPARENCY.md), which carries the full
three-part legitimate interests test this notice summarises.

---

## Part 1 — The notice, as published

Everything between the rules below is the published text. It is published as a new section of the
site privacy policy at `https://opace.agency/privacy-policy/` ("AI Content Verification, Integrity
& Watermark Checker") and linked from the checker page at
`https://opace.agency/tools/ai/content-verification-integrity/checker/`. Nothing outside the rules
was published.

---

### How the AI checker handles your draft

**Who we are.** Opace Digital Agency Ltd, a UK company, is the data controller for this tool. You
can reach us at [info@opace.co.uk](mailto:info@opace.co.uk) or through
[our contact page](https://opace.agency/get-in-touch/).

**What we process.** When you run the check on the default server route, your browser sends the
text you pasted, and only that text, over an encrypted connection (HTTPS) to a server we control on
Google Cloud Run in Belgium. The request carries no cookie, no account details and no referrer.
There is no sign-in and we do not know who you are. Google, as our hosting provider, sees the
request in transit the way any host does; our service keeps no copy of your text and no record of
your IP address for these requests.

**Why.** To do the one thing you asked for: score your draft against our trained classifier and
return the result. We do not use your text for anything else. We never train on it.

**Our lawful basis.** Legitimate interests (UK GDPR Article 6(1)(f)). We considered asking for
consent and rejected it, because a "consent" screen you must accept before the tool works is not a
real choice, and the ICO says so. Instead you get an actual choice: one click switches the checker
to run entirely in your browser, and then nothing is sent anywhere. Our interest is running a free,
open tool that publishes its own error rates; your interest is getting the answer you asked for;
and the balance holds because nothing about your submission is kept, nothing is linked to you, the
text spends only a few seconds in server memory, and you can remove the transmission altogether
with one click. If you paste text about other people, that is your responsibility: only send what
you have the right to share, and use the in-browser option for anything confidential or sensitive.

**How long we keep your draft.** We don't. The text is scored in memory and discarded when the
response is sent. It is never written to disk, a database or a log. We verified this by
measurement, not assumption: on 31 August 2026 we sent traceable marker text through ten request
paths of the serving revision (`opace-detector-00009-jdw`), including refusals and errors, and
searched every log for it. No marker appeared anywhere, and the search was first proved able to
find a planted one. Each result screen also repeats the server's own statement of what was sent and
what was retained, so you can check the claim on every run.

**The in-browser alternative.** The same model, at the same threshold, can run on your own device.
Select the in-browser option next to the paste box. It downloads the model once (about 35 MB),
after which your text never leaves your machine. If you want the check without any transmission,
use this route.

**Where the processing happens.** The server is in Belgium (Google Cloud, `europe-west1`). For UK
visitors this is a transfer to the EU, which the UK Government has formally recognised as providing
adequate data protection, so no further safeguard is needed. Google acts as our processor under its
Cloud Data Processing Addendum.

**Your rights.** You have the usual UK GDPR rights: to be informed, and to access, correct, erase,
restrict or object to processing of your personal data. For the draft itself most of these are
satisfied in the strongest possible way, because we hold nothing to disclose, correct or delete
once your result is returned. To object to the processing, switch to the in-browser route and the
processing stops before it starts. For anything else, or to complain, email
[info@opace.co.uk](mailto:info@opace.co.uk) or use
[our contact page](https://opace.agency/get-in-touch/). You also have the right to complain to the
Information Commissioner's Office at [ico.org.uk](https://ico.org.uk/).

**One more thing, because it matters.** The score is a probability, not a verdict. It carries a
measured false-positive rate, printed next to the result. Do not treat it as proof that a person
did or did not write something.

---

## Part 2 — Engineering notes. Not for publication

### Not legal advice

Nobody involved in drafting this notice, the DPIA or the transparency document is legally
qualified. This is an engineering team's best structured attempt, written against the ICO's
published guidance, and checked line-by-line against the live deployment before publication rather
than left as an assertion.

### Publication decision

**Owner decision, 31 August 2026.** No external or qualified legal review was commissioned before
publishing Part 1. The owner decided to publish on the strength of engineering verification of the
factual claims against the live deployment — the serving revision, its drill evidence, the browser
alternative and the request-log exclusion — rather than hold the notice back indefinitely waiting on
a solicitor. This is a business decision the owner is entitled to take; it does not make Part 1
legal advice, and it does not mean the notice has been checked for legal soundness, only for factual
accuracy. A qualified reviewer remains free to correct it at any time, and the checklist below
records what such a review should still check.

### What a qualified reviewer should check, now that this is published

1. **The legitimate interests conclusion.** The full three-part test is in
   `LAWFUL-BASIS-AND-TRANSPARENCY.md` §2. The balancing outcome there is conditional: browser
   route one click away, nothing retained, published copy matching the deployment. Confirm the
   conditions hold and the conclusion is defensible.
2. **The special category data position.** No Article 9 condition fits a pasted health letter or
   grievance, and the interface warning reduces likelihood rather than supplying a condition.
   `LAWFUL-BASIS-AND-TRANSPARENCY.md` §2 ("Special category data — the honest position") and
   `DPIA.md` Risk 3. The reviewer decides whether the residual position is acceptable to publish
   on.
3. **Third-party data in submissions.** The notice puts responsibility on the person pasting.
   Whether that sentence carries the weight it is being asked to carry is a legal judgement.
   `DPIA.md` Risk 2 (invisible processing).
4. **The retention claim.** "We keep nothing" rests on the ten-path marker probe of 31 August 2026
   against revision `opace-detector-00009-jdw`
   (`.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-NORM.md`)
   (`docs/security/THREAT-MODEL.md` §on ten paths; `DPIA.md` §2.6 Findings A and B). The proof is
   revision-specific and was current as at publication (1 September 2026, revision `00009-jdw`
   still serving 100% of traffic per `PROJECT.md`). If a new revision is serving thereafter, re-run
   the probe first or the claim is unverified.
5. **The transfer paragraph.** The adequacy analysis is in `DPIA.md` §2.8, which also records two
   open items: which Google entity is the contracting processor and whether the CDPA is accepted
   for this billing account (owner confirmation needed), and the fact that Cloud Logging buckets
   sit in the `global` location, so "everything stays in the EU" must not be added to the copy.
6. **Consistency with the rest of the page and policy.** The privacy policy replacement sections
   are drafted in `LAWFUL-BASIS-AND-TRANSPARENCY.md` §6.1 and the on-page copy in §6.2. This
   notice must not contradict either, and the analytics position (GA4 and HubSpot load without
   consent, owner-accepted, `DPIA.md` Risk 7) is deliberately outside this notice's scope and must
   be covered by the policy instead.
7. **The rights section.** Confirm that pointing objection (Article 21) at the route switch is an
   acceptable published answer, and that the contact route given is the one Opace intends to staff.
8. **DPO details.** Whether Opace has, or must appoint, a DPO is unresolved (`DPIA.md` Step 1).
   If one exists, the notice should name the contact; if not, that decision needs recording.

### Cross-references

| Claim in Part 1 | Evidence |
|---|---|
| Request carries text only, no cookie or referrer | `DPIA.md` §2.2; `server-route.ts:190` |
| Nothing retained; measured on ten paths | `DPIA.md` §2.6; `docs/security/THREAT-MODEL.md`; probe of 31 August 2026, revision `opace-detector-00009-jdw` (`.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-NORM.md`) |
| No IP retention in Opace's request logs | `DPIA.md` Risk 1 (closed 29 August 2026, verified against fresh traffic) |
| Browser/server Cycle-5 route parity, with disclosed int8/fp32 precision | `DPIA.md` Step 4; current `segments-v3`, `features-v1` and `margin-v1` contracts plus route-parity measurements |
| Belgium / adequacy | `DPIA.md` §2.8 |
| Consent rejected as a basis | `LAWFUL-BASIS-AND-TRANSPARENCY.md` §2 ("Why not consent") |
| False-positive rate printed next to score | `DPIA.md` Risk 4 |

### Change control

Any of the DPIA's redo triggers (route prominence, retention, identity linkage, region, decision-
making, threshold or contract changes) invalidates this notice as well as the DPIA. Do not patch
the published copy without re-checking both.

### Facts checked before publication, 1 September 2026

Checked against the live deployment and the programme's own records rather than assumed, before
Part 1 was published as a section of the site privacy policy:

- **Serving revision and its drill evidence.** `opace-detector-00009-jdw`, 100% of traffic per
  `PROJECT.md`; both deploy-time drills (kill switch, ten-path zero-body-logging probe) re-proven
  on it 31 August 2026
  (`.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31-NORM.md`). Part 1's
  revision reference corrected from the stale `00027-yuq` to `00009-jdw` accordingly.
- **The browser alternative.** Confirmed still live and one click away from the route selector on
  the checker page; Part 1's description of it is unchanged and accurate.
- **The 8,000-word limit.** Confirmed current (`PROJECT.md`; `/v1/status` on `00009-jdw` reports
  `max_words: 8000`, `max_chars: 100000`), superseding the 4,000-word figure still recorded in
  `DPIA.md` §2.2 as measured 29 August 2026. Part 1 does not itself quote a word limit, so no
  change to the published text was needed on this point; `DPIA.md`'s stale figure is a separate,
  unresolved reconciliation item and is not corrected by this pass.
- **`md-strip-v1` input normalisation.** Confirmed live on `00009-jdw`, advertised on `/v1/health`
  and `/v1/status`, with the markdown false-positive fix proven end-to-end
  (`govuk-fa21a585224e`: flagged 0.9861 pre-deploy, clean 0.0947 post-deploy, same bytes, same URL).
  Not a claim in Part 1 and so nothing to change there; recorded here as evidence the deployment
  behind the notice's other claims is the one actually serving.
