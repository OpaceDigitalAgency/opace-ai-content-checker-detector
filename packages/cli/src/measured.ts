/**
 * "What the model measured", for the CLI's printable report and its terminal summary.
 *
 * Lane D3 §4 added this block to the on-screen renderer in `shared/presentation/**`. The printable
 * report in `shared/report/checker-report-html.mjs`, which the CLI renders for a canonical result,
 * received only the hero-legend change; it has no meter block and no hook to add one. That file is
 * Lane D2's and is frozen here, so the CLI adds its own block rather than editing another lane's
 * renderer or splicing markup into the middle of its output.
 *
 * The block is therefore appended as one further numbered part of the report, after the parts the
 * shared builder drew, with every meter, reference median, AUROC and caveat sentence taken from
 * `src/signals.ts` — a documented mirror of the shared module. Nothing is estimated, and nothing
 * here sets or moves a level.
 */

import {escapeHtml, levelLabel} from "./report.js";
import {explainSectionSignals, measureSectionSignals, type SignalMeter} from "./signals.js";

export interface MeasuredSection {
  number: number;
  total: number;
  level: unknown;
  meters: SignalMeter[];
  why: string;
}

/**
 * The measured signals for every section that carried a passage long enough to read honestly.
 * A section whose passage is missing or too short contributes no meters and is left out, rather
 * than being drawn with an invented number.
 */
export function measuredSections(result: any): MeasuredSection[] {
  const sections: any[] = Array.isArray(result?.sections) ? result.sections : [];
  const out: MeasuredSection[] = [];
  sections.forEach((section, position) => {
    const meters = measureSectionSignals(section?.passage);
    if (!meters.length) return;
    out.push({
      number: position + 1,
      total: sections.length,
      level: section?.level,
      meters,
      why: explainSectionSignals(meters, section?.level, levelLabel(section?.level)),
    });
  });
  return out;
}

/* ------------------------------------------------------------------- markup */

/**
 * One meter drawn as a scale with the two reference medians marked and this passage's own value
 * marked. Positions are clamped a little inside the ends so a marker at either extreme keeps its
 * label on the page; the printed number is always the measured one. The scale itself is hidden
 * from assistive technology and the same reading is given in words underneath.
 */
function meterHtml(meter: SignalMeter): string {
  const span = meter.scaleMax - meter.scaleMin || 1;
  const clamp = (value: number): number => Math.min(97, Math.max(3, ((value - meter.scaleMin) / span) * 100));
  const anchor = (position: number): string => (position < 25 ? "start" : position > 75 ? "end" : "middle");
  // Each mark carries a full label and a short one. The short label is what a narrow page shows:
  // an unlabelled scale with a dot on it says nothing, so the labels shorten rather than disappear.
  const mark = (kind: string, position: number, label: string, brief: string): string => {
    const left = clamp(position);
    return `<span class="oaci-measure-mark" data-kind="${kind}" data-anchor="${anchor(left)}" style="left:${left.toFixed(2)}%"><i></i>`
      + `<small class="oaci-measure-full">${escapeHtml(label)}</small>`
      + `<small class="oaci-measure-brief">${escapeHtml(brief)}</small></span>`;
  };
  const marks: string[] = [];
  if (meter.aiMedian !== null) marks.push(mark("machine", meter.aiMedian, `typical AI ~${meter.aiMedian}${meter.unit}`, `AI ~${meter.aiMedian}${meter.unit}`));
  if (meter.humanMedian !== null) marks.push(mark("human", meter.humanMedian, `typical human ~${meter.humanMedian}${meter.unit}`, `human ~${meter.humanMedian}${meter.unit}`));
  marks.push(mark("this", meter.value, `this passage ${meter.value}${meter.unit}`, `this ${meter.value}${meter.unit}`));
  const direction = meter.aiMedian === null || meter.humanMedian === null
    ? "none"
    : meter.aiMedian > meter.humanMedian ? "ai-high" : "ai-low";
  const spoken = meter.aiMedian === null || meter.humanMedian === null
    ? `${meter.label}: this passage ${meter.value}${meter.unit}, with no typical AI or typical human marker, because none was measured.`
    : `${meter.label}: this passage ${meter.value}${meter.unit}, typical AI about ${meter.aiMedian}${meter.unit}, typical human about ${meter.humanMedian}${meter.unit}.`;
  return `<div class="oaci-measure" data-oaci-signal="${escapeHtml(meter.id)}"${meter.informative === false ? ' data-oaci-informative="false"' : ""}>`
    + `<b class="oaci-measure-label">${escapeHtml(meter.label)}</b>`
    + `<div class="oaci-measure-scale" data-direction="${direction}" aria-hidden="true">${marks.join("")}</div>`
    + `<p class="oaci-measure-spoken">${escapeHtml(spoken)}</p>`
    + `<p class="oaci-measure-note">${escapeHtml(meter.note)}</p>`
    // The evenness basis already quotes its own AUROC, so it is not stated twice.
    + `<p class="oaci-measure-basis">${escapeHtml(`Reference: ${meter.basis}.${meter.basis.includes("AUROC") ? "" : ` AUROC ${meter.auroc}.`}`)}</p>`
    + `</div>`;
}

/**
 * The complete part, or an empty string where no section carried a passage long enough to
 * measure. `number` is the part number it takes in the report it is appended to.
 */
export function measuredPartHtml(result: any, number: string): string {
  const measured = measuredSections(result);
  if (!measured.length) return "";
  const blocks = measured.map(section => `<article class="oaci-measured" data-oaci-measured="${section.meters.length}">
        <h3>Section ${section.number} of ${section.total} — ${escapeHtml(levelLabel(section.level))}</h3>
        ${section.meters.map(meterHtml).join("")}
        <div class="oaci-measured-why"><b>Why it reads this way</b><p>${escapeHtml(section.why)}</p></div>
      </article>`).join("");
  return `<section class="oaci-part" aria-labelledby="oaci-part-measured">
      <p class="oaci-part-number">${escapeHtml(number)}</p>
      <h2 id="oaci-part-measured">What the model measured</h2>
      <p class="oaci-part-intro">Signals we can measure on each scored passage, each against the point where AI writing and human writing typically sit. Those reference points were measured over whole long-form documents, so read them as context for one passage rather than as a verdict on it. None of them set the reading: the model reads the passage whole.</p>
      ${blocks}
    </section>`;
}

/**
 * The stylesheet for the block. Appended to the shared report's own `<style>` so the report stays
 * one self-contained document with no second stylesheet and no request of any kind. Every rule is
 * new; nothing here overrides a shared one.
 */
export const MEASURED_CSS = `
.oaci-measured{border:1px solid var(--oaci-line);border-radius:12px;padding:14px 16px;margin:12px 0;background:var(--oaci-card)}
.oaci-measured h3{margin:0 0 6px;font-size:15px}
.oaci-measure{margin:14px 0 0}
.oaci-measure-label{display:block;font-size:13px}
.oaci-measure-scale{position:relative;height:84px;margin:10px 0 0;border-radius:6px;background:linear-gradient(90deg,#e8e2d8,#d8d0c4)}
.oaci-measure-scale[data-direction=ai-low]{background:linear-gradient(90deg,#f0ded6,#dfe8e2)}
.oaci-measure-scale[data-direction=ai-high]{background:linear-gradient(90deg,#dfe8e2,#f0ded6)}
.oaci-measure-mark{position:absolute;top:0;height:18px;transform:translateX(-50%)}
.oaci-measure-mark i{display:block;width:2px;height:18px;margin:0 auto;background:#4a4a4a}
.oaci-measure-mark[data-kind=this] i{width:3px;height:24px;background:#0f1115}
.oaci-measure-mark small{position:absolute;top:22px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;color:var(--oaci-ink)}
.oaci-measure-mark[data-anchor=start] small{left:0;transform:none}
.oaci-measure-mark[data-anchor=end] small{left:auto;right:0;transform:none}
/* Every mark's label gets its own line. Two values on one scale can land within a few thousandths
   of each other — a passage's vocabulary variety against the typical-AI median, say — and side by
   side the labels would print on top of one another at some width. Three fixed rows cannot. */
.oaci-measure-mark[data-kind=human] small{top:42px}
.oaci-measure-mark[data-kind=this] small{top:62px;color:var(--oaci-ink);font-weight:700}
.oaci-measure-spoken{font-size:12px;color:var(--oaci-muted)}
.oaci-measure-note{font-size:13px}
.oaci-measure-basis{font-size:12px;color:var(--oaci-muted)}
.oaci-measured-why{margin-top:12px;padding-top:10px;border-top:1px solid var(--oaci-line)}
.oaci-measured-why p{margin:4px 0 0;font-size:13px}
.oaci-measure-brief{display:none}
@media (max-width:640px){.oaci-measure-full{display:none}.oaci-measure-brief{display:block}}
@media print{.oaci-measured{break-inside:avoid}}
`;

/**
 * The same block in words, for the terminal. One line per meter, then the closing sentence, so a
 * reader who never opens the HTML still gets the measured signals and the caveat that travels
 * with them.
 */
export function measuredText(result: any, wrap: (label: string, text: string, indent?: number) => string): string {
  const measured = measuredSections(result);
  if (!measured.length) return "";
  const blocks = measured.map(section => {
    const rows = section.meters.map(meter => {
      const reference = meter.aiMedian === null || meter.humanMedian === null
        ? `no typical-AI or typical-human marker, because none was measured (AUROC ${meter.auroc} against 0.500 for chance)`
        : `typical AI about ${meter.aiMedian}${meter.unit}, typical human about ${meter.humanMedian}${meter.unit} (AUROC ${meter.auroc})`;
      return wrap("    • ", `${meter.label}: this passage ${meter.value}${meter.unit}; ${reference}.`, 6);
    });
    return [`  Section ${section.number} of ${section.total} — ${levelLabel(section.level)}`, ...rows, wrap("    ", section.why, 4)].join("\n");
  });
  return `\nWhat the model measured\n${wrap("  ", "Signals measured on each scored passage, against the point where AI writing and human writing typically sit. Those reference points were measured over whole long-form documents, so read them as context rather than a verdict. None of them set the reading.", 2)}\n${blocks.join("\n")}\n`;
}
