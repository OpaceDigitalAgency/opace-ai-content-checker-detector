/**
 * The toolbar's visual language.
 *
 * The panel is styled to match the Opace checker on the website: a warm paper
 * canvas, white panels, the Opace orange accent, the five named bands and the
 * Outfit / Plus Jakarta Sans pairing. The two font subsets are bundled as data
 * URLs, so the toolbar never touches the network for typography and works
 * offline; both faces are SIL Open Font License 1.1 and are recorded in
 * THIRD_PARTY_NOTICES.md.
 *
 * Font faces declared inside a shadow root are ignored by Chromium, and the dev
 * toolbar hands every app a shadow root. The faces are therefore registered on
 * the host document through the FontFace API under namespaced family names, so
 * they resolve inside the panel without changing a single rule on the page the
 * developer is checking.
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

/** Panel chrome, tab rail, forms and every non-result state. */
export const TOOLBAR_CSS = `
:host{color-scheme:light}
.oacit{
  --ink:#0f1115;--paper:#f2ede6;--white:#fff;--orange:#fb700a;--orange-deep:#b64f08;--orange-text:#8b3f0b;--orange-wash:#fdf1e7;
  --blue:#0068b3;--blue-soft:#e9f3fb;--green:#185c3b;--amber:#8b5608;--red:#96271a;
  --muted:#565d5e;--line:#d9d0c5;--line-soft:#e7e0d6;
  --band-human:#2f7d55;--band-unclear:#0068b3;--band-potential:#a8802a;--band-likely:#c2570d;--band-strong:#9e2318;
  --display:${DISPLAY_STACK};--text:${TEXT_STACK};
  box-sizing:border-box;width:min(520px,calc(100vw - 24px));max-height:min(78vh,820px);overflow:auto;overscroll-behavior:contain;
  border:1px solid var(--line);border-radius:20px;background:var(--paper);color:var(--ink);
  box-shadow:0 24px 64px rgb(15 17 21 / 22%);font:400 14px/1.6 var(--text);-webkit-font-smoothing:antialiased;
}
.oacit *{box-sizing:border-box}
.oacit[hidden]{display:none}
.oacit ::selection{background:rgb(251 112 10 / 22%)}

/* Masthead ---------------------------------------------------------------- */
.oacit-mast{display:flex;gap:13px;align-items:center;padding:17px 20px;background:var(--white);border-bottom:1px solid var(--line)}
.oacit-mast img{flex:0 0 auto;width:42px;height:42px;border-radius:10px;object-fit:contain;background:#101416}
.oacit-mast div{min-width:0}
.oacit-brand{margin:0;font:700 1.02rem/1.15 var(--display);letter-spacing:-.02em}
.oacit-promise{margin:3px 0 0;color:var(--orange-text);font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}

/* Tab rail ---------------------------------------------------------------- */
.oacit-rail{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;background:var(--white);border-bottom:1px solid var(--line)}
.oacit-rail button{flex:0 0 auto;min-height:38px;padding:8px 13px;color:#3c4344;background:var(--paper);border:1.5px solid var(--line-soft);border-radius:999px;font:700 .8rem/1 var(--text);white-space:nowrap;cursor:pointer;transition:border-color .15s ease,background-color .15s ease,color .15s ease}
.oacit-rail button:hover{border-color:#b9ae9f;color:var(--ink)}
.oacit-rail button[aria-selected=true]{color:var(--white);background:var(--orange-deep);border-color:var(--orange-deep)}
.oacit :focus-visible{outline:3px solid var(--blue);outline-offset:2px;border-radius:6px}

/* Body -------------------------------------------------------------------- */
.oacit-body{padding:18px 16px 22px;background:var(--paper)}
.oacit-body>h2{margin:0 0 6px;font:700 1.4rem/1.15 var(--display);letter-spacing:-.03em}
.oacit-body>p{margin:0 0 14px;max-width:56ch;color:var(--muted);font-size:.9rem}
.oacit-card{padding:16px;margin:0 0 14px;background:var(--white);border:1px solid var(--line);border-radius:15px;box-shadow:0 6px 20px rgb(15 17 21 / 5%)}
.oacit-card>h4{margin:0 0 8px;font:700 .95rem/1.25 var(--display)}
.oacit-card>p{margin:0 0 8px;color:var(--muted);font-size:.85rem}
.oacit-card>p:last-child{margin-bottom:0}
.oacit-legend{margin:0 0 9px;color:var(--orange-text);font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}

/* Route chooser ----------------------------------------------------------- */
.oacit-routes{display:grid;gap:10px;margin:0 0 12px;padding:0;border:0}
.oacit-route{display:grid;grid-template-columns:auto 1fr;gap:3px 11px;padding:13px 14px;background:var(--white);border:1.5px solid var(--line-soft);border-radius:13px;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}
.oacit-route:hover{border-color:#b9ae9f}
.oacit-route input{grid-row:1/3;margin:3px 0 0;accent-color:var(--orange);width:17px;height:17px}
.oacit-route:has(input:checked){border-color:var(--orange);box-shadow:0 0 0 2px rgb(251 112 10 / 18%)}
.oacit-route b{font:700 .92rem/1.3 var(--text)}
.oacit-route .oacit-tag{margin-left:7px;padding:2px 7px;color:var(--green);background:#e8f3ec;border-radius:999px;font-size:.63rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;vertical-align:1px}
.oacit-route span{grid-column:2;color:var(--muted);font-size:.8rem;line-height:1.5}
.oacit-consent{display:grid;grid-template-columns:auto 1fr;gap:11px;padding:13px 14px;margin:0 0 12px;background:var(--orange-wash);border:1.5px solid #f3d6bd;border-radius:13px;color:#4a3527;font-size:.8rem;line-height:1.55;cursor:pointer}
.oacit-consent input{margin:2px 0 0;accent-color:var(--orange);width:17px;height:17px}
.oacit-consent[hidden]{display:none}
.oacit-elsewhere{margin:0;color:var(--muted);font-size:.78rem;line-height:1.55}

/* Actions and status ------------------------------------------------------ */
.oacit-actions{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0 0}
.oacit-actions button{min-height:44px;padding:0 17px;color:#2f3536;background:var(--white);border:1.5px solid #c8beb2;border-radius:11px;font:700 .85rem/1 var(--text);cursor:pointer;transition:border-color .15s ease,background-color .15s ease}
.oacit-actions button:hover:not(:disabled){border-color:#8f9694;background:#faf7f3}
.oacit-actions .oacit-primary{color:var(--white);background:var(--orange-deep);border-color:var(--orange-deep)}
.oacit-actions .oacit-primary:hover:not(:disabled){background:#9c440a;border-color:#9c440a}
.oacit-actions button:disabled{opacity:.5;cursor:not-allowed}
.oacit-status{display:flex;gap:9px;align-items:flex-start;min-height:24px;margin:14px 0 0;padding:11px 13px;background:var(--white);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:11px;color:var(--muted);font-size:.83rem;line-height:1.55}
.oacit-status[data-tone=idle]:has(>.oacit-status-text:empty){display:none}
.oacit-status[data-tone=working]{border-left-color:var(--blue);background:var(--blue-soft);color:#123f5d}
.oacit-status[data-tone=done]{border-left-color:var(--green);background:#eef5f0;color:#14452e}
.oacit-status[data-tone=refused]{border-left-color:var(--amber);background:#fdf4e5;color:#5b3c08}
.oacit-status[data-tone=error]{border-left-color:var(--red);background:#fbeeec;color:#701a11}
.oacit-spinner{flex:0 0 auto;width:15px;height:15px;margin-top:3px;border:2px solid rgb(0 104 179 / 25%);border-top-color:var(--blue);border-radius:50%;animation:oacit-spin .9s linear infinite}
@keyframes oacit-spin{to{transform:rotate(360deg)}}
.oacit-progress{width:100%;height:6px;margin:9px 0 0;overflow:hidden;background:#e4ddd3;border-radius:999px}
.oacit-progress i{display:block;height:100%;background:var(--orange);border-radius:999px;transition:width .25s ease}

/* Notices ----------------------------------------------------------------- */
.oacit-notice{padding:13px 14px;margin:0 0 14px;border:1px solid #e9cfae;border-left:3px solid var(--amber);border-radius:12px;background:#fdf6ea;color:#5b3c08;font-size:.83rem;line-height:1.55}
.oacit-notice strong{display:block;margin-bottom:3px;font:700 .88rem/1.3 var(--display);color:#4a3105}
.oacit-notice p{margin:6px 0 0}
.oacit-notice--plain{border-color:var(--line);border-left-color:var(--blue);background:var(--blue-soft);color:#123f5d}
.oacit-notice--plain strong{color:#0b3a56}

/* Facts list -------------------------------------------------------------- */
.oacit-facts{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.oacit-facts li{padding:13px 14px;background:var(--white);border:1px solid var(--line);border-radius:13px}
.oacit-facts strong{display:block;font:700 .88rem/1.3 var(--text)}
.oacit-chip{display:inline-flex;margin:5px 0 0;padding:3px 9px;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.oacit-chip[data-tone=on]{color:var(--green);background:#e8f3ec}
.oacit-chip[data-tone=off]{color:var(--muted);background:#efe9e0}
.oacit-chip[data-tone=held]{color:var(--amber);background:#fbf0dc}
.oacit-facts p{margin:7px 0 0;color:var(--muted);font-size:.81rem;line-height:1.55}
.oacit-patch{max-height:190px;overflow:auto;margin:12px 0 0;padding:12px;background:#12161a;border-radius:11px;color:#e9e4dc;font:400 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}

/* Result slot ------------------------------------------------------------- */
.oacit-result-slot:empty{display:none}
.oacit-result-slot{margin:16px 0 0}
.oacit-exports{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0 0;padding:15px;background:var(--white);border:1px solid var(--line);border-radius:15px}
.oacit-exports p{flex:1 0 100%;margin:0 0 3px;font:700 .88rem/1.3 var(--display)}
.oacit-exports small{flex:1 0 100%;margin:0 0 5px;color:var(--muted);font-size:.78rem;line-height:1.5}
.oacit-exports button{min-height:42px;padding:0 15px;color:#2f3536;background:var(--paper);border:1.5px solid #c8beb2;border-radius:11px;font:700 .82rem/1 var(--text);cursor:pointer}
.oacit-exports button:hover{border-color:#8f9694;background:#f5efe6}

/* Narrow viewports -------------------------------------------------------- */
@media(max-width:430px){
  .oacit{width:calc(100vw - 16px);border-radius:15px}
  .oacit-mast{padding:14px 15px}
  .oacit-body{padding:15px 13px 19px}
  .oacit-rail{padding:9px 11px}
  .oacit-actions{display:grid}
  .oacit-actions button,.oacit-exports button{width:100%}
}
@media(prefers-reduced-motion:reduce){
  .oacit *,.oacit *::before,.oacit *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  .oacit-spinner{border-top-color:var(--blue);animation:none}
}
@media(forced-colors:active){
  .oacit,.oacit-card,.oacit-route,.oacit-consent,.oacit-notice,.oacit-facts li,.oacit-status,.oacit-exports{border:1px solid CanvasText}
  .oacit-rail button[aria-selected=true]{outline:2px solid Highlight}
  .oacit-progress i{background:Highlight}
}
`;
