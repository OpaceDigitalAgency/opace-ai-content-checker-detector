// Genuine captures from the installed release candidate. Authentication arrives
// via OACI_AUTH_COOKIES (JSON) or OACI_WP_USER/OACI_WP_PASSWORD, never saved.
// OACI_EVIDENCE_DIR optionally retains expanded responsive views and the PDF.
// The isolated editor capture reads an existing QA post without editing or saving it.
// OACI_CAPTURE_MODE=editor recaptures only the editor after a package update.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OACI_SCREENSHOT_DIR || `${PLUGIN}/.wordpress-org`;
const EVIDENCE = process.env.OACI_EVIDENCE_DIR;
const AXE = process.env.OACI_AXE_PATH || resolve(PLUGIN,'../../extensions/chrome/node_modules/axe-core/axe.min.js');
const BASE = process.env.OACI_BASE_URL || 'http://127.0.0.1:8931';
const MODE = process.env.OACI_CAPTURE_MODE || 'all';
const DRAFT = readFileSync(`${PLUGIN}/assets/js/lab-examples.mjs`, 'utf8').match(/^const RAW_AI = `([\s\S]*?)`;$/m)?.[1].trim();
assert(DRAFT, 'Built-in public example is required.');
assert(process.env.OACI_AUTH_COOKIES || (process.env.OACI_WP_USER && process.env.OACI_WP_PASSWORD), 'Provide fixture authentication through environment variables.');
mkdirSync(OUT, {recursive:true}); if(EVIDENCE) mkdirSync(EVIDENCE,{recursive:true});
const browser = await chromium.launch({headless:false});
const ctx = await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,acceptDownloads:true});
const problems=[], checks=[], requests=[];
ctx.on('page',p=>p.on('pageerror',e=>problems.push(e.message)));
ctx.on('request',request=>{if(request.method()==='POST'){const url=new URL(request.url());requests.push({method:'POST',path:url.searchParams.get('rest_route')||url.pathname});}});
await ctx.addInitScript(()=>document.addEventListener('oaci:ready',()=>{window.__oaciCaptureReady=true;}));
const page=await ctx.newPage();
async function frame(selector,offset=170){
 await page.locator(selector).first().waitFor({state:'visible'});
 await page.locator(selector).first().evaluate((n,gap)=>window.scrollTo({top:scrollY+n.getBoundingClientRect().top-gap,behavior:'instant'}),offset);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function shot(n){await page.screenshot({path:`${OUT}/screenshot-${n}.png`});console.log(`Captured screenshot-${n}.png`);}
async function framedShot(locator,n){
 const viewport=page.viewportSize();let bytes;
 if(n===4){
  await page.setViewportSize({width:1280,height:8000});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  const clip=await locator.evaluate(node=>{const box=node.getBoundingClientRect(),scale=node.querySelector('.oaci-measure__scale').getBoundingClientRect();return{x:box.x,y:box.y,width:box.width,height:Math.min(1050,scale.bottom-box.top+30)};});
  bytes=await page.screenshot({clip});await page.setViewportSize(viewport);
 }else bytes=await locator.screenshot();
 const image=bytes.toString('base64');const preview=await ctx.newPage();
 await preview.setContent(`<body style="margin:0;width:1280px;height:800px;background:#061a3c;display:flex;align-items:center;justify-content:center;overflow:hidden"><img alt="Genuine detail from the installed checker" src="data:image/png;base64,${image}" style="height:740px;max-width:1160px;object-fit:contain;box-shadow:0 24px 70px rgba(0,0,0,.45)"></body>`);
 await preview.locator('img').evaluate(img=>img.decode());await preview.screenshot({path:`${OUT}/screenshot-${n}.png`});await preview.close();
}
async function audit(selector){
 if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:AXE});
 const violations=await page.evaluate(async target=>(await axe.run(target,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),selector);
 assert.deepEqual(violations,[],`${selector}: accessibility violations`);return violations;
}
async function responsive(name,selector='.oaci-wrap'){
 if(!EVIDENCE)return;
 await page.locator(`${selector} details`).evaluateAll(nodes=>nodes.forEach(n=>{n.open=true;}));
 for(const width of [1280,375]){
  await page.setViewportSize({width,height:width===375?812:800});await frame(selector);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert(!overflow,`${name}: horizontal overflow at ${width}px`);
  const columns=await page.locator('[data-oaci-column]').evaluateAll(nodes=>nodes.map(n=>({overflow:getComputedStyle(n).overflowY,scrollable:n.scrollHeight>n.clientHeight+1})));
  assert(columns.every(c=>!c.scrollable||!['auto','scroll'].includes(c.overflow)),`${name}: competing column scrolling`);
  const violations=await audit(selector);
  await page.screenshot({path:`${EVIDENCE}/directory-${name}-${width}.png`,fullPage:true});checks.push({page:name,width,overflow,columns,violations});
  if(width===375&&['methods','settings'].includes(name)){
   const details=page.locator(`${selector} details`);
   for(let index=0;index<await details.count();index++){
    const detail=details.nth(index);
    const height=await detail.evaluate(node=>node.getBoundingClientRect().height);
    for(let offset=0;offset<height;offset+=680){
     await detail.evaluate((node,step)=>window.scrollTo({top:scrollY+node.getBoundingClientRect().top-60+step,behavior:'instant'}),offset);
     await page.screenshot({path:`${EVIDENCE}/directory-${name}-375-detail-${index+1}-${offset}.png`});
    }
   }
  }
 }
 await page.setViewportSize({width:1280,height:800});
}
try{
 if(process.env.OACI_AUTH_COOKIES)await ctx.addCookies(JSON.parse(process.env.OACI_AUTH_COOKIES).map(c=>({...c,url:BASE,httpOnly:true,sameSite:'Lax'})));
 else{
  await page.goto(`${BASE}/wp-login.php`);await page.fill('#user_login',process.env.OACI_WP_USER);await page.fill('#user_pass',process.env.OACI_WP_PASSWORD);
  await Promise.all([page.waitForURL('**/wp-admin/**'),page.click('#wp-submit')]);
 }
 if(MODE!=='editor'){
 await page.goto(`${BASE}/wp-admin/admin.php?page=oaci-lab`);
 await page.waitForFunction(()=>window.__oaciCaptureReady===true);
 await page.waitForFunction(()=>!document.querySelector('#oaci-inspect')?.textContent.includes('Checking which routes'),null,{timeout:60000});
 await page.locator('input[name="oaci-analysis-route"][value="server"]').check();
 await frame('.oaci-header',46);await shot(1);
 await page.locator('#oaci-source').fill(DRAFT);
 await page.locator('input[name="oaci-analysis-route"][value="on_device"]').check();
 assert.match(await page.locator('#oaci-inspect').innerText(),/Download|model/i);
 await frame('#oaci-step-route');await shot(2);
 await page.locator('input[name="oaci-analysis-route"][value="server"]').check();
 await page.locator('#oaci-inspect').click();
 await page.locator('[data-oaci-draft-evidence]').waitFor({timeout:180000});
 assert.match(await page.locator('section.oaci-run').innerText(),/EU/);
 await frame('.oaci-verdict');await shot(3);
 await page.locator('[data-oaci-section-toggle="0"]').click();
 await page.locator('.oaci-dive__row[data-oaci-open="true"]').waitFor();
 assert(await page.locator('.oaci-draft-mirror__mark').count(),'Selected passage must be highlighted.');
 await frame('.oaci-dive__row[data-oaci-open="true"]');await framedShot(page.locator('.oaci-dive').first(),4);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#oaci-download-pdf').click()]);
 const pdfPath=`${EVIDENCE||'/tmp'}/oaci-wordpress-directory-report.pdf`,pdfPng=`${EVIDENCE||'/tmp'}/oaci-wordpress-directory-report-page1`;
 await download.saveAs(pdfPath);execFileSync('pdftoppm',['-f','1','-singlefile','-png','-r','128',pdfPath,pdfPng]);
 const pdfPage=await ctx.newPage(),pdfImage=readFileSync(`${pdfPng}.png`).toString('base64');
 await pdfPage.setContent(`<body style="margin:0;width:1280px;height:800px;background:#061a3c;display:flex;align-items:center;justify-content:center;overflow:hidden"><img alt="First page of the downloaded report" src="data:image/png;base64,${pdfImage}" style="height:740px;box-shadow:0 24px 70px rgba(0,0,0,.45)"></body>`);
 await pdfPage.locator('img').evaluate(img=>img.decode());await pdfPage.screenshot({path:`${OUT}/screenshot-5.png`});await pdfPage.close();
 await responsive('result','#oaci-results');
 for(const [name,number] of [['settings',6],['methods',7],['receipts',null]]){
  await page.goto(`${BASE}/wp-admin/admin.php?page=oaci-${name}`);await page.locator('.oaci-wrap').first().waitFor();
  if(name==='settings')await page.locator('#oaci-server-settings').waitFor();
  await frame(name==='settings'?'#oaci-server-settings':'.oaci-wrap',name==='settings'?70:46);if(number)await shot(number);await responsive(name);
 }
 }
 await page.goto(`${BASE}/wp-admin/post.php?post=${encodeURIComponent(process.env.OACI_EDITOR_POST_ID||'41')}&action=edit`);
 await page.locator('.oaci-ed').waitFor({timeout:60000});
 await page.locator('.oaci-ed__go').waitFor();
 await page.waitForFunction(()=>!document.querySelector('.oaci-ed__go')?.disabled,null,{timeout:60000});
 await page.locator('.oaci-ed__go').click();await page.locator('.oaci-ed.has-result').waitFor({timeout:180000});
 await page.locator('.oaci-ed').scrollIntoViewIfNeeded();await shot(8);
 if(EVIDENCE){
  await page.locator('.oaci-ed details').evaluateAll(nodes=>nodes.forEach(n=>{n.open=true;}));
  checks.push({page:'editor',width:1280,violations:await audit('.oaci-ed')});
  await page.locator('.oaci-ed').screenshot({path:`${EVIDENCE}/directory-editor-expanded.png`});
  await page.setViewportSize({width:375,height:812});
  await page.locator('.oaci-ed').scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Editor overflow at375px');
  checks.push({page:'editor',width:375,violations:await audit('.oaci-ed'),overflow:false});
  await page.locator('.oaci-ed').screenshot({path:`${EVIDENCE}/directory-editor-expanded-375.png`});
 }
 await page.locator('.oaci-ed details').evaluateAll(nodes=>nodes.forEach(node=>{node.open=false;}));
 await page.setViewportSize({width:375,height:812});await framedShot(page.locator('.oaci-ed'),8);
 const handed=await page.evaluate(()=>{
  const key=Object.keys(sessionStorage).find(key=>key.startsWith('oaci.editor.handoff:'));
  return key?JSON.parse(sessionStorage.getItem(key)):null;
 });
 assert(handed?.result&&handed?.content,'Editor must store its result in this tab for handoff.');
 if(EVIDENCE)writeFileSync(`${EVIDENCE}/directory-editor-result.json`,JSON.stringify({result:handed.result,content:handed.content,findings:handed.findings},null,2));
 const postsBefore=requests.length;
 await page.locator('.oaci-ed__open').click();
 await page.waitForFunction(()=>window.__oaciCaptureReady===true);
 await page.locator('[data-oaci-draft-evidence]').waitFor({timeout:30000});
 assert.equal(await page.locator('#oaci-source').inputValue(),handed.content,'Full checker must retain exact editor draft.');
 assert.match(await page.locator('.oaci-verdict').innerText(),new RegExp(String(handed.result.axes.ai_pattern.display_score).replace('.','\\.')));
 assert(requests.slice(postsBefore).every(request=>!request.path.includes('/editor/handoff')&&!request.path.includes('/analys')),'Opening full report must not post the draft or rerun analysis.');
 assert(requests.every(request=>!request.path.includes('/editor/handoff')),'No server handoff request is allowed.');
 checks.push({page:'editor-handoff',retainedDraft:true,retainedScore:true,noServerHandoff:true});
 if(EVIDENCE)writeFileSync(`${EVIDENCE}/directory-capture-results.json`,JSON.stringify({mode:MODE,checks,requests,pageErrors:problems,screenshots:MODE==='editor'?1:8},null,2));
 assert.deepEqual(problems,[]);console.log('Requested genuine installed-package screenshots captured; no page errors.');
}catch(error){
 if(EVIDENCE)await page.screenshot({path:`${EVIDENCE}/capture-failure.png`});
 throw error;
}finally{await browser.close();}
