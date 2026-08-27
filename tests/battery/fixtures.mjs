// Shared verbatim fixtures for the adversarial battery (v0.1-REVIEW.md §3 and §6).
// Fixtures C, D and E are byte-identical to the review's head-to-head fixtures.
// The article excerpt reproduces the owner's GPT-5.6 article test (v0.1-REVIEW §3,
// PAID-TOOLS.md) as reconstructed for the review's article-test script.

export const CORE_DIST = new URL("../../packages/core/dist/index.js", import.meta.url).pathname;
export const CORE_BUNDLE = new URL("../../packages/core/dist/bundle.js", import.meta.url).pathname;
export const WEBSITE_BUNDLE =
  "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/node_modules/@opace/content-integrity-core/dist/bundle.js";

// Fixture C — classic 2023-era AI clichés (verbatim, v0.1-REVIEW §3 fixture C).
export const FIXTURE_C =
  "In today's rapidly evolving landscape, businesses must delve into digital transformation. " +
  "It is important to note that this is a game-changer. Moreover, the benefits are substantial. " +
  "Furthermore, adoption continues to accelerate. Additionally, costs keep falling. " +
  "It is important to remember the risks. It is important to plan carefully. In conclusion, act now.";

// Fixture D — current-generation AI slop (verbatim, v0.1-REVIEW §3 fixture D).
export const FIXTURE_D =
  "Great question! Let's unpack what makes this framework so powerful. " +
  "This isn't just an update — it's a fundamental rethink of how teams operate. " +
  "The platform boasts robust integrations, seamless onboarding, and enhanced security. " +
  "Whether you're a startup founder, an enterprise architect, or a curious developer, there's something here for you. " +
  "The results stand as a testament to the team's dedication. " +
  "As of my last update, pricing details may have changed. " +
  "In the ever-changing world of software, staying ahead isn't optional — it's essential.";

// Fixture E — verified-human control (verbatim, v0.1-REVIEW §3 fixture E).
export const FIXTURE_E =
  "We moved the printer to the back office on Tuesday because the hallway socket kept tripping. " +
  "Dave from accounts complained, obviously. The replacement toner arrives Thursday; until then use the one upstairs. " +
  "If the tray jams again, ring Sharon on extension 42 rather than forcing it.";

// The v0.1-REVIEW fixture-B carrier list: the classic watermark carriers v0.1 missed.
// [code point, short label]. Every one must now be detected in a plain-text context.
export const FIXTURE_B_CARRIERS = [
  [0x200c, "ZWNJ"],
  [0x200d, "ZWJ"],
  [0x202f, "NNBSP"],
  [0x200a, "HAIR SPACE"],
  [0xe0041, "TAG LATIN CAPITAL LETTER A"],
  [0xe0042, "TAG LATIN CAPITAL LETTER B"],
  [0xfe0f, "VS16"],
  [0x034f, "CGJ"],
  [0x180e, "MONGOLIAN VOWEL SEPARATOR"],
];

// A single line carrying every fixture-B carrier, for the cross-surface run.
export const CARRIER_LINE =
  "Watermark" +
  FIXTURE_B_CARRIERS.map(([cp]) => String.fromCodePoint(cp)).join("carriers") +
  "hide between these words in an otherwise ordinary English sentence.";

// Dense audit fact text (verbatim, v0.1-REVIEW §3 check 4 test input).
export const FACT_TEXT =
  'Dr Sarah Chen of Opace Ltd reported revenue of £1.2 million on 14 March 2026, a rise of 8.5%. ' +
  'See https://opace.agency/report and email sarah.chen@opace.co.uk. ' +
  '"Quality is not negotiable," she said (Chen et al., 2025). ' +
  'Run `npm install @opace/core` at 09:30 GMT. The fee is $400 or 350 EUR per 10 kg.';

// The 12 protected-span kinds the extractor must produce from FACT_TEXT.
export const EXPECTED_PROTECTED_KINDS = [
  "citation", "code", "currency", "date", "email", "name",
  "number", "organisation", "quote", "time", "unit", "url",
];

// Excerpt of the owner's 2,913-word GPT-5.6 UK eCommerce cost article (the text
// Copyleaks and Originality both score 100% AI — PAID-TOOLS.md; v0.1 scored it
// "pass"). Verbatim from the review session's article-test reconstruction.
// This is the known-hard case: clean, well-prompted AI prose with few surface
// tells. The battery PRINTS the engine's current score and classification for
// it without asserting a pass or fail — honest detection of this class awaits
// the Tier C trained model (BRIEF.md §21, v0.1-REVIEW §8.4).
export const ARTICLE_EXCERPT = `The cost of a UK eCommerce website ranges from a self-build with no supplier labour invoice to a professionally planned eCommerce store costing tens of thousands of pounds. Our current cost model allows 34-87 person-days for an online store with up to 250 products, before extra design, content, migration or integration work. At the model's UK rate allowances, the base scope produces an indicative build range of about £15,000-£43,900 for a freelance web developer, £22,500-£70,400 for a specialist agency or £29,000-£92,500 for a larger multidisciplinary agency, excluding VAT.

Those figures are calculator outputs, not UK market averages, Opace prices or a promise that every eCommerce website requires that budget. A small catalogue built from clean customer data and a standard theme can need less work. A B2B, subscription, multi-market or heavily integrated online store can require much more. Use the UK website cost calculator with the eCommerce route selected, then complete the platform, supplier, design, feature, content and support questions.

An eCommerce website quote should separate build work from trading charges. A low subscription price does not cover product preparation, custom design, implementation, testing or business-system connections, while a development quote may exclude card fees, apps, hosting or support.

An eCommerce website cost depends partly on the platform's commercial model. Shopify is a hosted eCommerce platform that combines software and commerce features in a subscription, with plan-specific payment and staff terms. WooCommerce is an open-source eCommerce platform for WordPress, while web hosting, extensions, implementation and support are obtained separately.`;

// Deterministic inspect() options and request builder shared by the suites.
export const FIXED_NOW = "2026-08-27T12:00:00.000Z";
export const detOptions = () => ({ now: () => FIXED_NOW, analysisId: () => "analysis_battery_fixed" });
export const buildRequest = (requestId, content, checks = ["unicode.invisible", "unicode.homoglyph", "style.patterns"]) => ({
  schema_version: "1.0",
  contract_version: "1.0.0",
  request_id: requestId,
  source: { content, content_type: "text/plain", language: "en" },
  checks,
});
