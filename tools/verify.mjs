import { chromium } from '/opt/hatch/skills/spaces/ts-runtime/dist/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['serve.ts'],{env:{...process.env,PORT:'8095'},stdio:'ignore'});
await new Promise(r=>setTimeout(r,500));
const browser=await chromium.launch({executablePath:'/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  // Rules and controls can run without GPU work; capture.mjs separately tests the full renderer.
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:8095/');await page.waitForFunction(()=>!!window.solmara);
  const result=await page.evaluate(async()=>{
    const s=window.solmara,g=s.game,results=[];
    const check=(name,ok)=>{if(!ok)throw new Error(name);results.push(name);};
    check('start menu present',!document.getElementById('menu').classList.contains('hidden'));
    s.startGame();check('start enters city',g.started&&!g.paused);
    s.interact();check('E enters nearby Mariner',g.car?.kind==='MARINER GT');
    const start=g.car.z;window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}));for(let i=0;i<120;i++)s.simulation(1/60);window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}));check('W accelerates and moves car',g.car.z>start+5&&g.speed>0);
    g.car.speed=0;s.interact();check('E exits on foot',!g.car&&g.avatar.mesh.visible);
    for(let i=0;i<4;i++){s.setSeason(g,i);check('season '+i,g.env.season===i);}
    g.shopOpen=true;g.save.cash=5000;g.purchase({id:'weapon1',name:'Breaker 12',price:750});check('shop unlocks real shotgun',g.save.weapons.includes(1)&&g.save.ammo[1]===24&&g.save.cash===4250);g.shopOpen=false;
    g.player.heading=0;const ammo=g.save.ammo[1];s.fireWeapon(g);check('weapon spends ammo and reports gunfire',g.save.ammo[1]===ammo-1&&g.police.heat>0);
    const {updatePolice}=await import('/src/police.js');g.police.heat=5;g.police.dispatch=0;updatePolice(g,.1);check('five stars dispatch patrol and helicopter',g.police.units.length>0&&!!g.police.heli);
    const {JOBS}=await import('/src/missions.js');check('twelve authored jobs',JOBS.length===12&&new Set(JOBS.map(j=>j.type)).size===12);
    for(let i=0;i<12;i++){g.mission.index=i;s.startMission(g);check('job '+(i+1)+' starts with timer',g.mission.status==='active'&&g.mission.timer>0);g.mission.timer=.01;s.updateMission(g,.02);check('job '+(i+1)+' has timeout and retry',g.mission.status==='failed');}
    for(const index of [0,1,2,3,4,5,7,8,9,10]){
      g.mission.index=index;s.startMission(g);const m=g.mission,j=JOBS[index],oldTake=g.input.take,oldHeld=g.input.held;g.health=100;g.flying=null;g.car=null;g.police.seen=false;
      if(j.type==='tail'){Object.assign(g.player,{x:0,z:-64});Object.assign(m.van,{x:0,z:-24});m.progress=12;g.input.take=k=>k==='p';s.updateMission(g,.02);}
      else if(j.type==='delivery'||j.type==='run'){g.car=g.garage[0];g.speed=0;for(const t of [...m.stops]){Object.assign(g.player,{x:t[0],z:t[1]});s.updateMission(g,.02);}if(j.type==='delivery'){g.police.heat=0;s.updateMission(g,.02);}}
      else if(j.type==='combat'){m.started=true;g.combat.kills=4;s.updateMission(g,.02);}
      else if(j.type==='intercept'||j.type==='convoy'){m.van.health=0;s.updateMission(g,.02);for(const c of [...m.cases]){Object.assign(g.player,{x:c.x,z:c.z});s.updateMission(g,.02);}g.police.seen=false;s.updateMission(g,11);}
      else if(j.type==='defend'||j.type==='broadcast'){m.started=true;m.phase=1;m.progress=j.type==='defend'?24.99:34.99;g.combat.enemies.forEach(e=>e.alive=false);Object.assign(g.player,{x:j.goal[0],z:j.goal[1]});s.updateMission(g,.1);}
      else if(j.type==='escape'){m.progress=13.99;g.police.seen=false;s.updateMission(g,.1);}
      else if(j.type==='hack'){Object.assign(g.player,{x:j.goal[0],z:j.goal[1]});g.input.held=k=>k==='f';m.started=true;m.progress=11.99;s.updateMission(g,.1);}
      g.input.take=oldTake;g.input.held=oldHeld;check('authored '+j.type+' success advances story',m.index===index+1&&m.status==='briefing');
    }
    g.mission.index=11;s.startMission(g);g.player.x=128;g.player.z=256;g.car=null;g.combat.kills=6;g.mission.started=true;g.mission.progress=14.99;const oldHeld=g.input.held;g.input.held=k=>k==='f';s.updateMission(g,.02);g.input.held=oldHeld;check('final vault triggers five-star riot escape',g.mission.phase===1&&g.police.heat===5&&g.effects.fighters.length===32&&g.effects.fires.length>=3);
    g.player.x=0;g.player.z=-64;g.police.seen=false;g.police.lost=10;s.updateMission(g,.02);check('reserve delivery completes story',g.mission.status==='complete'&&g.save.done===12&&g.save.cash>10000);
    g.mission.index=6;s.startMission(g);g.flying=g.parkedHeli;g.flying.y=0;Object.assign(g.player,g.city.pads[0]);s.updateMission(g,.02);check('flight extraction begins after boarding',g.mission.phase===1);
    g.flying.speed=0;g.speed=0;Object.assign(g.player,g.city.pads[1]);for(let i=0;i<61;i++)s.updateMission(g,.1);check('roof landing extracts Luz',g.mission.phase===2);
    Object.assign(g.player,g.city.pads[0]);for(let i=0;i<61;i++)s.updateMission(g,.1);check('airport landing completes extraction',g.mission.index===7&&g.mission.status==='briefing');
    const {loadSave}=await import('/src/storage.js');check('persistent save roundtrip',loadSave().done===7);
    g.activities.land(0,35);check('physical stunt rewards persist',loadSave().jumps.includes(0));
    return results;
  });
  assert.equal(errors.length,0,errors.join('\n'));assert(requests.every(url=>url.startsWith('http://127.0.0.1:8095/')||url.startsWith('data:')));
  console.log(JSON.stringify({passed:result.length,checks:result,externalRequests:0,browserErrors:errors}));
}finally{await browser.close();server.kill();}
