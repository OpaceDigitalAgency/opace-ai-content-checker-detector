# Lawful basis and transparency — AI Content Verification, Integrity & Watermark Checker

**Technical correction — 29 August 2026.** Google Cloud now provides an enforced Cloud Run spend
cap. Opace configured £50 monthly for project `opace-ai-detector` and service `Cloud Run`
(budget `3b89c8af-bd1c-434f-8cab-3e0d14491e71`) and retained the £10 alert-driven kill switch.
Older reasoning below that relies on there being no Cloud Run spend cap is superseded. Rate
limiting remains necessary because cap enforcement uses delayed cost data, can overshoot and is
not a substitute for abuse prevention.

**Status: DRAFT. Not signed off. Not legal advice.**

**Version 0.1 — 29 August 2026.** Companion to [`DPIA.md`](./DPIA.md), which carries the
fact-finding this document rests on.

---

## About this document

Written by the engineering team. Nobody involved is legally qualified. It exists so that a
solicitor or data protection adviser can review a concrete proposal rather than start from nothing.
Do not publish §6 or §7 until that review has happened and the owner decisions in §8 are answered.

Sections 1 to 5 are the internal working: each processing operation identified separately, with its
own lawful basis and its own justification, plus a full three-part legitimate interests assessment
wherever legitimate interests is relied on. Section 6 is the publishable copy. Section 7 is the
replacement wording for claims that are currently wrong.

The controller is **Opace Digital Agency (Opace Ltd), Park House, Rubery, Rednal, Birmingham,
B45 9AH. Company number 07314908.** UK GDPR and the Data Protection Act 2018 apply. The inference
service runs in the EU.

---

## 1. The processing operations, separately

The temptation with a tool like this is to write "legitimate interests" once and move on. That is
not what the ICO asks for, and the operations here genuinely differ. They are treated one at a
time.

| # | Operation | Personal data involved | Lawful basis |
|---|---|---|---|
| 1 | Scoring text submitted to the server route | Whatever personal data the submitted text happens to contain, about the user or about third parties | **Art. 6(1)(f) legitimate interests.** See §2. |
| 2 | Deriving a network identifier and enforcing per-client rate limits | The client IP address, immediately reduced to a network and then to a peppered hash | **Art. 6(1)(f) legitimate interests**, and the network-security interest is expressly recognised in Recital 49. See §3. |
| 3 | Proof-of-work challenge and token issuance | An HMAC pseudonym of the network, carried inside the token rather than stored | **Art. 6(1)(f) legitimate interests**, same interest as #2. See §3. |
| 4 | Security and operational logging | The client IP address, user agent, request URL, status and timing, retained in Cloud Logging | **Art. 6(1)(f) legitimate interests.** See §4. |
| 5 | The global daily inference counter | **None.** A bare integer per UTC day with no identifiers | No basis needed. This is not personal data. |
| 6 | The in-browser route | **None leaves the device.** The IP address is still seen by the host serving the page and the model file | Basis needed only for the page request itself, which falls under #4. |
| 7 | Site analytics on the tool page (GA4, HubSpot) | Cookies and identifiers set on the visitor's device | **PECR reg. 6 requires consent for the storage and access.** Consent is not obtained, on the tool pages or site-wide. Recorded as an owner decision dated 29 August 2026. See §5. |

Two things are deliberately absent from this table because they do not happen: no model training on
submitted text, and no onward disclosure of submitted text to anybody.

---

## 2. Operation 1 — scoring the submitted text

### Why not consent

Consent is the obvious-looking answer and it is the wrong one. The ICO's position is that consent
must be a genuine choice, and a gate that says "agree or you cannot use the tool" is not one. It
would also be misleading in the other direction: a consent tick suggests the user could withdraw
and have something deleted, when in fact there is nothing to delete because nothing is retained.

The right instrument here is not a consent gate but a real choice of route, and that already exists.
One click moves the model into the visitor's browser and sends nothing at all. That is a stronger
protection than any consent form, because it removes the processing rather than authorising it.

### Why not contract

There is no contract. The tool is free, requires no account, and Opace and the user have no
agreement.

### The three-part legitimate interests test

**(1) Purpose test — is there a legitimate interest?**

Opace's interest is in operating a free, open-source content-integrity tool: demonstrating
technical capability, publishing measured findings in a field where accuracy claims are routinely
overstated, and attracting professional attention to the agency. Those are ordinary commercial and
reputational interests, and commercial interests count.

The user's interest is more direct and arguably weightier. They came to get an assessment of a
piece of writing, and the processing is the only way to give it to them. Without it there is no
product.

There is a public interest too, and it is not decorative. Published AI-detection accuracy claims
are frequently unsupported, and students and writers have been harmed by them. A free tool that
publishes its own false-positive rates by register, refuses to present a score as proof of
authorship, and names the cases where it fails, is a corrective to that. The weakness list is
published rather than buried, including a 12.69% false-positive rate on human fiction that is
commercially unflattering.

If the processing could not go ahead, the tool would still exist on the browser route. What would
be lost is the 34.5 MB download barrier being removed, which was measured to be the single largest
obstacle to anyone using it.

Ethical issues: yes, and they are set out in `DPIA.md` Risk 4. The output is probabilistic and
somebody may act on it. That is dealt with by how the result is presented, not by the lawful basis.

**Purpose test: passed.**

**(2) Necessity test — is the processing necessary?**

Sending the text to the server is necessary to score it on the server. That much is trivially true
and would be a bad answer on its own, so the harder question deserves a straight answer: **the
processing is not necessary to deliver the tool.** The identical model, at the identical threshold,
runs in the visitor's browser.

What the transmission is necessary for is delivering the tool *without a large download*. That is a
real user benefit and it is proportionate, but it means the honest characterisation is convenience
rather than necessity in the strict sense. Two consequences follow, and they are binding rather
than decorative:

- The browser route must remain genuinely available, one click away, and clearly labelled. If it
  is ever buried, degraded or removed, this assessment fails and must be redone.
- The data minimisation must be real. It is: one request per document rather than one per section;
  no cookie, no referrer, no account, no identifier; text never placed in a URL; documents over
  4,000 words refused rather than trimmed, with the unlimited browser route offered instead; and
  the text held only as a local variable, deleted the moment scoring completes.

Could less data achieve the purpose? Only by scoring less of the document, which was measured to be
actively harmful: taking the opening section alone rather than the whole document dropped detection
from 93.3% to 57.8%. Sending less would produce a worse answer and mislead the user. Sending the
whole document is the minimum that gives a correct result.

**Necessity test: passed, with the browser route as a standing condition.**

**(3) Balancing test — do the individual's interests override?**

*Nature of the data.* Unknown by design, and that cuts both ways. Most submissions will contain no
personal data at all: a product description, a blog draft, a piece of technical prose. Some will
contain third-party personal data, because writing is often about people. A few will contain
special category data, because somebody will paste a health letter or an HR grievance into a free
text box, and nothing prevents it. The tool does not seek any of this and cannot detect it.

*Reasonable expectations — the user.* A person pasting text into a checker on a public website
expects it to be checked. Whether they expect it to leave their device is the question the page
answers where they paste it, not in a policy: the route selector states the position for each
route, a "Where your draft goes" block sits next to the field, the privacy sentence is on screen
during the run rather than only after it, and a transport panel afterwards prints how many words
were sent and where. That is unusually good, and it is what makes the expectation reasonable.

*Reasonable expectations — a third party named in a document.* They have none. They do not know
Opace exists. This is the invisible-processing finding in the DPIA, and it is the part of the
balancing test that does not resolve cleanly. It is mitigated rather than answered: the exposure is
seconds of transit and computation, nothing is written anywhere, and nothing is linked to an
identity. But the person concerned had no say.

*Likely impact.* Low, on the retention position as designed: no record survives the request, so
there is nothing to be breached, disclosed, compelled or repurposed later. That mitigation was
weaker than it should have been while Cloud Run request logs carrying full client IP addresses were
still reaching the second service in the project. **Closed on 29 August 2026 and verified against
fresh traffic** (`DPIA.md` §2.6, Finding A).

*Safeguards.* No account or identity linkage of any kind. No cookies on the inference request. No
retention of the text. No training on submissions. Text never in a URL. Peppered, non-persisted
hashing for rate limits. A published weakness list. And the browser route, which is not a
safeguard in the usual sense but an exit.

*Children.* Not targeted, and not knowingly processed. Student work will be checked by teachers,
and the student may be a child. The mitigation is the same as for everyone: nothing is retained and
nothing is linked to them.

**Balancing outcome.** On these facts the legitimate interests are not overridden, *provided* the
browser route stays one click away, nothing is retained, and the published copy matches what the
deployment actually does. The third condition is not currently met. Until Finding A is fixed and
the copy is corrected, the conclusion should be treated as conditional rather than settled.

### Special category data — the honest position

If a submission contains special category data, Article 9 requires a condition, and none of them
fits well. Not explicit consent: the person concerned has not given any. Not manifestly made
public. Not substantial public interest. "We did not ask for it and could not detect it" is a
reason, but it is not an Article 9 condition.

The practical position is that the exposure is seconds of in-memory processing with no retention,
so the realistic risk is very low, but the legal position is genuinely uncertain and a solicitor
should look at it. Two measures follow, and both are recommended in the DPIA:

1. A short, plain warning next to the route selector telling users not to paste confidential or
   sensitive documents on the server route, and pointing at the browser route.
2. A line in the published notice putting responsibility for other people's writing on the person
   who pastes it, which the drafted copy in §6 does.

Neither of these creates an Article 9 condition. They reduce the likelihood of the situation
arising, which is a different thing and should not be presented as the same thing.

---

## 3. Operations 2 and 3 — IP-derived rate limiting, proof of work and tokens

### What is actually processed

This is the item most likely to be under-described in the current copy, so it is set out precisely.

1. The client's IP address is read from the **last** entry of `X-Forwarded-For`, because Cloud Run
   appends the address it observed and only that entry cannot be spoofed.
2. It is reduced to the unit a single user controls: an IPv6 address is bucketed to its **/64
   prefix**; an IPv4 address is used whole, because /24 would sweep up shared office egress.
3. That network string is hashed with **BLAKE2b, 16-byte digest, prefixed with a 16-byte pepper
   generated at process start with `secrets.token_bytes` and never written to disk, never logged,
   and never persisted anywhere**. A plain hash of an IPv4 address is enumerable in seconds and
   therefore reversible. This is not.
4. The hash is the key of two in-memory sliding-window counters, one counting requests and one
   counting inferences, over 60-second, one-hour and 24-hour windows.
5. A separate HMAC pseudonym of the same network, keyed on the deployment's token secret, is
   embedded inside the proof-of-work challenge and the token. It binds a token to the network that
   earned it. **It is not stored server-side.** It exists only inside the token the client is
   holding.

**Retention.** The counters live in the Cloud Run process's memory. They expire with their sliding
window, at most 24 hours, and are destroyed outright when the instance recycles — which in a
scale-to-zero service happens constantly. The pepper dies with the process, so yesterday's keys
cannot be regenerated even in principle. **No IP address, and no derivative of one, is written to
any database or file by the application.**

This is pseudonymisation, not anonymisation, and pseudonymised data is still personal data. The
notice should say so rather than imply the hashing makes it disappear.

**The platform layer, for completeness.** Cloud Run's own request log records the full unhashed
client IP for every call. Those entries are excluded from storage, so none is retained; the
exclusion's history and the proof are in §4.

### Three-part test

**(1) Purpose.** Preventing abuse of a free service and keeping the bill inside a £50 ceiling.
Recital 49 expressly recognises processing for network and information security as a legitimate
interest. The interest is real rather than theoretical, though the earlier statement of it was
overstated and is corrected here: a previous version said that no Cloud Run setting bounds the
request charge and that a flood costs roughly £519 a month. Neither is right. Requests are billed
only once they reach a container, so the instance maximum does bound the bill, and the platform
floor at the maximum of 1 now in force is about £51 a month. What the rate limiting actually
defends is narrower and still sufficient: the shared 12,000-inference daily allowance, which one
script can exhaust in minutes, leaving the server route dead for everyone until midnight UTC. The
service is free because it is defended. Users benefit directly: the alternative to rate limiting is
not an unlimited service, it is no service.

**(2) Necessity.** Some client identifier is needed, or a single script exhausts a shared
allowance in minutes. The alternatives were considered:

- *No limits.* Fails on the first abuse, and the whole day's allowance goes with it.
- *Accounts and sign-in.* Would process far more personal data than an ephemeral network hash, and
  would destroy the tool's central privacy property, which is that it knows nothing about you.
- *A CAPTCHA such as Turnstile.* Introduces a third-party processor and a script on the page. It is
  recorded in the project's own security notes as weakening the privacy story the product is built
  on, and it was declined for that reason.
- *Proof of work alone.* Insufficient by itself: an attacker willing to spend CPU pays the work
  once per twenty checks. It is used, and it is layered with the counters rather than replacing
  them.

The chosen design processes the least data of any option that works, holds it in the least durable
form available, and discards it fastest.

**(3) Balancing.** The data is a network prefix, not an address, and it is held as an unreversible
hash for at most 24 hours in volatile memory. It is used for one purpose, cannot be repurposed
because the keys cannot be regenerated, is never combined with anything, and never identifies a
person. A visitor to any website reasonably expects the site to see their IP address and to defend
itself against abuse; this is a smaller intrusion than the norm, not a larger one. The impact of
the processing on an individual is that they may occasionally be asked to wait, and every refusal
carries the unlimited in-browser route as an alternative rather than simply failing.

**Outcome: legitimate interests applies comfortably.** This is the least contentious operation in
the document.

**Right to object.** Article 21 applies. In practice the answer is immediate: switch to the browser
route and no request is made.

---

## 4. Operation 4 — security and operational logging

### What is retained, honestly

| Record | Contents | Location | Retention |
|---|---|---|---|
| Cloud Run request log | Would carry the full client IP, user agent, request URL, method, status, latency, sizes and referer. **Excluded from storage since 29 August 2026 and verified empty against fresh traffic, so none of it is retained.** No request body in any case — the platform log has no body field, and this service never places text in a URL. | Excluded at the `_Default` sink; nothing written | **Not retained** |
| Container `stdout` / `stderr` | Application output. The application makes no logging call that takes request-derived data and imports no logging module. An unhandled exception would produce a Python traceback here. | Cloud Logging `_Default`, `global` | **30 days** |
| Admin activity audit log | Actions by the account administering the project. Contains the operator's identity, not a visitor's. | Cloud Logging `_Required`, `global` | **400 days, not configurable** |
| Cloud Monitoring metrics | Aggregate request counts by response code. No client identifier. | Cloud Monitoring | **24 months**, downsampled after 6 weeks |
| Firestore daily counter | `{count: <integer>, day: "YYYY-MM-DD"}`. No identifiers. Not personal data. | Firestore, `europe-west1` | **Indefinite — no TTL is configured** |

### The request log: what was wrong, and what is true now

`deploy.sh` adds an exclusion to the project's `_Default` sink so the Cloud Run request log is
never stored. A first reading on 29 August 2026 concluded the exclusion was not taking effect and
that client IP addresses were still being ingested. **That conclusion was wrong, and it is worth
recording why, because the mistake is an easy one to repeat.**

The exclusion filter pinned `resource.labels.service_name=opace-detector`. The project runs a
second Cloud Run service, the `detector-killswitch` function, which the filter therefore never
matched. Its request entries kept arriving all day. Read as a single pool, the two services looked
like one service that was still logging five hours after the exclusion. Split by service, the
picture is different: the detector's own request entries stop at `09:41:07Z`, three minutes and
nineteen seconds after the exclusion was applied at `09:37:48Z`, which is ordinary sink
propagation. Nothing has been written for it since.

Absence of entries is not by itself proof, because it is equally consistent with no traffic. Two
independent checks rule that out. The container's `stderr` records seven cold starts between
`10:45` and `14:02`, and a cold start only happens when a request arrives. A deliberate probe on
29 August at `14:58:02Z` sent six requests across both services and produced no request-log entries
at all, while the same query with the time bound removed still returned the older rows — so the
query works and the silence is real.

Two things were nevertheless wrong and have been changed:

- The `service_name` pin left the killswitch function's own request entries, with their own client
  IPs, being retained. The exclusion filter is now `resource.type=cloud_run_revision AND
  logName:requests`, covering every Cloud Run service in the project.
- `deploy.sh` used `--add-exclusion`, which fails when the exclusion already exists, so a re-deploy
  silently kept whatever filter was there before. It now updates in place when the exclusion is
  present and adds it when it is not, and it carries a verification step that requires an empty
  read **after fresh traffic** rather than treating the exclusion's existence as proof.

**The position the notice can now state: no per-request record is kept, and no client IP address is
retained.** What remains is container `stdout`/`stderr` for 30 days, which contains no request
content on the scoring path, and aggregate counts with no identifiers.

One residue is still held at the time of writing. 89 request-log entries written before the
exclusion took effect remain in the `_Default` bucket until they age out on 28 September 2026.
Their composition matters and was measured without recording any address: 74 belong to the
detector and carry **one** distinct IP across six user agents that are plainly a development
machine (`curl`, `node`, `Python-urllib`, three desktop Chrome builds); the other 15 belong to the
killswitch and carry Google's own `APIs-Google` Pub/Sub infrastructure addresses. **No member of
the public appears in them.** Deleting them early is an owner decision, recorded in §8.

### Three-part test (for the operational logging that is retained)

**(1) Purpose.** Diagnosing failures, investigating abuse, and being able to answer a question
about an incident after the fact. Recital 49 again. Without any per-request record, an attack or an
outage cannot be investigated at all.

**(2) Necessity.** A minimal request record is the standard and proportionate way to do this. The
service already goes further than most in reducing it: no application access log, no body ever
written, no text in any URL, and the ONNX runtime silenced. The client IP is the one field that
carries real privacy weight and the one that is genuinely useful for abuse investigation, which is
exactly why the decision on it has to be deliberate.

**(3) Balancing.** A visitor reasonably expects a website to keep server logs; this is the most
ordinary processing on the internet. The impact is low. The safeguards are a short retention
period, no linkage to any account or identity, and no combination with any other dataset. Against
that sits one specific factor that makes this case unlike an ordinary server log: the product
invites the visitor to check its retention claim on every run, so the copy has to survive being
taken literally. It now does. The page no longer says "neither stored nor logged"; it says the text
is not stored or logged and the request leaves no per-visitor record, which is what the
measurements support.

**Outcome: legitimate interests applies to the operational logging that remains, and the copy now
matches it.**

---

## 5. Operation 7 — site analytics on the tool page

Google Analytics 4 (`G-9RX6GHVD86`) and HubSpot (portal `2752703`) load on the checker page. They
**Position as at 29 August 2026.** Both load on the first scroll, click, touch or keypress, or
after eight seconds, on the tool pages and on every other page of the site. In practice that means
they load at about the moment the visitor starts typing or pastes their draft. A consent gate was
wired to the tool pages earlier that day and reverted the same day on the owner's instruction, so
this interaction trigger is the current and intended behaviour everywhere. There is no on-page
consent mechanism, and no stored preference suppresses either script — nothing in the shipped
bundle reads the key the reverted bar wrote. See decision 6 in §8.

**No draft text reaches them.** The tool's analytics helper is a three-line hard allowlist of four
event names and six enum values, verified by reading it; no free text can pass through. The events
carry `{tool: "checker"}` and nothing else. That part of the shipped claim is accurate.

**The consent position is not.** These scripts set cookies with lifetimes up to two years. PECR
regulation 6 requires consent for storing information on, or gaining access to information stored
in, a user's terminal equipment, unless it is strictly necessary for a service the user requested.
Analytics is not strictly necessary. Legitimate interests is not an available basis for the storage
and access, whatever basis is used for the subsequent processing. That exposure is unmitigated and
stands as stated.

The site's privacy policy asserts legitimate interests for analytics. There is a
`CookieNotice.astro` component, but it is imported by nothing and never renders, and its own header
comment records that it would not have gated anything even if it did. The privacy policy documents
an acknowledgement key that is therefore never written.

**Position taken, 29 August 2026.** The second of the two options this section previously set out:
a documented owner-level decision to accept the exposure rather than to gate the scripts. The
owner's recorded reason is that analytics data is essential to the business, and that a visitor who
does not want it should use their browser's own cookie and tracking controls. The tool pages
carry a short note naming GA4 and HubSpot and pointing at those controls; it is informational and
does not offer a choice on the page, because there is none to offer.

**Corrected in the live privacy policy, 29 August 2026.** The `opace-cookies-acknowledged` row
described a notice that is never rendered and a key that nothing writes; it has been removed from
the essential-cookie table. The legitimate-interests bullet no longer covers analytics, and the
analytics-cookie section now states that the cookies are set without on-page consent, that no
setting on the site turns them off, and that the browser controls in §10 of that policy are the
route available. The wording is factual and takes no position for or against the decision recorded
above. This closes the documentation action; it does not change the decision, and the residual
PECR exposure at Risk 7 of the DPIA stands as stated.

---

## 6. PUBLISHABLE COPY

**Everything from here to the end of §6 is drafted for publication by Opace. Do not publish it
until the owner decisions in §8 are answered and a solicitor has reviewed it.** Placeholders in
`[SQUARE BRACKETS]` must be filled or the surrounding sentence removed.

Two versions of the retention paragraph are supplied because the correct one depends on an owner
decision. **Publish exactly one.**

---

### 6.1 For the website privacy policy — a new section

> **NOT PUBLISHED, AND NOT TO BE PUBLISHED BY AN AGENT.** This is drafted copy for the live privacy
> policy at `/privacy-policy/`, last updated 9 March 2026, which currently says nothing about the
> tool: no Google Cloud, no retention, no transfers, no automated-processing section. That policy
> is a whole-business legal document covering far more than this tool, so the owner publishes it
> himself, after the legal review in decision 7. The wording below was checked against the live
> configuration on 29 August 2026 and reflects the remediation applied that day.


> ## AI Content Verification, Integrity & Watermark Checker
>
> This section covers the free content-integrity tool at
> `opace.agency/tools/ai/content-verification-integrity/`. It is more detailed than the rest of
> this policy because the tool handles whatever you paste into it, and you should be able to see
> exactly what happens to that.
>
> ### You choose where the AI check runs
>
> Most of the tool's checks — hidden characters, lookalike letters, writing suggestions, protected
> facts, the watermark scan and file provenance — have always run inside your own browser and send
> nothing anywhere. That has not changed.
>
> The AI model check is different, and you choose between two routes:
>
> **On our EU server (the default).** Your draft is sent over an encrypted connection (HTTPS) in a
> single request to a container we operate on Google Cloud Run in europe-west1, St. Ghislain,
> Belgium. There it is split into sections, each section is scored, and the result is returned. The
> text exists only in the server's memory for the duration of the request, typically about a
> second, and is discarded when the answer is sent. It is not written to disk, not saved, not used
> to train anything, and not sent to any other company.
>
> **Entirely in your browser.** One click on "Process entirely in my browser" downloads the model
> to your device once and runs the same check there. Nothing is transmitted at all. This route has
> no length limit.
>
> Whichever route runs, your draft is never placed in the page address, in browser storage, or in
> the analytics events this page sends.
>
> ### What we do and do not keep
>
> **The text you submit: nothing is kept.** We do not write it to disk, keep excerpts, hashes or
> summaries of it, or use it to train or improve our models. There is nothing to retain, so there
> is no retention period for it. Every result printed by the tool shows how many of your words
> were sent and repeats the server's own statement of what it did with them, so you can check this
> on each run rather than take it on trust.
>
> **Server records: none per request.** We have switched off the per-request logging our hosting
> platform would otherwise keep, so no record of your individual request — including your IP
> address — is stored. What remains is a single number per day: how many sections of text the
> service scored in total. It is not connected to you, to your request, or to anything else. We
> keep ordinary operational logs of the service's own output for 30 days; they contain no part of
> your text.
>
> **Abuse prevention.** To stop one person exhausting a free service, the server counts how many
> requests and how much text arrive from each network. It does this without keeping your address:
> your IP address is reduced to a network (for IPv6, the /64 block your provider gave you) and then
> hashed with a secret key that is generated fresh each time the service starts and is never
> written down anywhere. The counters live in the server's memory, cover windows of one minute, one
> hour and one day, and disappear when the service restarts, which happens routinely. Because the
> key is never saved, yesterday's counters cannot be traced back to any address even by us. This is
> pseudonymised data, which is still personal data, so we have described it here rather than
> claiming it is anonymous.
>
> **A daily total.** The service keeps one number per day: the total sections of text scored,
> across everybody. It contains no identifiers of any kind.
>
> ### Our lawful basis
>
> For scoring the text you submit, for abuse prevention, and for our server records, our lawful
> basis is **legitimate interests** (UK GDPR Article 6(1)(f)). Our interest is in running and
> demonstrating a free, open tool and in keeping it available and affordable; your interest is in
> getting the result you asked for. We do not ask for consent for this because a consent box that
> offers no real alternative is not a genuine choice — instead we give you a real one, which is the
> button that moves the whole check into your own browser and sends us nothing.
>
> You have the right to object to processing based on legitimate interests. For this tool you can
> act on that immediately, without contacting us, by choosing "Process entirely in my browser". You
> can also object by writing to us at the address at the end of this policy.
>
> ### Who processes the data
>
> **Google Cloud** operates the server that runs the AI check, in Belgium, as our processor. It is
> also our processor for the supporting infrastructure: the container platform, the counter store,
> the logging and the monitoring. **Netlify** hosts this website and **Cloudflare** provides its
> content delivery and DNS; neither of them sees your draft, because the AI check goes from your
> browser to our server directly rather than through this website's hosting. We do not send your
> draft to any AI provider, detector company, or other third party.
>
> ### Where the data goes
>
> The AI check runs in Belgium, in the European Economic Area, which is covered by the UK's
> adequacy regulations. That means your data can be sent there from the UK without additional
> safeguards. Our agreement with Google Cloud also covers any onward transfer outside the EEA
> using the standard contractual clauses approved for UK data transfers.
>
> ### Where other people's writing is concerned
>
> If you paste writing by or about somebody else — a pupil's essay, a client's draft, a colleague's
> report — you are responsible for having a lawful reason to do so. Please do not include more
> personal information than the check needs, and use the in-browser option if the document is
> confidential or sensitive.
>
> ### What the result is, and what it is not
>
> The AI model gives a probability that a passage shows machine-like patterns. It is not proof of
> authorship, and a low score is not a verdict that a human wrote something. Measured on 5,558
> long-form documents the model had never seen, it detects about 95% of AI long-form writing and
> wrongly flags about 1.2% of human long-form writing. It is much weaker on some kinds of writing
> than others — it wrongly flags about 13% of human fiction, and it is unreliable on anything under
> about 200 words. The tool publishes these figures next to every result. Please do not use it to
> make a decision about a person on its own.
>
> ### Your rights
>
> You have the rights set out elsewhere in this policy. For this tool, some of them have an unusual
> answer: because we keep nothing you submit, there is no record of your text for us to give you,
> correct or delete. For our 30-day server records, contact us at the address below and we will
> help, though you will need to tell us enough about when you used the tool for us to find them.
>
> **Contact:** [DPO / DATA PROTECTION CONTACT NAME AND EMAIL — SEE §8]
> **Last updated:** [DATE]

---

### 6.2 For the tool page — the replacement for the route-selector and "Where your draft goes" copy

This is the only place a visitor reliably reads. Shipped on 29 August 2026; the wording below is
what is now live, so the two do not drift.

> **Where your draft goes.** The hidden-character, lookalike, protected-fact and writing checks all
> run in this browser and send nothing. The AI model check is different, and this is the honest
> version: by default your draft is sent over HTTPS, in one request, to our own server in the EU
> (Google Cloud Run, europe-west1, Belgium). It is split into sections and scored there in memory,
> then discarded. **Your text is not stored or logged, and the request leaves no per-visitor
> record, only an anonymous daily count.** Every result prints how many
> words were sent and repeats the server's own answer for what it did with them, so you can check
> the claim on each run instead of taking it on trust. One click on **Process entirely in my
> browser** below sends nothing at all. Either way your draft is never put in the page URL, in
> browser storage, or in the analytics event this form fires, which carries no text, file or result
> content.
>
> **Please do not paste confidential or sensitive documents on the server route.** If the text
> concerns someone's health, employment, finances or legal position, or belongs to a client under
> confidence, use the in-browser option — it sends nothing anywhere and has no length limit.

---

## 7. Claims that must change, with replacement wording

The full claim-by-claim reconciliation behind this section sits in the engineering working paper of
29 August 2026, which is **held privately** and not published: it is unreviewed legal working
addressed to a solicitor, and it records live personal-data findings, third-party account
identifiers and infrastructure detail. This document is the public-facing outcome of it, and the
replacements below are what it concluded. **No files were edited to make these changes.**

### 7.1 The blocking overstatements

Every wording in the "Current" column below is **retracted**. It appears here as the thing being
corrected, never as a claim.

Everything marked **DONE 29 Aug 2026** was changed and deployed that day. The two `implementation/`
files are owned by another workstream and are handed off, not edited here.

| Where | Current | Replace with |
|---|---|---|
| `implementation/README.md:311` | retracted: "Everything runs in your browser; nothing is uploaded." | "Most checks run in your browser and send nothing. The AI model check runs on our EU server by default, and one click moves it into your browser instead." |
| `implementation/DESCRIPTIONS.md:7` (mandatory footer, propagates to every listing) | retracted: "Your text is analysed locally and never uploaded." | "Your text is analysed locally, or on our EU server if you choose that route — the tool always says which one ran." |
| `implementation/DESCRIPTIONS.md:118` | "checks content before publication, without uploading a word" | "checks content before publication, with an in-browser route that uploads nothing" |
| Tool page and `ROUTE_PRIVACY.server` | "…scored there in memory, and neither stored nor logged." | **DONE 29 Aug 2026.** "…scored there in memory, then discarded. Your text is not stored or logged, and the request leaves no per-visitor record, only an anonymous daily count." Applied in `local-signals-ui.ts`, `checker.astro` (field note and route selector), `content-integrity.ts` and the hub `index.astro`. |
| `SERVER-INFERENCE-PLAN.md:661–687` (drafted notice) | "the first 512 tokens of your text — roughly the first 400 words — are sent" | **Factually wrong and must not be published.** The whole document is sent, up to 4,000 words, and the server does the segmentation. Use §6.1 instead. |
| `SERVER-INFERENCE-PLAN.md` drafted notice | "Operational records … are deleted after 30 days" | Correct as a period for container `stdout`/`stderr`, but it must not be read as covering the request log, which is no longer retained at all. Reconcile with §6.1. |
| `src/components/tools/content-integrity/PrivacyRoute.ts` | `browserPrivacy` is the only exported shape and asserts `sendsContent: false` unconditionally | **DONE 29 Aug 2026.** Replaced by a per-route `routePrivacy` record with `browser` and `server` members. `browserPrivacy` is kept as a deprecated alias for the browser member so existing imports compile. |
| `src/data/content-integrity.ts:38` | "What does the browser checker store?" / "Nothing is stored." | **DONE 29 Aug 2026.** Opener now "No draft is kept.", followed by the per-route answer. The hub heading "Nothing is stored" became "Your text is never stored". |
| `integrity-controller.ts:504` | Exported receipt records `allowed_routes: ["browser"]` on every run | **DONE 29 Aug 2026.** The run records the route it used and the receipt reports it. The frozen receipt contract has no `server` member, so the EU route is recorded as `hub_provider`, and `policy.id` is `opace-eu-server` rather than `browser-local`. |
| `IntegrityHero.astro:25` | Privacy hero variant: "Content stays local" | Qualify or scope to the tools where it is true. |

### 7.2 Claims that are accurate and should not be changed

Recorded so a well-meaning correction does not make things worse.

- **The WordPress plugin's external-services disclosure** — "The plugin does not contact Opace,
  Anthropic, an AI provider, a detector vendor or any other external service." True. The plugin has
  no server route.
- **The Chrome extension's data-use disclosures**, including `external_services: false` and
  "Remote service or provider calls: None". True for the extension. **These must not be reused for
  the checker**, which does call an external service.
- **The watermark lab, C2PA provenance and npm package claims.** All accurate; none has a server
  route.
- **"The analytics event carries no text, file or result content."** Verified by reading the
  allowlist. Accurate.

### 7.3 Two smaller inconsistencies worth fixing while the copy is open

- **Two different privacy-notice URLs ship in parallel artefacts**: `https://opace.agency/privacy-policy/`
  in the current WordPress readme and Chrome bundle, and
  `https://opace.agency/tools/ai/content-integrity/privacy/` in
  `dist/wordpress-submission-prep-1.0.4/`. Pick one, and make sure it resolves.
- **"by default" appears as a hedge in six places** in shipped and near-shipped copy, including
  `README.md:643` and the Chrome privacy practices. The project's own drafting rule
  (`SERVER-INFERENCE-PLAN.md:693`) forbids it, on the correct reasoning that it implies a
  non-default in which retention happens. Either the qualifier is doing real work, in which case
  say what the non-default is, or it should go.

---

## 8. Decisions only the owner can take

These block publication. They are repeated at the top of the report so they can be answered in one
pass.

1. ~~**Fix the request log, or disclose it?**~~ **Resolved 29 August 2026.** The exclusion was
   working for the detector all along; the fault was that it did not cover the second Cloud Run
   service, and that a re-deploy could not update it. Both fixed and verified against fresh
   traffic. §6.1 now carries the single accurate retention paragraph.
2. **The 89 request-log entries written before the exclusion took effect.** Delete them now, or let
   them age out on 28 September 2026? They hold no member-of-the-public IP address: 74 detector
   entries carry one development-machine address, and 15 killswitch entries carry Google's own
   Pub/Sub infrastructure addresses. Ageing out is defensible on that basis. Deleting them early is
   one command and is not reversible:
   `gcloud logging logs delete run.googleapis.com%2Frequests --project opace-ai-detector`
3. **Name Google Cloud publicly as a processor?** The tool page already does. The privacy policy
   does not, and the Chrome and WordPress listings say the opposite about their own surfaces. The
   recommendation is to name it: it is already public in the repository, and being caught not
   naming it is worse than naming it.
4. **DPO and data protection contact.** The privacy policy gives a postal "Data Protection Officer"
   address with no name and no email. Is a DPO appointed? If so, their advice on the DPIA is
   required by Article 35(2). If not, record that as a decision with reasons, and give a working
   contact address.
5. **Retention period for server records** — 30 days is the platform default and is what the draft
   states. Confirm, or set a shorter one.
6. ~~**Site-wide analytics consent.**~~ **Decided, 29 August 2026 — owner.** Not gated, on the
   tool pages or site-wide. A gate was applied to the tool pages that day and reverted the same
   day on the owner's instruction. GA4 and HubSpot load on first interaction everywhere, no
   on-page consent mechanism exists, and no stored preference suppresses them. The owner's
   recorded reason is that analytics data is essential to the business and that visitors should
   use their browser's controls. The residual PECR exposure is recorded at §5 and at Risk 7 of the
   DPIA. The privacy policy correction noted in §5 was made on 29 August 2026 and no action
   remains under this decision.
7. **Legal review.** Who reviews this, and by when.
8. **Review date and sign-off** for the DPIA.
9. **Whether to publish the DPIA**, as the ICO recommends, in place of the user consultation that
   was not carried out.

---

## 9. Sources

ICO guidance, fetched 29 August 2026:

- [How do we apply legitimate interests in practice?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/) — the three-part test, the LIA process, reasonable expectations, impact and safeguards, and the relationship between an LIA and a DPIA.
- [A brief guide to international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-transfers-a-guide/) — the three-step restricted-transfer test and the transfer mechanisms.
- [Adequacy regulations](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/adequacy-regulations/) — EEA states hold full UK adequacy.
- [Data Protection Impact Assessments](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/) and its subpages, cited in full in `DPIA.md`.

Google documentation, fetched 29 August 2026: [Cloud Run
logging](https://docs.cloud.google.com/run/docs/logging), [Cloud Logging
quotas](https://docs.cloud.google.com/logging/quotas), [LogEntry
HttpRequest](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#HttpRequest),
[Cloud Monitoring quotas](https://docs.cloud.google.com/monitoring/quotas), [Cloud Data Processing
Addendum](https://cloud.google.com/terms/data-processing-addendum/).

Recital 49 (network and information security as a legitimate interest) and Recital 30 (online
identifiers including IP addresses) are cited from the UK GDPR text as retained in UK law.
