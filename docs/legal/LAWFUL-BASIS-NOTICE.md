# Lawful-basis privacy notice — hosted route of the AI checker

**Status: DRAFT for qualified review. Not published. Not legal advice.**

**Version 0.1 — 31 August 2026**

Companion documents: [`DPIA.md`](DPIA.md) (draft 0.1, 29 August 2026) and
[`LAWFUL-BASIS-AND-TRANSPARENCY.md`](LAWFUL-BASIS-AND-TRANSPARENCY.md), which carries the full
three-part legitimate interests test this notice summarises.

---

## Part 1 — The notice, ready to publish

Everything between the rules below is the publishable text. It is written for the checker page at
`https://opace.agency/tools/ai/content-verification-integrity/checker/` or for a section of the
site privacy policy. Nothing outside the rules is for publication.

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
paths of the serving revision (`opace-detector-00027-yuq`), including refusals and errors, and
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
published guidance so a solicitor or data protection adviser can review it efficiently and correct
it. Publishing Part 1 before that review would repeat the mistake `DPIA.md` warns against in its
opening section.

### What a qualified reviewer must check before publication

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
   against revision `opace-detector-00027-yuq` (`.agent/docs/ai-content-integrity/CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31.md`) (`docs/security/THREAT-MODEL.md` §on ten paths;
   `DPIA.md` §2.6 Findings A and B). The proof is revision-specific. If a new revision is serving
   at publication time, re-run the probe first or the claim is unverified.
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
| Nothing retained; measured on ten paths | `DPIA.md` §2.6; `docs/security/THREAT-MODEL.md`; probe of 31 August 2026, revision `opace-detector-00027-yuq` (`CLOUD-RUN-SAFETY-REVERIFICATION-2026-08-31.md`) |
| No IP retention in Opace's request logs | `DPIA.md` Risk 1 (closed 29 August 2026, verified against fresh traffic) |
| Browser route identical model and threshold | `DPIA.md` Step 4; shared `segments-v2` contract, threshold 0.984 |
| Belgium / adequacy | `DPIA.md` §2.8 |
| Consent rejected as a basis | `LAWFUL-BASIS-AND-TRANSPARENCY.md` §2 ("Why not consent") |
| False-positive rate printed next to score | `DPIA.md` Risk 4 |

### Change control

Any of the DPIA's redo triggers (route prominence, retention, identity linkage, region, decision-
making, threshold or contract changes) invalidates this notice as well as the DPIA. Do not patch
the published copy without re-checking both.
