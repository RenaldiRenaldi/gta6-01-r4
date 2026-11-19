import * as T from '../vendor/three.module.min.js';
import { distance } from './config.js';
import { saveGame } from './storage.js';

export const RACES=[
  // Physical gates share the mission marker and minimap route during a trial.
  {name:'PEARL CIRCUIT',start:[0,-128],limit:100,reward:1200,points:[[0,-64],[64,-64],[128,-64],[128,64],[0,64],[0,-128]]},
  {name:'LANTERN SPRINT',start:[192,0],limit:105,reward:1600,points:[[192,64],[192,192],[256,192],[256,256],[128,256],[0,256]]},
  {name:'CORAL RUN',start:[-128,-128],limit:105,reward:1800,points:[[-192,-128],[-192,0],[-128,0],[-128,128],[-64,128],[-64,-64],[-128,-128]]},
];
export function createActivities(g){
  const positions=[[-12,-108],[12,36],[-76,76],[140,12],[204,140],[-204,-76],[76,-204],[-140,204],[12,272],[268,-116],[-268,-140],[140,268],[-76,-236],[204,-204],[-236,76]],packages=[];
  positions.forEach(([x,z],i)=>{const mesh=new T.Mesh(new T.OctahedronGeometry(.7),new T.MeshStandardMaterial({color:0xf5cc7b,emissive:0xffa445,emissiveIntensity:1}));mesh.position.set(x,1.2,z);mesh.visible=!g.save.packages.includes(i);g.scene.add(mesh);packages.push({x,z,mesh,id:i});});
  for(const r of RACES){const m=new T.Mesh(new T.TorusGeometry(3,.16,6,32),new T.MeshBasicMaterial({color:0xffcf7a}));m.rotation.x=Math.PI/2;m.position.set(r.start[0],.1,r.start[1]);g.scene.add(m);}
  return {packages,race:null,index:0,checkpoint:0,remaining:0,time:0,land(id,speed){if(Math.abs(speed)<15)return;const first=!g.save.jumps.includes(id);if(first){g.save.jumps.push(id);g.save.cash+=600;saveGame(g.save);}g.notify('STUNT LANDED / '+(first?'+$600':'STYLE +100'));}};
}
export function updateActivities(g,dt){const a=g.activities;for(const p of a.packages){p.mesh.rotation.y+=dt;p.mesh.position.y=1.4+Math.sin(g.time*2+p.id)*.2;if(p.mesh.visible&&!g.flying&&distance(p,g.player)<3){p.mesh.visible=false;g.save.packages.push(p.id);g.save.cash+=250;saveGame(g.save);g.notify('HIDDEN LEDGER / +$250 / '+g.save.packages.length+'/15');}}
  if(g.input.take('c')){if(a.race){a.race=null;g.notify('TIME TRIAL ABANDONED');}else{const n=RACES.findIndex(r=>distance(g.player,{x:r.start[0],z:r.start[1]})<15);if(n<0||!g.car)g.notify('C / BRING A CAR TO AN AMBER RACE FLAG');else Object.assign(a,{race:RACES[n],index:n,checkpoint:0,remaining:RACES[n].limit,time:0});}}
  if(a.race){a.time+=dt;a.remaining-=dt;const p=a.race.points[a.checkpoint];if(g.car&&distance(g.player,{x:p[0],z:p[1]})<9){a.checkpoint++;g.notify('RACE CHECKPOINT / '+a.checkpoint);if(a.checkpoint===a.race.points.length){g.save.cash+=a.race.reward;const old=g.save.races[a.index];g.save.races[a.index]=old===null?a.time:Math.min(old,a.time);saveGame(g.save);g.notify('RACE WON / '+a.time.toFixed(2)+'s / +$'+a.race.reward);a.race=null;}}if(a.race&&(a.remaining<=0||g.health<=0||g.car?.health<=0)){a.race=null;g.notify('RACE FAILED / RETURN TO GRID');}}
}
