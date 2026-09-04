/**
 * The toolbar's visual language.
 *
 * The panel is styled to match the Opace checker on the website and the
 * WordPress Lab: a warm paper canvas, raised white panels, the Opace orange
 * accent, the five named bands and the Outfit / Plus Jakarta Sans pairing. The
 * two font subsets are bundled as data URLs, so the toolbar never touches the
 * network for typography and works offline; both faces are SIL Open Font
 * License 1.1 and are recorded in THIRD_PARTY_NOTICES.md.
 *
 * Font faces declared inside a shadow root are ignored by Chromium, and the dev
 * toolbar hands every app a shadow root. The faces are therefore registered on
 * the host document through the FontFace API under namespaced family names, so
 * they resolve inside the panel without changing a single rule on the page the
 * developer is checking.
 *
 * Every token below mirrors, name for name and value for value, the token the
 * shared result stylesheet defines on its own root class — surface, ink, line,
 * spacing scale, radii and the three elevation steps, in both light and dark.
 * The shell the toolbar draws and the reading the shared component draws
 * therefore sit on one scale and flip to dark together.
 */
import outfitWoff2 from '../assets/fonts/outfit-variable.woff2';
import jakartaWoff2 from '../assets/fonts/plus-jakarta-sans-latin.woff2';

export const DISPLAY_FAMILY = 'Opace Outfit';
export const TEXT_FAMILY = 'Opace Jakarta';

let registration: Promise<void> | undefined;

/** Register the two bundled faces on the host document exactly once. */
export function registerToolbarFonts(): Promise<void> {
  if (registration) return registration;
  registration = (async () => {
    if (typeof FontFace !== 'function' || !document.fonts) return;
    const faces = [
      new FontFace(DISPLAY_FAMILY, `url(${outfitWoff2}) format('woff2')`, { weight: '100 900', display: 'swap' }),
      new FontFace(TEXT_FAMILY, `url(${jakartaWoff2}) format('woff2')`, { weight: '200 800', display: 'swap' }),
    ];
    await Promise.all(faces.map(async (face) => {
      try {
        await face.load();
        document.fonts.add(face);
      } catch {
        // A refused data URL only costs the panel its bespoke typography.
      }
    }));
  })();
  return registration;
}

const DISPLAY_STACK = `"${DISPLAY_FAMILY}",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif`;
const TEXT_STACK = `"${TEXT_FAMILY}",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif`;

/** The dark palette, written once and applied by both the media query and the explicit attribute. */
const DARK_TOKENS = `
  --paper:#14171a;--white:#1c2126;--inset:#242a30;--soft:#21262b;
  --ink:#f2efe9;--ink-soft:#cbd2d3;--muted:#a8b0b1;
  --line:#39424a;--line-soft:#2e363d;--line-strong:#55606a;
  --orange-text:#ffa76b;--orange-wash:#2b1d14;--orange-edge:#5a3418;
  --blue:#6fb6ec;--blue-soft:#16303f;--blue-ink:#a8d5f7;
  --green:#6fd6a2;--green-soft:#10382a;
  --amber:#f0bb5c;--amber-soft:#3d2f12;--amber-edge:#5b4718;
  --red:#ff9083;--red-soft:#451a17;
  --neutral-soft:#2c3238;
  --band-human:#6fd6a2;--band-unclear:#b8bfbc;--band-potential:#f0bb5c;--band-likely:#ff9f68;--band-strong:#ff9083;
  --elev-1:0 1px 3px rgb(0 0 0 / 40%);
  --elev-2:0 6px 18px rgb(0 0 0 / 44%);
  --elev-3:0 18px 44px rgb(0 0 0 / 50%);
  --lift:rgb(255 255 255 / 6%);
  --panel-shadow:0 32px 80px -18px rgb(0 0 0 / 70%),0 12px 30px -12px rgb(0 0 0 / 60%),0 0 0 1px rgb(255 255 255 / 8%);
  color-scheme:dark;
`;

/**
 * The handful of rules a token swap cannot carry: an active tab reverses to
 * light ink on a light pill, and raised surfaces gain the faint top edge that
 * reads as depth on a dark ground.
 */
const darkRules = (scope: string): string => `
${scope} .oacit-rail button[aria-selected=true]{color:#12161a;background:#f2efe9;box-shadow:0 2px 8px rgb(0 0 0 / 50%)}
${scope} .oacit-rail button:hover:not([aria-selected=true]){background:rgb(255 255 255 / 8%)}
${scope} .oacit-mast img{box-shadow:0 4px 14px rgb(0 0 0 / 50%),0 0 0 1px rgb(255 255 255 / 12%)}
${scope} .oacit-card,${scope} .oacit-exports{box-shadow:inset 0 1px 0 var(--lift),var(--elev-2)}
${scope} .oacit-route,${scope} .oacit-facts li,${scope} .oacit-status{box-shadow:inset 0 1px 0 var(--lift),var(--elev-1)}
${scope} .oacit-spinner{border-color:rgb(111 182 236 / 28%);border-top-color:var(--blue)}
`;

/** Panel chrome, tab rail, forms and every non-result state. */
export const TOOLBAR_CSS = `
:host{color-scheme:light dark}
.oacit{
  --ink:#0f1115;--paper:#f2ede6;--white:#fff;--inset:#e9e2d8;--soft:#f6f2eb;
  --ink-soft:#3d4344;--muted:#565d5e;
  --line:#d9d0c5;--line-soft:#e7e0d6;--line-strong:#b9ae9f;
  --orange:#fb700a;--orange-deep:#a9470a;--orange-press:#8f3c08;--orange-text:#8b3f0b;--orange-wash:#fdf1e7;--orange-edge:#f0cdae;
  --blue:#0068b3;--blue-soft:#e9f3fb;--blue-ink:#0b3a56;
  --green:#185c3b;--green-soft:#e2f1e8;
  --amber:#8b5608;--amber-soft:#fdf4e5;--amber-edge:#eed7ad;
  --red:#96271a;--red-soft:#fbeeec;
  --neutral-soft:#eee8de;
  --band-human:#1c6e46;--band-unclear:#5c6360;--band-potential:#8a5a00;--band-likely:#a84a08;--band-strong:#96261b;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;
  --radius-lg:16px;--radius:14px;--radius-sm:10px;--radius-pill:999px;
  --elev-1:0 1px 3px rgb(16 20 22 / 6%);
  --elev-2:0 6px 18px rgb(15 17 21 / 6%);
  --elev-3:0 18px 44px rgb(15 17 21 / 8%);
  --lift:rgb(255 255 255 / 70%);
  --panel-shadow:0 32px 80px -18px rgb(15 17 21 / 34%),0 12px 30px -12px rgb(15 17 21 / 22%),0 0 0 1px rgb(15 17 21 / 8%);
  --display:${DISPLAY_STACK};--text:${TEXT_STACK};
  box-sizing:border-box;width:min(520px,calc(100vw - 24px));max-height:min(78vh,820px);overflow:auto;overscroll-behavior:contain;
  border-radius:18px;background:var(--paper);color:var(--ink);
  box-shadow:var(--panel-shadow);font:400 14px/1.6 var(--text);-webkit-font-smoothing:antialiased;
}
@media(prefers-color-scheme:dark){
  .oacit:not([data-theme=light]){${DARK_TOKENS}}
  ${darkRules('.oacit:not([data-theme=light])')}
}
.oacit[data-theme=dark]{${DARK_TOKENS}}
${darkRules('.oacit[data-theme=dark]')}
.oacit *{box-sizing:border-box}
.oacit[hidden]{display:none}
.oacit ::selection{background:rgb(251 112 10 / 22%)}
.oacit :focus-visible{outline:3px solid var(--blue);outline-offset:2px;border-radius:8px}

/* Masthead and tab rail ---------------------------------------------------- */
.oacit-head{position:sticky;top:0;z-index:3;padding:0 0 var(--space-3);background:var(--white)}
.oacit-head::after{content:"";position:absolute;right:0;bottom:0;left:0;height:2px;background:linear-gradient(90deg,var(--orange) 0,#f39c3d 36%,rgb(251 112 10 / 0) 82%)}
.oacit-mast{display:flex;gap:var(--space-3);align-items:center;padding:var(--space-5) var(--space-5) var(--space-4)}
.oacit-mast img{flex:0 0 auto;width:46px;height:46px;border-radius:13px;object-fit:contain;background:#101416;box-shadow:0 4px 12px rgb(15 17 21 / 20%),0 0 0 1px rgb(15 17 21 / 10%)}
.oacit-mast div{min-width:0}
.oacit-brand{margin:0;font:700 1.12rem/1.15 var(--display);letter-spacing:-.025em;color:var(--ink)}
.oacit-promise{margin:var(--space-1) 0 0;color:var(--muted);font-size:.79rem;line-height:1.45}
.oacit-rail{display:flex;flex-wrap:wrap;gap:var(--space-1);margin:0 var(--space-5);padding:var(--space-1);background:var(--inset);border-radius:var(--radius);box-shadow:inset 0 1px 2px rgb(15 17 21 / 7%)}
.oacit-rail button{flex:1 1 auto;min-height:34px;padding:0 9px;color:var(--ink-soft);background:transparent;border:0;border-radius:11px;font:700 .765rem/1 var(--text);letter-spacing:-.008em;white-space:nowrap;cursor:pointer;transition:background-color .16s ease,color .16s ease,box-shadow .16s ease}
.oacit-rail button:hover{color:var(--ink);background:var(--lift)}
.oacit-rail button[aria-selected=true]{color:#fff;background:#12161a;box-shadow:0 2px 6px rgb(15 17 21 / 26%)}

/* Body -------------------------------------------------------------------- */
.oacit-body{padding:var(--space-6) var(--space-5) var(--space-7);background:var(--paper)}
.oacit-body>h2{margin:0 0 var(--space-2);font:700 1.5rem/1.12 var(--display);letter-spacing:-.032em;color:var(--ink)}
.oacit-body>p{margin:0 0 var(--space-5);max-width:56ch;color:var(--muted);font-size:.895rem;line-height:1.6}
.oacit-card{padding:var(--space-4);margin:0 0 var(--space-4);background:var(--white);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--elev-2)}
.oacit-card>h4{margin:0 0 var(--space-2);font:700 .96rem/1.25 var(--display);color:var(--ink)}
.oacit-card>p{margin:0 0 var(--space-2);color:var(--ink-soft);font-size:.855rem;line-height:1.62}
.oacit-card>p:last-child{margin-bottom:0}
.oacit-card--spaced{margin-top:var(--space-4)}
.oacit .oacit-legend{display:flex;gap:var(--space-2);align-items:center;margin:0 0 var(--space-2);padding:0;color:var(--orange-text);font-size:.685rem;font-weight:800;letter-spacing:.1em;line-height:1.4;text-transform:uppercase}
.oacit .oacit-legend::before{content:"";flex:0 0 auto;width:14px;height:2px;background:var(--orange);border-radius:2px}

/* Route chooser ----------------------------------------------------------- */
.oacit-routes{display:grid;gap:var(--space-3);margin:0 0 var(--space-3);padding:0;border:0}
.oacit-route{position:relative;display:grid;grid-template-columns:auto 1fr;gap:var(--space-2) var(--space-3);padding:var(--space-4) var(--space-4) var(--space-4) var(--space-5);overflow:hidden;background:var(--white);border:1.5px solid var(--line-soft);border-radius:var(--radius);box-shadow:var(--elev-1);cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease,transform .16s ease}
.oacit-route::before{content:"";position:absolute;top:0;bottom:0;left:0;width:4px;background:var(--line-strong);transition:background-color .16s ease}
.oacit-route[data-accent=device]::before{background:var(--green)}
.oacit-route[data-accent=quick]::before{background:var(--blue)}
.oacit-route:hover{border-color:var(--line-strong);box-shadow:var(--elev-2);transform:translateY(-1px)}
.oacit-route input{grid-row:1/4;align-self:start;width:18px;height:18px;margin:2px 0 0;accent-color:var(--orange)}
.oacit-route:has(input:checked){background:var(--orange-wash);border-color:var(--orange);box-shadow:0 0 0 3px rgb(251 112 10 / 16%),var(--elev-2)}
.oacit-route:has(input:checked)::before{background:var(--orange)}
.oacit-tags{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-2);grid-column:2;align-items:center}
.oacit-tag{display:inline-flex;padding:3px 9px;color:var(--muted);background:var(--neutral-soft);border-radius:var(--radius-pill);font-size:.635rem;font-weight:800;letter-spacing:.055em;line-height:1.5;text-transform:uppercase;white-space:nowrap}
.oacit-tag[data-tone=good]{color:var(--green);background:var(--green-soft)}
.oacit-tag[data-tone=info]{color:var(--blue);background:var(--blue-soft)}
.oacit-route b{grid-column:2;font:700 .955rem/1.3 var(--text);color:var(--ink)}
.oacit-route-note{grid-column:2;color:var(--muted);font-size:.82rem;line-height:1.55}
.oacit-body>.oacit-elsewhere{display:block;margin:0 0 var(--space-4);color:var(--muted);font-size:.79rem;line-height:1.6}

/* The one-off download, described beside the button that would start it ---- */
.oacit-run-meta{display:flex;flex-wrap:wrap;gap:0 var(--space-1);align-items:center;margin:0;padding:0 var(--space-1);color:var(--orange-text);font-size:.785rem;font-weight:800;line-height:1.4}
.oacit-run-meta code{font:700 .745rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
.oacit-body>.oacit-model-note{padding:var(--space-3) var(--space-4);margin:var(--space-3) 0 0;background:var(--orange-wash);border:1.5px solid var(--orange-edge);border-radius:var(--radius);color:var(--ink-soft);font-size:.8rem;line-height:1.6}
.oacit-model-note code{font:700 .765rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
.oacit-run-meta[hidden],.oacit-body>.oacit-model-note[hidden]{display:none}

/* Actions and status ------------------------------------------------------ */
.oacit-actions{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;margin:var(--space-5) 0 0}
.oacit-actions button{min-height:44px;padding:0 var(--space-4);color:var(--ink-soft);background:var(--white);border:1.5px solid var(--line-strong);border-radius:12px;box-shadow:var(--elev-1);font:700 .855rem/1 var(--text);cursor:pointer;transition:border-color .16s ease,background-color .16s ease,box-shadow .16s ease,transform .16s ease}
.oacit-actions button:hover:not(:disabled){color:var(--ink);border-color:var(--ink-soft);box-shadow:var(--elev-2);transform:translateY(-1px)}
.oacit-actions button:active:not(:disabled){transform:translateY(0)}
.oacit-actions .oacit-primary{color:#fff;background:var(--orange-deep);border-color:var(--orange-press);box-shadow:inset 0 1px 0 rgb(255 255 255 / 22%),0 2px 4px rgb(15 17 21 / 14%),0 10px 22px -8px rgb(169 71 10 / 60%)}
.oacit-actions .oacit-primary:hover:not(:disabled){color:#fff;background:var(--orange-press);border-color:var(--orange-press);box-shadow:inset 0 1px 0 rgb(255 255 255 / 24%),0 4px 8px rgb(15 17 21 / 16%),0 16px 30px -10px rgb(169 71 10 / 66%);transform:translateY(-1px)}
.oacit-actions button:disabled,.oacit-actions .oacit-primary:disabled{color:var(--muted);background:var(--inset);border-color:var(--line);box-shadow:none;cursor:not-allowed}
.oacit-status{display:flex;gap:var(--space-3);align-items:flex-start;min-height:24px;margin:var(--space-4) 0 0;padding:var(--space-3) var(--space-4);background:var(--white);border:1px solid var(--line);border-left:3px solid var(--line-strong);border-radius:var(--radius);box-shadow:var(--elev-1);color:var(--ink-soft);font-size:.84rem;line-height:1.6}
.oacit-status[data-tone=idle]:has(>.oacit-status-text:empty){display:none}
.oacit-status[data-tone=working]{color:var(--blue-ink);background:var(--blue-soft);border-color:var(--line);border-left-color:var(--blue)}
.oacit-status[data-tone=done]{color:var(--green);background:var(--green-soft);border-color:var(--line);border-left-color:var(--green)}
.oacit-status[data-tone=refused]{color:var(--amber);background:var(--amber-soft);border-color:var(--line);border-left-color:var(--amber)}
.oacit-status[data-tone=error]{color:var(--red);background:var(--red-soft);border-color:var(--line);border-left-color:var(--red)}
.oacit-spinner{flex:0 0 auto;width:15px;height:15px;margin-top:3px;border:2px solid rgb(0 104 179 / 25%);border-top-color:var(--blue);border-radius:50%;animation:oacit-spin .9s linear infinite}
@keyframes oacit-spin{to{transform:rotate(360deg)}}
.oacit-progress{width:100%;height:8px;margin:var(--space-3) 0 0;overflow:hidden;background:var(--inset);border-radius:var(--radius-pill);box-shadow:inset 0 1px 2px rgb(15 17 21 / 12%)}
.oacit-progress i{display:block;height:100%;background:var(--orange);border-radius:var(--radius-pill);transition:width .25s ease}

/* Notices ----------------------------------------------------------------- */
.oacit-notice{display:grid;grid-template-columns:auto 1fr;gap:var(--space-3);padding:var(--space-4);margin:0 0 var(--space-4);color:var(--amber);background:var(--amber-soft);border:1.5px solid var(--amber-edge);border-radius:var(--radius);box-shadow:var(--elev-1);font-size:.84rem;line-height:1.6}
.oacit-notice-mark{display:grid;place-items:center;width:30px;height:30px;color:inherit;background:var(--white);border-radius:50%;box-shadow:var(--elev-1)}
.oacit-notice-mark svg{width:17px;height:17px}
.oacit-notice-body{min-width:0}
.oacit-notice strong{display:block;margin:0 0 var(--space-1);font:700 .93rem/1.3 var(--display)}
.oacit-notice p{margin:0}
.oacit-notice-out{display:inline-flex;gap:6px;align-items:center;min-height:34px;margin:var(--space-3) 0 0;padding:0 var(--space-3);color:inherit;background:var(--white);border:1.5px solid currentcolor;border-radius:var(--radius-pill);font:700 .79rem/1 var(--text);cursor:pointer;transition:box-shadow .16s ease,transform .16s ease}
.oacit-notice-out:hover{box-shadow:var(--elev-2);transform:translateY(-1px)}
.oacit-notice-out::after{content:"→";font-weight:700}
.oacit-notice--plain{color:var(--blue-ink);background:var(--blue-soft);border-color:var(--line)}

/* Fact list --------------------------------------------------------------- */
.oacit-facts{display:grid;gap:var(--space-3);margin:0;padding:0;list-style:none}
.oacit-facts li{display:grid;grid-template-columns:1fr auto;gap:var(--space-1) var(--space-3);align-items:center;padding:var(--space-4);background:var(--white);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--elev-1)}
.oacit-facts strong{grid-column:1;font:700 .9rem/1.35 var(--text);color:var(--ink)}
.oacit-chip{grid-column:2;grid-row:1;justify-self:end;display:inline-flex;padding:4px 10px;border-radius:var(--radius-pill);font-size:.655rem;font-weight:800;letter-spacing:.055em;line-height:1.5;text-transform:uppercase;white-space:nowrap}
.oacit-chip[data-tone=on]{color:var(--green);background:var(--green-soft)}
.oacit-chip[data-tone=off]{color:var(--muted);background:var(--neutral-soft)}
.oacit-chip[data-tone=held]{color:var(--amber);background:var(--amber-soft)}
.oacit-facts p{grid-column:1/3;margin:var(--space-1) 0 0;color:var(--muted);font-size:.815rem;line-height:1.6;overflow-wrap:anywhere}
.oacit-facts code{font:700 .77rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}

/* Figure tiles ------------------------------------------------------------ */
.oacit-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-3);margin:var(--space-4) 0 0;padding:0;list-style:none}
.oacit-stats li{padding:var(--space-3) var(--space-4);background:var(--soft);border:1px solid var(--line-soft);border-radius:var(--radius)}
.oacit-stats b{display:block;font:700 1.18rem/1.2 var(--display);letter-spacing:-.02em;color:var(--ink)}
.oacit-stats span{display:block;margin:var(--space-1) 0 0;color:var(--muted);font-size:.775rem;line-height:1.5}

/* Empty states ------------------------------------------------------------ */
.oacit-empty{display:grid;justify-items:center;gap:var(--space-2);padding:var(--space-7) var(--space-5);margin:var(--space-4) 0 0;text-align:center;background:var(--white);border:1.5px dashed var(--line);border-radius:var(--radius-lg)}
.oacit-empty[hidden]{display:none}
.oacit-empty-mark{display:grid;place-items:center;width:46px;height:46px;color:var(--blue);background:var(--blue-soft);border-radius:50%}
.oacit-empty-mark svg{width:23px;height:23px}
.oacit-empty b{font:700 1.02rem/1.3 var(--display);color:var(--ink)}
.oacit-empty span{max-width:40ch;color:var(--muted);font-size:.835rem;line-height:1.6}

/* Patch preview ----------------------------------------------------------- */
.oacit-patch{max-height:200px;overflow:auto;margin:var(--space-4) 0 0;padding:var(--space-4);background:#12161a;border:1px solid #2a3138;border-radius:var(--radius);box-shadow:inset 0 1px 3px rgb(0 0 0 / 40%);color:#e9e4dc;font:400 12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.oacit-patch[hidden]{display:none}

/* Result slot ------------------------------------------------------------- */
.oacit-result-slot:empty{display:none}
.oacit-result-slot{margin:var(--space-6) 0 0}
.oacit-exports{display:flex;flex-wrap:wrap;gap:var(--space-2);margin:var(--space-4) 0 0;padding:var(--space-4);background:var(--white);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--elev-2)}
.oacit-exports p{flex:1 0 100%;margin:0 0 var(--space-1);font:700 .93rem/1.3 var(--display);color:var(--ink)}
.oacit-exports small{flex:1 0 100%;margin:0 0 var(--space-2);color:var(--muted);font-size:.79rem;line-height:1.55}
.oacit-exports button{min-height:42px;padding:0 var(--space-4);color:var(--ink-soft);background:var(--soft);border:1.5px solid var(--line-strong);border-radius:12px;font:700 .83rem/1 var(--text);cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}
.oacit-exports button:hover{color:var(--ink);border-color:var(--ink-soft);box-shadow:var(--elev-2);transform:translateY(-1px)}

/* Narrow viewports -------------------------------------------------------- */
@media(max-width:430px){
  .oacit{width:calc(100vw - 16px);border-radius:15px}
  .oacit-mast{padding:var(--space-4) var(--space-4) var(--space-3)}
  .oacit-mast img{width:40px;height:40px;border-radius:11px}
  .oacit-brand{font-size:1.02rem}
  .oacit-rail{margin:0 var(--space-4)}
  .oacit-body{padding:var(--space-5) var(--space-4) var(--space-6)}
  .oacit-body>h2{font-size:1.32rem}
  .oacit-actions{display:grid}
  .oacit-actions button,.oacit-exports button{width:100%}
  .oacit-run-meta{justify-content:center}
  .oacit-empty{padding:var(--space-6) var(--space-4)}
}
@media(prefers-reduced-motion:reduce){
  .oacit *,.oacit *::before,.oacit *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .oacit-spinner{border-top-color:var(--blue);animation:none}
  .oacit-route:hover,.oacit-actions button:hover:not(:disabled),.oacit-exports button:hover,.oacit-notice-out:hover{transform:none}
}
@media(forced-colors:active){
  .oacit,.oacit-card,.oacit-route,.oacit-model-note,.oacit-notice,.oacit-facts li,.oacit-stats li,.oacit-status,.oacit-exports,.oacit-empty,.oacit-notice-out{border:1px solid CanvasText}
  .oacit-rail button[aria-selected=true]{outline:2px solid Highlight}
  .oacit-progress i,.oacit-route::before{background:Highlight}
  .oacit-head::after{background:CanvasText}
}
`;
