import { chromium } from '/opt/hatch/skills/spaces/ts-runtime/dist/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const server=spawn(process.execPath,['serve.ts'],{env:{...process.env,PORT:'8094'},stdio:'ignore'});
await new Promise(r=>setTimeout(r,600));
const browser=await chromium.launch({executablePath:'/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:960,height:600},deviceScaleFactor:1.5});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,1800));});
mkdirSync('screenshots',{recursive:true});
for(const [i,season] of ['summer','spring','autumn','winter'].entries()){
  await page.goto('http://127.0.0.1:8094/?shot='+season);
  await page.waitForFunction(()=>window.__shotReady,{},{timeout:180000});
  await page.waitForTimeout(700);
  const name=['1-summer-hero','2-spring-market','3-autumn-flight','4-winter-lockdown'][i];
  let bytes;
  for(let quality=84;quality>=48;quality-=4){bytes=await page.screenshot({path:'screenshots/'+name+'.jpg',type:'jpeg',quality,scale:'css'});if(bytes.length<=81920)break;}
  if(bytes.length>81920)throw new Error(name+' exceeds the requested 80 KiB cap');
  console.log(JSON.stringify({name:season,...await page.evaluate(()=>({ready:window.__shotReady,season:window.solmara.game.env.season,speed:window.solmara.game.speed,display:document.getElementById('speed').textContent,crowd:window.solmara.game.people.length,draws:window.solmara.game.renderer.info.render.calls})),errors}));
}
await browser.close();server.kill();if(errors.length)process.exitCode=1;
