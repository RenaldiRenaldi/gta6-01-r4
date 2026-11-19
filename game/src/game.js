import * as T from '../vendor/three.module.min.js';
import { clamp,distance,district,bearing,WEAPONS,SERVICES,SEASONS } from './config.js';
import { buildCity,moveOnStreets,lineOfSight,surfaceHeight } from './city.js';
import { createRenderer,createEnvironment,setSeason,updateEnvironment } from './render.js';
import { createCar,createPerson,createHelicopter,populateStreets,posePerson,driveCar,flyHelicopter,updateTraffic,updateCrowds,createCombat,fireWeapon,updateCombat,syncCar } from './actors.js';
import { createPolice,reportCrime,updatePolice,clearPolice,addUnit,makeRoadblock } from './police.js';
import { createMissions,startMission,updateMission,missionTarget,failMission } from './missions.js';
import { createActivities,updateActivities } from './activities.js';
import { createEffects } from './effects.js';
import { createInterface } from './interface.js';
import { freshSave,loadSave,saveGame } from './storage.js';
import { bootAudio,tickAudio,sound } from './audio.js';

const view=createRenderer(document.getElementById('world')),{scene,camera,renderer}=view;
const shot=new URLSearchParams(location.search).get('shot'),city=buildCity(scene),population=populateStreets(scene);
const held=new Set(),pressed=new Set();
const input={held:k=>held.has(k),take:k=>{const found=pressed.has(k);pressed.delete(k);return found;}};
addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(!held.has(key))pressed.add(key);held.add(key);if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(key))e.preventDefault();});
addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));addEventListener('blur',()=>{held.clear();pressed.clear();});
let mouseDown=false;const canvas=renderer.domElement;
canvas.addEventListener('mousedown',()=>{if(!game.started)return;mouseDown=true;bootAudio();if(!shot&&!game.car&&!game.flying)canvas.requestPointerLock?.();});
addEventListener('mouseup',()=>mouseDown=false);document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!game.car&&!game.flying)game.player.heading-=e.movementX*.003;});
export const game={scene,camera,renderer,city,population,shot,input,save:shot?freshSave():loadSave(),player:{x:0,y:0,z:-64,heading:0},avatar:createPerson(scene,0,-64),traffic:population.traffic,people:population.people,
  police:createPolice(),combat:createCombat(),car:null,flying:null,health:100,speed:0,time:0,started:false,paused:false,shopOpen:false,radioOn:true,inCover:false,mapLarge:false,shake:0,slow:0,muzzle:0,cameraSnap:true,
  dj:'Niko: The port auction starts at midnight. Ines is waiting on Pearl Mile.',dialogue:'Twelve debts. One city. Find me at Pearl House, Dani.',djTime:10,
  district(){return district(this.player);},notify(text,seconds){this.ui?.notify(text,seconds);},radioMessage(text){this.dj=text;this.djTime=10;},commitCrime(kind,amount){reportCrime(this,kind,amount);},damage(amount){this.health=clamp(this.health-amount*(this.save.upgrades.includes('armor')?.7:1),0,100);if(amount>1)this.shake=.1;},
  acceptJob(){if(['briefing','failed'].includes(this.mission.status)){if(this.ui.briefOpen)startMission(this);else this.ui.showBrief();}},
  toggleShop(force){this.shopOpen=typeof force==='boolean'?force:!this.shopOpen;document.getElementById('shop').classList.toggle('hidden',!this.shopOpen);if(this.shopOpen){this.ui.closeBrief();document.exitPointerLock?.();}},
  purchase(good){if(!good||!this.shopOpen)return;if(this.save.cash<good.price){this.notify('NOT ENOUGH CASH');return;}if(['engine','nos'].includes(good.id)&&this.save.upgrades.includes(good.id)){this.notify('ALREADY FITTED');return;}if(good.id==='repaint'&&this.police.seen){this.notify('BREAK VISUAL CONTACT FIRST');return;}this.save.cash-=good.price;
    if(good.id.startsWith('weapon')){const n=Number(good.id.at(-1));if(!this.save.weapons.includes(n))this.save.weapons.push(n);this.save.ammo[n]+=WEAPONS[n].rounds;this.combat.weapon=n;}else if(good.id==='armor'){if(!this.save.upgrades.includes('armor'))this.save.upgrades.push('armor');this.health=100;for(const c of this.garage)c.health=100;if(this.car)this.car.health=100;}else if(good.id==='repaint'){if(this.car)this.car.paint.color.setHex(0x63b4aa);clearPolice(this);}else this.save.upgrades.push(good.id);saveGame(this.save);this.notify('PURCHASED / '+good.name);
  },
};
game.env=createEnvironment(scene,city);setSeason(game,game.save.season);game.env.hour=game.save.hour;
game.garage=[createCar(scene,3,-59,0xe37c65),createCar(scene,6,-76,0x4caba6,'CORA SPORT')];game.parkedHeli=createHelicopter(scene,-256,192);
game.mission=createMissions(game);game.activities=createActivities(game);game.effects=createEffects(game);game.ui=createInterface(game);
const beacon=new T.Mesh(new T.CylinderGeometry(.25,.8,10,12,1,true),new T.MeshBasicMaterial({color:0x79ffd6,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide}));scene.add(beacon);
const ring=new T.Mesh(new T.TorusGeometry(4,.12,6,40),new T.MeshBasicMaterial({color:0x92ffda}));ring.rotation.x=-Math.PI/2;scene.add(ring);

export function startGame(){game.started=true;game.paused=false;document.getElementById('menu').classList.add('hidden');bootAudio();game.notify('E / YOUR MARINER IS READY · J / INES HAS A JOB',6);}
document.getElementById('play').onclick=startGame;document.getElementById('resume').onclick=startGame;
function controls(){
  if(input.take('enter'))startGame();if(!game.started)return;
  if(input.take('escape')){if(game.shopOpen)game.toggleShop(false);else if(game.ui.briefOpen)game.ui.closeBrief();else{game.paused=!game.paused;document.getElementById('menu').classList.toggle('hidden',!game.paused);document.exitPointerLock?.();}}
  if(input.take('e'))interact();if(input.take('j'))game.acceptJob();if(input.take('m'))game.mapLarge=!game.mapLarge;
  if(input.take('t')){setSeason(game,game.env.season+1);game.save.season=game.env.season;game.save.hour=game.env.hour;saveGame(game.save);game.notify(SEASONS[game.env.season].name+' / '+game.env.weather);}
  if(input.take('r')){game.radioOn=!game.radioOn;game.notify(game.radioOn?'SOL WAVE / BACK ON AIR':'RADIO OFF');}
  for(let i=0;i<3;i++)if(input.take(String(i+1))){if(game.save.weapons.includes(i))game.combat.weapon=i;else game.notify('BUY '+WEAPONS[i].name+' AT ESTRELLA');}
  if(input.take('v')){const list=game.save.weapons;game.combat.weapon=list[(list.indexOf(game.combat.weapon)+1)%list.length];}
  if(input.take('q')){const near=[...game.traffic,...game.garage,...game.police.units].some(c=>distance(c,game.player)<5);game.inCover=!game.car&&!game.flying&&near&&!game.inCover;game.notify(game.inCover?'IN COVER / AIM AND FIRE':'Q / STAND BESIDE A CAR FOR COVER');}
  if(input.take('b')){if(!game.police.seen&&game.police.heat>0&&game.save.cash>=450){game.save.cash-=450;game.police.heat=Math.max(0,game.police.heat-1);saveGame(game.save);game.notify('INES BURNED A LEAD / ONE STAR CLEARED');}else game.notify('BRIBE / $450 + NO VISUAL CONTACT');}
}
export function interact(){
  if(game.shopOpen){game.toggleShop(false);return;}
  if(game.flying){if(game.player.y-surfaceHeight(city,game.player.x,game.player.z)>3||Math.abs(game.speed)>5){game.notify('LAND SLOWLY BEFORE EXITING');return;}game.flying=null;game.player.x+=3;game.avatar.mesh.visible=true;return;}
  if(game.car){const c=game.car;game.player.x=c.x+Math.cos(c.heading)*3;game.player.z=c.z-Math.sin(c.heading)*3;c.speed=c.vx=c.vz=0;game.car=null;game.avatar.mesh.visible=true;game.inCover=false;return;}
  const service=SERVICES.find(s=>s.type!=='heli'&&distance(s,game.player)<9);if(service){if(service.type==='save'){if(game.police.seen){game.notify('SAFEHOUSE / LOSE SIGHT FIRST');return;}game.health=100;clearPolice(game);game.save.season=game.env.season;game.save.hour=game.env.hour;saveGame(game.save);game.notify('PEARL HOUSE / SAVED + RECOVERED');}else game.toggleShop(true);return;}
  if(distance(game.player,game.parkedHeli)<7&&Math.abs(game.player.y-game.parkedHeli.y)<4){game.flying=game.parkedHeli;game.avatar.mesh.visible=false;game.notify('MARA’S KITE / H LIFT · CTRL DESCEND');return;}
  const cars=[...game.garage,...game.traffic,...game.police.units].filter(c=>distance(c,game.player)<7&&c.health>0).sort((a,b)=>distance(a,game.player)-distance(b,game.player));
  if(cars[0]){game.car=cars[0];game.car.stolen=true;game.car.vx=game.car.vz=0;game.avatar.mesh.visible=false;game.inCover=false;if(!game.garage.includes(game.car)){game.commitCrime('vehicle theft',1);game.police.units=game.police.units.filter(c=>c!==game.car);if(!game.traffic.includes(game.car))game.traffic.push(game.car);}game.notify(game.car.kind+' / ENGINE ON');}else game.notify('NO RIDE NEARBY / FOLLOW THE MINIMAP');
}
let recovery=0;
export function simulation(dt){
  const g=game;g.time+=dt;g.shake=Math.max(0,g.shake-dt);g.slow=Math.max(0,g.slow-dt);g.muzzle=Math.max(0,g.muzzle-dt);
  if(g.inCover&&![...g.traffic,...g.garage,...g.police.units].some(c=>distance(c,g.player)<6))g.inCover=false;
  if(g.shopOpen||g.ui.briefOpen){updateEnvironment(g,dt);g.effects.update(dt);return;}
  const i={forward:input.held('w')||input.held('arrowup'),back:input.held('s')||input.held('arrowdown'),steer:(input.held('a')||input.held('arrowleft')?1:0)-(input.held('d')||input.held('arrowright')?1:0),boost:input.held('shift'),brake:input.held(' '),up:input.held('h')||input.held(' '),down:input.held('control')};
  if(g.car){driveCar(g.car,dt,i,g);Object.assign(g.player,{x:g.car.x,y:g.car.y,z:g.car.z,heading:g.car.heading});g.speed=g.car.speed;}
  else if(g.flying){flyHelicopter(g.flying,dt,i,g);Object.assign(g.player,{x:g.flying.x,y:g.flying.y,z:g.flying.z,heading:g.flying.heading});g.speed=g.flying.speed;}
  else{g.player.heading+=i.steer*dt*2;const speed=((i.forward?1:0)-(i.back?1:0))*(g.inCover?2:i.boost?9:5.5);moveOnStreets(city,g.player,Math.sin(g.player.heading)*speed*dt,Math.cos(g.player.heading)*speed*dt,.5);g.player.y=Math.max(surfaceHeight(city,g.player.x,g.player.z),g.player.y-dt*18);Object.assign(g.avatar,g.player);posePerson(g.avatar,g.time,!!speed);g.speed=0;if(mouseDown||input.held('k'))fireWeapon(g);}
  updateTraffic(g,dt);updatePolice(g,dt);updateCombat(g,dt);updateMission(g,dt);updateActivities(g,dt);updateEnvironment(g,dt);g.effects.update(dt);
  if(g.time%15<dt){g.save.season=g.env.season;g.save.hour=g.env.hour;saveGame(g.save);}
  if(g.health<=0||g.car?.health<=0||g.flying?.health<=0){if(recovery===0){failMission(g,'The crew needs another chance');g.notify('BUSTED / RECOVERY IN THREE SECONDS',4);}recovery+=dt;if(recovery>3){clearPolice(g);g.health=100;if(g.car)g.car.health=100;g.car=null;if(g.flying){g.flying.health=140;Object.assign(g.flying,{x:-256,z:192,y:0});g.flying.mesh.position.set(-256,0,192);}g.flying=null;g.avatar.mesh.visible=true;Object.assign(g.player,{x:0,y:0,z:-64,heading:0});g.save.cash=Math.max(0,g.save.cash-200);saveGame(g.save);recovery=0;}}
  g.djTime-=dt;if(g.djTime<0){g.djTime=18;g.dj=g.police.heat>0?'Niko: '+Math.ceil(g.police.heat)+' stars. '+(g.police.seen?'They see you. Find a side street.':'The trail is cold. Stay hidden.'):'Niko: '+SEASONS[g.env.season].name.toLowerCase()+' on the coast. '+g.save.done+' debts cleared. The Mile keeps score.';}
  g.dialogue=g.police.heat>=4?'Air unit overhead. Keep the reserve moving. I’m bringing you home.':g.flying?'Easy on the collective. Luz is waiting on that marked roof.':g.mission.status==='active'?'Follow the marker, Dani. We finish this together.':'Meet me at Pearl House. The first debt is waiting.';tickAudio(g,dt);
}
function updateCamera(dt){const g=game,p=g.player;let target=missionTarget(g);if(g.activities.race){const a=g.activities,r=a.race.points[a.checkpoint];target={x:r[0],z:r[1]};}beacon.visible=ring.visible=!!target;if(target){beacon.position.set(target.x,(target.y||0)+5,target.z);ring.position.set(target.x,(target.y||0)+.16,target.z);}
  const desired=new T.Vector3(),look=new T.Vector3();
  if(g.shot==='autumn'){desired.set(p.x-41,p.y+23,p.z-47);look.set(p.x+29,p.y-35,p.z+45);}
  else if(g.shot==='spring'){desired.set(p.x+6,5.5,p.z-12);look.set(p.x-1,2.4,p.z+12);}
  else if(g.shot){desired.set(p.x+6,5.7,p.z-15.5);look.set(p.x-1,2.7,p.z+18);}
  else if(!g.started){desired.set(17,7,-90);look.set(0,3,-40);}
  else{const behind=g.flying?26:g.car?13:6.5,up=g.flying?11:g.car?5:3.3;desired.set(p.x-Math.sin(p.heading)*behind+(g.car?0:1.4),p.y+up,p.z-Math.cos(p.heading)*behind);look.set(p.x+Math.sin(p.heading)*7,p.y+(g.flying?0:1.5),p.z+Math.cos(p.heading)*7);if(!lineOfSight(city,{...p,y:p.y+2},{x:desired.x,y:desired.y,z:desired.z}))desired.lerp(new T.Vector3(p.x,p.y+3,p.z),.6);}
  if(g.cameraSnap){camera.position.copy(desired);g.cameraSnap=false;}else camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(look);camera.fov=g.shot==='autumn'?63:g.shot?59:g.flying?62:57+Math.min(7,Math.abs(g.speed)*.08);camera.updateProjectionMatrix();
}
export function stageSeasonShot(name){const g=game,season={spring:0,summer:1,autumn:2,winter:3}[name]??1;setSeason(g,season);g.started=true;document.getElementById('menu').classList.add('hidden');g.save.cash=48720;g.save.respect=87;g.save.done=11;g.save.weapons=[0,1,2];g.save.ammo=[62,24,36];g.save.upgrades=['engine','nos','armor'];g.save.packages=[0,2,4,6,8,9,11];g.save.races=[61.2,74.3,null];g.save.jumps=[0,1];Object.assign(g.mission,{index:11,status:'active',phase:1,timer:96,progress:15,started:true});g.combat.weapon=2;
  if(name==='autumn'){
    g.flying=g.parkedHeli;Object.assign(g.flying,{x:-65,z:-85,y:78,heading:.55,speed:28});Object.assign(g.player,{x:-65,z:-85,y:78,heading:.55});g.flying.mesh.position.set(-65,78,-85);g.flying.mesh.rotation.y=.55;g.flying.cone.visible=false;g.avatar.mesh.visible=false;g.save.done=6;g.save.cash=21850;g.save.respect=61;Object.assign(g.mission,{index:6,phase:1,timer:142,progress:3});g.dialogue='Luz is on the Glass Quarter roof. Keep the Kite steady. Watch that crosswind.';g.dj='Mara on SOL WAVE: Orange leaves over a city that never slows down.';
  }else if(name==='spring'){
    Object.assign(g.player,{x:-1,z:-55,y:0,heading:.2});g.combat.weapon=1;g.inCover=true;g.avatar.gun.visible=true;Object.assign(g.mission,{index:2,phase:0,timer:134,progress:0,started:true});g.save.done=2;g.save.cash=9450;g.save.respect=29;g.dialogue='Stay behind the taxi. They’re pushing through the market. I’ve got your exit.';g.dj='Niko: Light showers, market crowds, three patrol units. Mind the people, Dani.';g.police.heat=3;g.police.seen=true;g.police.mode='VISUAL CONTACT';g.police.lastSeen={x:-1,z:-55};
    const taxi=g.traffic[0];Object.assign(taxi,{x:1,z:-52,heading:.18,speed:0});syncCar(taxi);addUnit(g,-4,-27);addUnit(g,5,-17);addUnit(g,3,-70);g.police.units.forEach((u,i)=>u.status=i===2?'FLANKING':'IN PURSUIT');
    const points=[[-7,-26],[6,-22],[-8,-15],[8,-8]];for(const [x,z] of points){const rival=createPerson(scene,x,z,0x96536e,true);rival.heading=Math.PI;posePerson(rival,1);rival.limbs[1].rotation.x=-1.2;g.combat.enemies.push(rival);}g.muzzle=.1;
    for(const [a,b] of [[[-.5,1.3,-54],[6,1.3,-22]],[[-7,1.4,-26],[1,1.3,-51]]]){const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]),new T.LineBasicMaterial({color:0xffcc83,transparent:true,opacity:.8,toneMapped:false}));scene.add(line);}
    const flash=new T.Mesh(new T.IcosahedronGeometry(.19),new T.MeshBasicMaterial({color:0xffd177,toneMapped:false}));flash.position.set(-.5,1.3,-54);scene.add(flash);
  }else{
    const z=-22;g.car=g.garage[0];Object.assign(g.car,{x:0,z,y:0,heading:-.04,speed:45.3,nitro:.68,health:78,turn:1});Object.assign(g.player,{x:0,z,y:0,heading:-.04});g.speed=g.car.speed;g.car.flame.visible=true;syncCar(g.car,1);g.avatar.mesh.visible=false;g.police.heat=5;g.police.seen=true;g.police.mode='VISUAL CONTACT';g.police.lastSeen={x:0,z};
    for(const [x,offset] of [[-4.3,-5],[-5.3,-12],[-4,17],[5,27]]){const c=addUnit(g,x,z+offset);c.speed=36;c.status=offset<0?'RAMMING':'INTERCEPT';c.heading=offset===17?-.1:0;syncCar(c,1);}
    makeRoadblock(g,{x:0,z:24});g.police.heli=createHelicopter(scene,-5,8,0x31465d);Object.assign(g.police.heli,{x:-5,z:8,y:16,heading:.25});g.police.heli.mesh.position.set(-5,16,8);g.police.heli.mesh.rotation.y=.25;g.police.heli.cone.material.uniforms.opacity.value=.12;g.effects.igniteBattle(0,18);g.dialogue='The reserve is in your trunk. Cut through the barricade, Dani. Bring the money home.';g.dj=name==='winter'?'Niko: Snow on the Mile. Fire at the reserve. Five stars and no turning back.':'Niko: FIVE STARS on Pearl Mile. Falcon overhead. The whole city is watching.';
    if(name==='winter'){g.env.hour=22.1;g.car.paint.color.setHex(0x53b8b1);g.dialogue='They lit the barricades. Follow my voice through the snow. Pearl House is still open.';}
    g.traffic.slice(0,5).forEach((c,i)=>{Object.assign(c,{x:i%2?5:-5,z:55+i*16,axis:1,dir:1,heading:0});syncCar(c);});
  }
  Object.assign(g.avatar,g.player);posePerson(g.avatar,1,name==='spring');if(name==='spring'){g.avatar.limbs[1].rotation.x=-1.3;g.avatar.limbs[3].rotation.x=-1.3;g.avatar.mesh.position.y=-.25;}
  g.people.slice(0,100).forEach((p,i)=>{p.x=(i%2?1:-1)*(12.6+(i%5)*.85);p.z=-44+Math.floor(i/2)*1.8;p.homeX=p.x;p.homeZ=p.z;});
  g.speed=g.car?.speed||g.flying?.speed||0;g.time=5.4;updateCrowds(g,0);g.effects.update(0);g.ui.notify('',0);document.getElementById('toast').classList.remove('show');g.ui.draw(1);g.cameraSnap=true;
}
if(shot)stageSeasonShot(shot);
let previous=performance.now(),frames=0;
function frame(now){requestAnimationFrame(frame);const dt=clamp((now-previous)/1000,0,.05);previous=now;controls();if(game.shot){game.time+=dt;updateEnvironment(game,dt);updateCrowds(game,0);game.effects.update(dt);game.speed=game.car?.speed||game.flying?.speed||0;for(const c of game.police.units)syncCar(c,game.time);if(game.police.heli){const h=game.police.heli;h.rotor.rotation.y=game.time*34;h.cone.rotation.z=Math.sin(game.time*.7)*.1;}if(game.flying)game.flying.rotor.rotation.y=game.time*34;}else if(game.started&&!game.paused)simulation(game.slow>0?dt*.5:dt);else{updateEnvironment(game,dt);updateCrowds(game,0);}
  updateCamera(dt||.016);game.ui.draw(dt);view.draw();pressed.clear();if(++frames>4)window.__shotReady=true;
}
document.addEventListener('visibilitychange',()=>{held.clear();mouseDown=false;if(document.hidden&&game.started&&!shot){game.paused=true;document.getElementById('menu').classList.remove('hidden');}});
window.solmara={game,startGame,startMission,updateMission,missionTarget,failMission,interact,simulation,fireWeapon,setSeason,clearPolice,reportCrime,lineOfSight,stageSeasonShot};
requestAnimationFrame(frame);
