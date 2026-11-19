import { createCar,createHelicopter,syncCar } from './actors.js';
import { distance,bearing,wrap,clamp } from './config.js';
import { lineOfSight,moveOnStreets } from './city.js';

export function createPolice(){return {heat:0,seen:false,lost:0,lastSeen:{x:0,z:0},units:[],heli:null,dispatch:0,blockTimer:15,mode:'CITY PATROL',roadblocks:[],crimeCooldown:0};}
// Heat records crimes; only a visual observer refreshes lastSeen during pursuit.
export function reportCrime(g,kind,amount=1){const p=g.police;if(p.crimeCooldown>0&&amount<1)return;p.crimeCooldown=.7;p.heat=clamp(p.heat+amount,0,5);p.lost=0;p.lastSeen={x:g.player.x,z:g.player.z};g.radioMessage('Niko: '+kind+' on '+g.district()+'. Dispatch has your plate.');}
const node=p=>({x:clamp(Math.round(p.x/64)*64,-256,256),z:clamp(Math.round(p.z/64)*64,-256,256)});
export function planRoadRoute(from,to){const a=node(from),b=node(to),key=p=>p.x+','+p.z,queue=[a],prior=new Map([[key(a),null]]),nodes=new Map([[key(a),a]]);for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p)===key(b))break;const neighbors=[[64,0],[-64,0],[0,64],[0,-64]].map(([x,z])=>({x:p.x+x,z:p.z+z})).sort((u,v)=>distance(u,b)-distance(v,b));for(const q of neighbors){if(Math.abs(q.x)>256||Math.abs(q.z)>256||prior.has(key(q)))continue;prior.set(key(q),key(p));nodes.set(key(q),q);queue.push(q);}}const result=[];let at=key(b);while(at&&prior.has(at)){result.push(nodes.get(at));at=prior.get(at);}return result.reverse();}
export function addUnit(g,x,z,block=false){const c=createCar(g.scene,x,z,0x233952,'POLICE');c.name=['IBIS-43','KESTREL-31','OSPREY-09','TERN-18','HERON-62','SWIFT-24','GULL-71'][g.police.units.length%7];c.block=block;c.route=[];c.repath=0;c.heading=block?Math.PI/2:0;c.status=block?'ROADBLOCK':'INTERCEPT';syncCar(c,g.time);g.police.units.push(c);g.effects.attachPoliceLights(c);return c;}
export function makeRoadblock(g,where){const p=where||node({x:g.player.x+Math.sin(g.player.heading)*100,z:g.player.z+Math.cos(g.player.heading)*100});if(g.police.roadblocks.some(b=>distance(b,p)<40))return;const cars=[addUnit(g,p.x-6,p.z,true),addUnit(g,p.x+5,p.z,true)];g.police.roadblocks.push({...p,cars,age:0});g.notify('KESTREL-31 / ROADBLOCK AHEAD');}
export function clearPolice(g){const p=g.police;for(const c of p.units)g.scene.remove(c.mesh);if(p.heli)g.scene.remove(p.heli.mesh);Object.assign(p,createPolice());}
export function updatePolice(g,dt){
  const p=g.police;p.dispatch-=dt;p.blockTimer-=dt;p.crimeCooldown=Math.max(0,p.crimeCooldown-dt);if(p.heat<.05){if(p.units.length)clearPolice(g);return;}
  const stars=Math.ceil(p.heat),range=g.env.weather==='FOG'?42:g.env.weather==='THUNDERSTORM'?66:110;
  if(p.dispatch<=0&&p.units.filter(c=>!c.block).length<stars+1){p.dispatch=2.4;const offsets=[[0,-128],[-128,0],[128,0],[0,128]],off=offsets[p.units.length%4],n=node({x:p.lastSeen.x+off[0],z:p.lastSeen.z+off[1]});addUnit(g,n.x+4,n.z);}
  let seen=false;
  for(const c of p.units){if(c.health<=0){c.status='DISABLED';c.speed=0;continue;}const d=distance(c,g.player),a=bearing(c,g.player),visual=d<range&&(Math.abs(wrap(a-c.heading))<1.4||d<24)&&lineOfSight(g.city,{...c,y:1.8},{...g.player,y:g.player.y+1.3});seen||=visual;
    if(c.block){c.status='ROADBLOCK';syncCar(c,g.time);continue;}c.repath-=dt;if(c.repath<=0){c.route=planRoadRoute(c,p.lastSeen);c.repath=1.2;}while(c.route.length>1&&distance(c,c.route[0])<10)c.route.shift();const target=visual&&d<65?g.player:c.route[0]||p.lastSeen,delta=clamp(wrap(bearing(c,target)-c.heading),-dt*2.5,dt*2.5);c.heading+=delta;c.turn=delta/Math.max(.001,dt);c.speed+=((d<7?8:visual?25+stars*2.2:19)-c.speed)*Math.min(1,dt*2);
    if(moveOnStreets(g.city,c,Math.sin(c.heading)*c.speed*dt,Math.cos(c.heading)*c.speed*dt,1.4)){c.speed*=.6;c.repath=0;c.heading+=dt*2;}c.status=d<9?'RAMMING':visual?'IN PURSUIT':'SEARCHING';if(visual&&d<22&&!g.flying)g.damage(dt*(g.car?1.1:g.inCover?1.4:5));if(d<4&&g.car){g.car.health-=dt*5;g.car.speed*=Math.exp(-dt*.4);}syncCar(c,g.time);
  }
  if(stars>=3&&!p.heli){p.heli=createHelicopter(g.scene,p.lastSeen.x-35,p.lastSeen.z+25,0x34485d);p.heli.y=32;}
  if(p.heli){const h=p.heli;h.rotor.rotation.y+=dt*35;h.tail.rotation.x+=dt*30;const focus=p.lastSeen;h.x+=(focus.x+Math.sin(g.time*.2)*20-h.x)*dt*.5;h.z+=(focus.z+Math.cos(g.time*.2)*24-h.z)*dt*.5;h.y=27+Math.sin(g.time*.5)*3;h.heading=bearing(h,focus);h.mesh.position.set(h.x,h.y,h.z);h.mesh.rotation.y=h.heading;const visual=distance(h,g.player)<range&&lineOfSight(g.city,{...h,y:h.y},{...g.player,y:g.player.y+1});seen||=visual;h.spot.target.position.x=Math.sin(g.time*.7)*5;h.cone.rotation.z=Math.sin(g.time*.7)*.13;}
  p.seen=seen;if(seen){p.lost=0;p.lastSeen={x:g.player.x,z:g.player.z};p.mode='VISUAL CONTACT';}else{p.lost+=dt;p.mode=p.lost<5?'BREAKING CONTACT':'SEARCHING / LAST KNOWN';}if(p.lost>12){p.heat=Math.max(0,p.heat-dt*.16);p.mode='COOLING DOWN';}
  if(stars>=4&&p.blockTimer<=0&&Math.abs(g.speed)>10){p.blockTimer=24;makeRoadblock(g);}for(let i=p.roadblocks.length-1;i>=0;i--){const b=p.roadblocks[i];b.age+=dt;if(b.age>60&&distance(b,g.player)>90){for(const car of b.cars){if(car!==g.car)g.scene.remove(car.mesh);p.units=p.units.filter(c=>c!==car);}p.roadblocks.splice(i,1);}}
}
