import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import assert from 'node:assert/strict';
const ROOT=process.cwd(), DIR=path.join(ROOT,'build/codex/02-menu');
const result={comparisons:[],devices:{},widths:[],errors:[],checks:[]};
const check=(name,ok,detail)=>{result.checks.push({name,ok,detail});};
const read=p=>PNG.sync.read(fs.readFileSync(p));
function compare(dev,name,actual,ref,source){
 const a=Buffer.isBuffer(actual)?PNG.sync.read(actual):read(actual), b=read(ref);
 const sameSize=a.width===b.width&&a.height===b.height;
 let diff=null,raw=null;
 if(sameSize){diff=pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:0,includeAA:true});raw=0;for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))raw++;}
 const r={dev,name,source,actualSize:[a.width,a.height],refSize:[b.width,b.height],diff,raw,total:b.width*b.height,pct:diff===null?null:diff/(b.width*b.height)*100};result.comparisons.push(r);return r;
}
const old=JSON.parse(fs.readFileSync(path.join(DIR,'original-summary.json')));
const fresh=JSON.parse(fs.readFileSync(path.join(DIR,'rerun/docs/verify/02-menu/summary.json')));
check('rerun devices exactly equal original',JSON.stringify(old.devices)===JSON.stringify(fresh.devices));
check('rerun pass equals original',old.pass===fresh.pass,{old:old.pass,fresh:fresh.pass});
for(const [dev,d] of Object.entries(old.devices))for(const s of [...d.slices,...d.viewportShots]){
 const base=s.name==='viewport-open'?`${dev.toUpperCase()}-Menu_01_menu`:s.name.split('@')[0];
 const r=compare(dev,s.name,path.join(ROOT,'build/verify/02-menu',dev,s.name+'.png'),path.join(ROOT,'build/img',dev,base+'.png'),'implementation');
 check(`${dev} ${s.name} original diff matches`,r.diff===s.diff&&r.total===s.total&&Math.abs(r.pct-s.pct)<0.000051);
}
const spec=JSON.parse(fs.readFileSync('docs/slices.json'));const refPath=(dev,name)=>path.join(ROOT,'build/img',dev,name+'.png');
const browser=await chromium.launch({args:['--force-color-profile=srgb','--disable-lcd-text','--hide-scrollbars']});result.chromium=browser.version();
async function setup(w,h,dpr=1,debug=false){const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr});const p=await ctx.newPage();p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text())});p.on('pageerror',e=>result.errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)result.errors.push(`${r.status()} ${r.url()}`)});await p.goto('http://127.0.0.1:4198/'+(debug?'?debug=1':''),{waitUntil:'networkidle'});await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));return {ctx,p};}
const opener=p=>p.locator('[aria-controls="site-menu"]:visible');const closer=p=>p.locator('#site-menu [data-menu-close]:visible');const menu=p=>p.locator('#site-menu');
const active=p=>p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.textContent,menu:!!e.closest('#site-menu'),outline:s.outline,outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineColor:s.outlineColor,focusVisible:e.matches(':focus-visible'),rect:[r.x,r.y,r.width,r.height]}});
const scroll=p=>p.evaluate(()=>({y:scrollY,html:[document.documentElement.scrollWidth,document.documentElement.clientWidth],menu:[document.querySelector('#site-menu').scrollWidth,document.querySelector('#site-menu').clientWidth],menuY:document.querySelector('#site-menu').scrollTop}));
for(const [dev,w,h,dpr] of [['pc',1920,1000,1],['sp',375,700,2]]){
 const {ctx,p}=await setup(w,h,dpr);const d=result.devices[dev]={};
 d.initialStyle=await p.evaluate(()=>[document.documentElement.style.overflow,document.documentElement.style.paddingRight]);
 check(`${dev} initially closed`,await menu(p).isHidden()&&(await opener(p).getAttribute('aria-expanded'))==='false');
 await p.keyboard.press('Tab');d.openerFocus=await active(p);check(`${dev} opener Tab reachable with outline`,d.openerFocus.text==='メニューを開く'&&d.openerFocus.focusVisible&&d.openerFocus.outlineWidth==='3px');
 // Reload so initial image checks follow an entirely mouse-driven path.
 await p.reload({waitUntil:'networkidle'});await opener(p).click();
 check(`${dev} open dialog`,await menu(p).isVisible()&&(await opener(p).getAttribute('aria-expanded'))==='true'&&(await menu(p).getAttribute('role'))==='dialog'&&(await menu(p).getAttribute('aria-modal'))==='true');
 check(`${dev} focus close and main inert`,(await active(p)).text==='メニューを閉じる'&&await p.locator('main').evaluate(e=>e.inert));
 const name=`${dev.toUpperCase()}-Menu_01_menu`,loc=p.locator(`[data-slice-${dev}="${name}"]`),box=await loc.boundingBox();
 const expected=spec[dev].pages.find(x=>x.frame===`${dev.toUpperCase()}-Menu`).slices[0];d.slice={box,expectedHeight:(expected.y1-expected.y0)/dpr};
 check(`${dev} slice dimensions`,box.y===0&&box.width===w&&box.height===d.slice.expectedHeight);
 for(const [suffix,buf] of [['menu-element',await loc.screenshot({scale:'device'})],['viewport-open',await p.screenshot({scale:'device'})]]){fs.writeFileSync(path.join(DIR,`${dev}-${suffix}.png`),buf);const r=compare(dev,suffix,buf,refPath(dev,name),'independent');check(`${dev} ${suffix} zero diff`,r.diff===0&&r.raw===0);}
 const hits=menu(p).locator('.hit:visible');d.hits=[];
 const ys=dev==='pc'?[133,224,315,406,496,587,678,767,860,949]:[161,259,357,456,553,652,750,847,947,1044];
 for(let i=0;i<await hits.count();i++){const el=hits.nth(i),r=await el.boundingBox(),devicePx=[r.x,r.y,r.width,r.height].map(v=>v*dpr),expected=i===0?(dev==='pc'?[1437,37,48,48]:[651,38,48,48]):[dev==='pc'?598:90,ys[i-1],dev==='pc'?534:578,ys[i]-ys[i-1]];const record={devicePx,expected,aria:await el.ariaSnapshot(),style:await el.evaluate(e=>{const s=getComputedStyle(e);return {outline:s.outline,background:s.backgroundColor}}),tag:await el.evaluate(e=>e.tagName),href:await el.getAttribute('href'),disabled:await el.getAttribute('aria-disabled')};d.hits.push(record);check(`${dev} hit ${i} rect`,JSON.stringify(devicePx)===JSON.stringify(expected));check(`${dev} hit ${i} name`,/button|link/.test(record.aria)&&record.aria.length>12);check(`${dev} hit ${i} invisible`,record.style.background==='rgba(0, 0, 0, 0)'&&record.style.outline.includes('none'));}
 check(`${dev} 10 hits and correct semantics`,d.hits.length===10&&d.hits[1].tag==='A'&&d.hits[1].href==='#top'&&d.hits.slice(2).every(r=>r.tag==='BUTTON'&&r.disabled==='true'&&r.aria.includes('リンク未設定')));
 d.scrollBefore=await scroll(p);await p.mouse.move(w/2,h/2);await p.mouse.wheel(0,700);await p.waitForTimeout(200);d.scrollWheel=await scroll(p);await p.keyboard.press('PageDown');await p.keyboard.press('ArrowDown');await p.waitForTimeout(200);d.scrollKey=await scroll(p);check(`${dev} wheel and keys lock page`,d.scrollBefore.y===d.scrollWheel.y&&d.scrollBefore.y===d.scrollKey.y);
 await closer(p).click();
 // Fresh load for repeated mouse-only close and header/FV comparisons, avoiding keyboard ring inheritance.
 await p.reload({waitUntil:'networkidle'});
 for(let i=0;i<3;i++){await opener(p).click();await closer(p).click();}
 for(const [idx,n] of ['header','fv'].entries()){const sn=`${dev.toUpperCase()}-1_0${idx+1}_${n}`,l=p.locator(`[data-slice-${dev}="${sn}"]`),b=await l.boundingBox(),ex=spec[dev].pages[0].slices[idx],buf=await l.screenshot({scale:'device'});fs.writeFileSync(path.join(DIR,`${dev}-${n}-reclosed.png`),buf);check(`${dev} ${n} CSS height`,b.height===(ex.y1-ex.y0)/dpr);const r=compare(dev,sn+'@3-reclosed',buf,refPath(dev,sn),'independent');check(`${dev} ${n} after 3 cycles exact`,r.diff===0&&r.raw===0);}
 await p.evaluate(()=>scrollTo(0,0));await opener(p).click();d.forward=[await active(p)];for(let i=0;i<10;i++){await p.keyboard.press('Tab');d.forward.push(await active(p));}
 const texts=d.forward.slice(0,10).map(x=>x.text);check(`${dev} full forward trap`,new Set(texts).size===10&&d.forward[10].text===texts[0]&&d.forward.every(x=>x.menu));
 check(`${dev} all menu hits visible focus outlines`,d.forward.slice(1).every(x=>x.focusVisible&&x.outlineWidth==='3px'&&x.outlineStyle==='solid'&&x.outlineColor==='rgb(0, 95, 204)'));
 await p.screenshot({path:path.join(DIR,`${dev}-focus-close.png`)});
 d.reverse=[];for(let i=0;i<10;i++){await p.keyboard.press('Shift+Tab');d.reverse.push(await active(p));}check(`${dev} full reverse trap`,d.reverse.every((x,i)=>x.text===texts[(9-i+10)%10]&&x.menu));
 await p.keyboard.press('Escape');d.afterEscape=await active(p);check(`${dev} escape closes restores focus`,await menu(p).isHidden()&&d.afterEscape.text==='メニューを開く'&&d.afterEscape.focusVisible);
 d.restoredStyle=await p.evaluate(()=>[document.documentElement.style.overflow,document.documentElement.style.paddingRight]);check(`${dev} styles restored`,JSON.stringify(d.restoredStyle)===JSON.stringify(d.initialStyle));
 for(const key of ['Enter','Space']){await p.keyboard.press(key);check(`${dev} ${key} opens`,await menu(p).isVisible());await p.keyboard.press(key);check(`${dev} ${key} closes`,await menu(p).isHidden()&&(await active(p)).text==='メニューを開く');}
 await opener(p).click();await menu(p).locator('a:visible').click();check(`${dev} Top closes and navigates`,await menu(p).isHidden()&&p.url().endsWith('#top'));
 await ctx.close();
 const debug=await setup(w,h,dpr,true);await opener(debug.p).click();d.debug=await menu(debug.p).locator('.hit:visible').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {outline:s.outline,background:s.backgroundColor}}));check(`${dev} debug 10 visible rectangles`,d.debug.length===10&&d.debug.every(s=>s.outline.includes('2px dashed')&&s.background==='rgba(255, 0, 0, 0.12)'));await debug.p.screenshot({path:path.join(DIR,`${dev}-debug.png`)});await debug.ctx.close();
}
for(const w of [1920,1366,1024,768,767,375,320]){const {ctx,p}=await setup(w,800,w<768?2:1);const closed=await scroll(p);await opener(p).click();const open=await scroll(p);result.widths.push({w,closed,open});check(`width ${w} no horizontal overflow`,closed.html[0]<=closed.html[1]&&closed.menu[0]<=closed.menu[1]&&open.html[0]<=open.html[1]&&open.menu[0]<=open.menu[1]);await ctx.close();}
{
 const {ctx,p}=await setup(375,568,2);await opener(p).click();const before=await scroll(p);await p.mouse.move(200,400);await p.mouse.wheel(0,450);await p.waitForTimeout(250);const after=await scroll(p);result.short={before,after};check('short viewport scrolls menu only',after.menuY>before.menuY&&after.y===before.y);await p.keyboard.press('End');await p.waitForTimeout(200);result.short.afterKey=await scroll(p);check('short viewport key locks page',result.short.afterKey.y===before.y);await ctx.close();
}
{
 const {ctx,p}=await setup(1920,1080);await opener(p).click();const buf=await p.screenshot({path:path.join(DIR,'pc-tall.png')});const png=PNG.sync.read(buf);let wrong=0;for(let y=1000;y<1080;y++)for(let x=0;x<1920;x++){const i=(y*png.width+x)*4;if(png.data[i]!==209||png.data[i+1]!==193||png.data[i+2]!==162)wrong++;}result.tall={fillWrongPixels:wrong,total:1920*80};check('tall below-image fill #d1c1a2',wrong===0);await ctx.close();
}
// Integrate black-on-white coverage across the hamburger ROI, grouping each line's rows.
result.lines={};for(const [source,file] of [['reference','build/img/pc/PC-1_01_header.png'],['implementation','build/verify/02-menu/pc/PC-1_01_header@reclosed.png'],['independent','build/codex/02-menu/pc-header-reclosed.png']]){const png=read(file),rows=[];for(let y=30;y<73;y++){let sum=0;for(let x=1445;x<1505;x++){const i=(y*png.width+x)*4;sum+=(255-png.data[i])/255;}if(sum>0)rows.push({y,coverage:sum});}const groups=[];for(const row of rows){if(!groups.length||row.y>groups.at(-1).at(-1).y+1)groups.push([]);groups.at(-1).push(row);}const integrals=groups.map(g=>g.reduce((n,r)=>n+r.coverage,0));result.lines[source]={rows,integrals,effectiveThickness:integrals.map(n=>n/43)};check(`${source} 3 equal hamburger strokes`,integrals.length===3&&Math.max(...integrals)-Math.min(...integrals)<1e-9);}
check('no console error/pageerror/HTTP >=400',result.errors.length===0,result.errors);
await browser.close();result.pass=result.checks.every(c=>c.ok);fs.writeFileSync(path.join(DIR,'independent.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,failed:result.checks.filter(c=>!c.ok),comparisons:result.comparisons,lines:result.lines},null,2));
