import * as T from '../vendor/three.module.min.js';
import { clamp,randomSeed,distance,bearing,wrap,WEAPONS } from './config.js';
import { moveOnStreets,lineOfSight,surfaceHeight } from './city.js';
import { sound } from './audio.js';

const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,10,7),cache=new Map();
export function mat(color,roughness=.5){const key=color+':'+roughness;if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({color,roughness,metalness:roughness<.4?.5:.05}));return cache.get(key);}
export function piece(group,x,y,z,w,h,d,material,geo=cube){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
export function emissive(color,intensity=2){return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.3});}
// Merge rigid vehicle geometry by material; moving rotors and light bars stay independent.
function mergeRigid(group,exclude=[]){const groups=new Map();for(const m of [...group.children]){if(!m.isMesh||exclude.includes(m))continue;m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix).toNonIndexed();if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push([m,g]);}
  for(const [material,list] of groups){const merged=new T.BufferGeometry();for(const key of ['position','normal','uv']){const attrs=list.map(e=>e[1].attributes[key]);if(attrs.some(a=>!a))continue;const data=new Float32Array(attrs.reduce((s,a)=>s+a.array.length,0));let at=0;for(const a of attrs){data.set(a.array,at);at+=a.array.length;}merged.setAttribute(key,new T.BufferAttribute(data,attrs[0].itemSize));}for(const [m,g] of list){group.remove(m);g.dispose();}const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}}
const dark=mat(0x111d28),glass=mat(0x294f61,.12),chrome=mat(0x9baeb3,.22),white=mat(0xe5e1cf);
export function createCar(scene,x,z,color=0xe97b65,kind='MARINER GT'){
  const mesh=new T.Group(),paint=new T.MeshStandardMaterial({color,roughness:.24,metalness:.5}),police=kind==='POLICE',taxi=kind==='CORA TAXI';
  piece(mesh,0,.76,0,2.55,.66,5.15,paint);piece(mesh,0,.49,0,2.6,.2,4.8,dark);
  piece(mesh,0,1.26,-.25,2.14,.7,2.55,glass);piece(mesh,0,1.67,-.42,2.18,.15,2.3,police?white:paint);
  piece(mesh,0,1.2,1.05,2.18,.12,.14,paint);piece(mesh,0,1.17,-1.59,2.2,.12,.14,paint);
  for(const side of [-1,1]){piece(mesh,side*1.08,1.3,-.37,.12,.65,.12,paint);piece(mesh,side*1.36,1.16,.7,.26,.13,.43,paint);piece(mesh,side*1.29,.75,-.1,.035,.28,1.8,police?white:paint);piece(mesh,side*.8,.85,2.59,.7,.16,.03,emissive(0xffe3b7,2));piece(mesh,side*.85,.85,-2.59,.65,.18,.03,emissive(0xff324f,3));}
  piece(mesh,0,.66,2.6,1.1,.23,.06,dark);piece(mesh,0,.54,2.6,2.3,.1,.12,chrome);piece(mesh,0,.57,-2.62,2.4,.1,.1,chrome);piece(mesh,0,.8,-2.63,.68,.2,.03,white);
  if(!police){piece(mesh,0,1.15,-2.22,2.7,.11,.5,dark);for(const s of [-1,1])piece(mesh,s,1,-2.22,.08,.35,.12,dark);}
  for(const side of [-1,1])for(const zz of [-1.65,1.55]){const wheel=piece(mesh,side*1.25,.43,zz,1,1,1,dark,new T.CylinderGeometry(.43,.43,.27,12));wheel.rotation.z=Math.PI/2;const hub=piece(mesh,side*1.4,.43,zz,.04,.55,.55,chrome,sphere);}
  const bars=[];
  if(police){piece(mesh,0,1.85,-.3,1.8,.15,.42,dark);for(const [sx,c] of [[-.5,0x187fff],[.5,0xff214d]])bars.push(piece(mesh,sx,1.99,-.3,.69,.23,.44,emissive(c,5)));}
  if(taxi)piece(mesh,0,1.86,-.3,.9,.28,.4,emissive(0xffcc58));
  const flame=new T.Group();for(const sx of [-.7,.7]){const f=piece(flame,sx,.5,-3.3,.22,1.9,.22,emissive(0x48cfff,6),new T.ConeGeometry(1,1,8));f.rotation.x=-Math.PI/2;}flame.visible=false;mesh.add(flame);
  mergeRigid(mesh,[...bars]);mesh.position.set(x,0,z);scene.add(mesh);
  return {mesh,x,z,y:0,heading:0,speed:0,vx:0,vz:0,health:100,nitro:1,kind,paint,bars,flame,air:0,vy:0,turn:0,stolen:false};
}
export function syncCar(c,time=0){c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.set(c.air?-.14:0,c.heading,-clamp(c.turn*.035,-.1,.1));for(let i=0;i<c.bars.length;i++)c.bars[i].material.emissiveIntensity=(Math.floor(time*10)%2===i?6:1.7);}
export function driveCar(c,dt,i,g){
  const before=c.speed,max=g.save.upgrades.includes('engine')?66:51;c.speed+=((i.forward?30:0)-(i.back?44:0))*dt;c.speed*=Math.exp(-dt*(i.brake?3.5:.4));
  const boost=i.boost&&i.forward&&c.nitro>.01;c.flame.visible=boost;c.nitro=clamp(c.nitro+dt*(boost?-.24:g.save.upgrades.includes('nos')?.12:.06),0,1);if(boost)c.speed+=48*dt;c.speed=clamp(c.speed,-15,max+(boost?21:0));
  c.turn=i.steer*(1.65-Math.min(.9,Math.abs(c.speed)*.012))*Math.sign(c.speed||1);c.heading+=c.turn*dt;
  const grip=Math.min(1,dt*(i.brake?1.5:g.env.wet>.7?4:8));c.vx+=(Math.sin(c.heading)*c.speed-c.vx)*grip;c.vz+=(Math.cos(c.heading)*c.speed-c.vz)*grip;
  if(c.air>0){c.air-=dt;c.vy-=dt*23;c.y=Math.max(0,c.y+c.vy*dt);c.x=clamp(c.x+c.vx*dt,-310,310);c.z=clamp(c.z+c.vz*dt,-310,310);if(c.y===0&&c.vy<0){c.air=0;g.activities.land(c.jump,c.speed);}}
  else if(moveOnStreets(g.city,c,c.vx*dt,c.vz*dt,1.35)){if(Math.abs(before)>8){c.health-=Math.abs(before)*.15;g.shake=.2;sound('impact');}c.speed*=-.16;c.vx*=.2;c.vz*=.2;}
  for(let n=0;n<g.city.ramps.length;n++)if(c.air<=0&&distance(c,g.city.ramps[n])<5&&c.speed>25){c.air=1.4;c.vy=16;c.jump=n;g.slow=.8;g.notify('AIRTIME / STICK THE LANDING');}
  for(const other of [...g.traffic,...g.police.units])if(other!==c&&c.y<2&&distance(c,other)<3.2){const impact=Math.abs(c.speed-other.speed);c.speed*=.8;other.speed*=.7;c.health-=impact*dt;if(impact>18)g.commitCrime('dangerous collision',.18);}
  if(Math.abs(c.speed)>30){const near=g.traffic.find(o=>o!==c&&distance(c,o)>3.4&&distance(c,o)<5);if(near&&g.time>(g.nearCool||0)){g.nearCool=g.time+4;g.save.respect=clamp(g.save.respect+1,0,100);g.slow=.3;g.notify('NEAR MISS / RESPECT +1');}}
  syncCar(c,g.time);
}
export function createHelicopter(scene,x,z,color=0xe2a15f){
  const mesh=new T.Group(),paint=mat(color,.3);piece(mesh,0,1.3,0,1.5,.9,2.4,paint,sphere);piece(mesh,0,1.35,1.3,1.3,.75,1.3,glass,sphere);piece(mesh,0,1.4,-3.3,.3,.35,4.7,paint);piece(mesh,0,2,-5.2,.2,1.6,1,paint);piece(mesh,0,2.5,0,.2,1,.2,chrome);
  const rotor=new T.Group();rotor.position.y=3;piece(rotor,0,0,0,12,.065,.24,dark);piece(rotor,0,0,0,.24,.065,12,dark);mesh.add(rotor);
  const tail=new T.Group();tail.position.set(.25,2,-5.3);piece(tail,0,0,0,.08,2.3,.18,dark);mesh.add(tail);
  for(const s of [-1,1]){piece(mesh,s*1.3,.15,0,.14,.16,4.2,dark);for(const zz of [-1,1])piece(mesh,s*.9,.6,zz,.1,1,.1,chrome);piece(mesh,s*1.55,1.4,0,.16,.16,.16,emissive(s<0?0xff354d:0x47ffd5,5));}
  const coneMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{opacity:{value:.16}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){float edge=pow(sin(vUv.x*3.14159),.6);gl_FragColor=vec4(.65,.85,1.,edge*pow(vUv.y,1.3)*opacity);}' });
  const cone=new T.Mesh(new T.ConeGeometry(7,24,32,1,true),coneMat);cone.position.set(0,-10.5,2);cone.rotation.x=-.15;mesh.add(cone);
  const spot=new T.SpotLight(0xc7e7ff,700,85,.32,.7,1.5);spot.position.set(0,1,1);spot.target.position.set(0,-24,5);mesh.add(spot,spot.target);mergeRigid(mesh,[cone]);mesh.scale.setScalar(1.4);scene.add(mesh);mesh.position.set(x,0,z);
  return {mesh,rotor,tail,cone,spot,x,z,y:0,heading:0,speed:0,health:140};
}
export function flyHelicopter(h,dt,i,g){h.heading+=i.steer*dt;h.speed=clamp((h.speed+((i.forward?24:0)-(i.back?24:0))*dt)*Math.exp(-dt*.5),-18,44);const floor=surfaceHeight(g.city,h.x,h.z);h.y=clamp(h.y+(i.up?15:i.down?-12:0)*dt,0,160);if(h.y<floor){h.y=floor;h.health-=dt*9;}if(h.y>2&&moveOnStreets(g.city,h,Math.sin(h.heading)*h.speed*dt,Math.cos(h.heading)*h.speed*dt,2)){h.speed*=-.5;h.health-=dt*15;}h.mesh.position.set(h.x,h.y,h.z);h.mesh.rotation.set(h.speed*.004,h.heading,-i.steer*.08);h.rotor.rotation.y+=dt*35;h.tail.rotation.x+=dt*30;h.cone.visible=h.y>6;}
export function createPerson(scene,x,z,color=0xddb68c,enemy=false){
  const mesh=new T.Group(),limbs=[];piece(mesh,0,1.22,0,.6,.72,.36,mat(color));piece(mesh,0,1.87,0,.23,.28,.23,mat(0xbb8869),sphere);piece(mesh,0,2.02,-.025,.25,.12,.24,dark,sphere);
  for(const s of [-1,1]){limbs.push(piece(mesh,s*.18,.47,0,.23,.9,.25,mat(0x23384b)));limbs.push(piece(mesh,s*.43,1.2,0,.18,.72,.2,mat(0xbb8869)));}
  const gun=new T.Group();piece(gun,0,0,.13,.12,.15,.55,dark);gun.position.set(.4,1.2,.4);mesh.add(gun);gun.visible=enemy;scene.add(mesh);return {mesh,x,z,y:0,heading:0,health:100,enemy,alive:true,limbs,gun,cool:1,phase:x+z};
}
export function posePerson(p,t,moving=false){p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=p.heading;p.limbs.forEach((limb,i)=>limb.rotation.x=moving?Math.sin(t*9+i%2*Math.PI)*.5:0);}
export function populateStreets(scene){
  const rand=randomSeed(872),traffic=[],people=[],crowdParts=[],dummy=new T.Object3D();
  for(let i=0;i<40;i++){const axis=i%2,lane=(Math.floor(i/5)-4)*64+(i%4<2?4.6:-4.6),p=-290+rand()*580,c=createCar(scene,axis?lane:p,axis?p:lane,[0x459a9f,0xe3bd7b,0xaec4c1,0x8b4c70,0x516a89,0xe2937f][i%6],i%8===0?'CORA TAXI':'CORA SEDAN');c.axis=axis;c.dir=i%4<2?1:-1;c.speed=9+rand()*5;c.heading=axis?(c.dir>0?0:Math.PI):(c.dir>0?Math.PI/2:-Math.PI/2);syncCar(c);traffic.push(c);}
  for(let i=0;i<280;i++){
    // Half the population works, shops and socializes on the Pearl Mile.
    const busy=i<150,side=i%2?1:-1,x=busy?side*(12.7+rand()*5):(i%9-4)*64+side*13,z=busy?-115+rand()*255:-295+rand()*590;
    people.push({x,z,y:0,homeX:x,homeZ:z,dir:side,activity:['walk','shop','chat','cafe','work','cross'][i%6],phase:rand()*7,heading:rand()*6,color:i%6});
  }
  const defs=[[0,1.22,0,.58,.72,.36],[0,1.88,0,.25,.3,.25],[-.18,.45,0,.22,.9,.24],[.18,.45,0,.22,.9,.24],[-.42,1.18,0,.17,.75,.18],[.42,1.18,0,.17,.75,.18]];
  const palette=[0xe8b387,0x47a29e,0xd4778d,0xb8bdb0,0xdbad53,0x7c779e];
  for(let k=0;k<defs.length;k++)for(let c=0;c<6;c++){const ids=people.map((p,i)=>p.color===c?i:-1).filter(i=>i>=0),m=new T.InstancedMesh(k===1?sphere:cube,mat(k===0?palette[c]:k===1||k>3?[0xb78060,0xdbaf85,0x805a47][c%3]:0x25394a),ids.length);m.castShadow=true;m.frustumCulled=false;scene.add(m);crowdParts.push({mesh:m,ids,k,def:defs[k]});}
  return {traffic,people,crowdParts,dummy};
}
export function updateCrowds(g,dt){
  const t=g.time;
  for(const p of g.people){const panic=g.police.heat>0&&distance(p,g.player)<40;
    if(panic){p.heading=p.x<0?-1.1:1.1;p.x+=Math.sin(p.heading)*dt*2.6;p.z+=Math.cos(p.heading)*dt*2.6;}
    else if(p.activity==='walk'){p.z+=dt*p.dir*1.1;p.heading=p.dir>0?0:Math.PI;}
    else if(p.activity==='cross'){p.x=p.homeX+Math.sin(t*.12+p.phase)*12;p.heading=Math.cos(t*.12+p.phase)>0?Math.PI/2:-Math.PI/2;}
    else p.heading=p.x>0?Math.PI/2:-Math.PI/2;
    if(Math.abs(p.z)>300)p.dir*=-1;
  }
  const dummy=g.population.dummy;
  for(const part of g.population.crowdParts){const [x,y,z,w,h,d]=part.def;part.ids.forEach((id,i)=>{const p=g.people[id],near=distance(p,g.player)<(g.flying?430:155),panic=g.police.heat>0&&distance(p,g.player)<40,moving=panic||p.activity==='walk'||p.activity==='cross';let angle=part.k>1&&moving?Math.sin(t*9+p.phase+(part.k%2)*Math.PI)*.6:0;let yy=y,zz=z;if(p.activity==='cafe'&&!panic){yy-=.45;if(part.k===2||part.k===3){angle=-1.2;zz+=.3;}}if((p.activity==='chat'||panic)&&part.k===5)angle=-1.3+Math.sin(t*3+p.phase)*.3;
      dummy.position.set(p.x+x*Math.cos(p.heading),yy,p.z-x*Math.sin(p.heading)+zz);dummy.rotation.set(angle,p.heading,0);dummy.scale.set(near?w:0,near?h:0,near?d:0);dummy.updateMatrix();part.mesh.setMatrixAt(i,dummy.matrix);});part.mesh.instanceMatrix.needsUpdate=true;}
}
export function updateTraffic(g,dt){for(const c of g.traffic){if(c===g.car||c.stolen||c.health<=0)continue;const axis=c.axis,pos=axis?c.z:c.x,cross=Math.abs(pos-Math.round(pos/64)*64)<14,red=cross&&Math.floor(g.time/8)%2===axis,blocked=g.traffic.some(o=>o!==c&&o.axis===axis&&distance(c,o)<7&&Math.cos(bearing(c,o)-c.heading)>.8);c.speed+=(red||blocked?-c.speed:12-c.speed)*Math.min(1,dt*2);if(axis)c.z+=c.speed*c.dir*dt;else c.x+=c.speed*c.dir*dt;if(Math.abs(c.x)>300)c.x=-Math.sign(c.x)*298;if(Math.abs(c.z)>300)c.z=-Math.sign(c.z)*298;syncCar(c,g.time);c.mesh.visible=distance(c,g.player)<(g.flying?460:200);}updateCrowds(g,dt);}
export function createCombat(){return {weapon:0,cool:0,kills:0,enemies:[],targets:[],tracers:[],shots:0};}
export function spawnRivals(g,points){for(const p of g.combat.enemies)g.scene.remove(p.mesh);g.combat.enemies=points.map(([x,z])=>createPerson(g.scene,x,z,0xb55777,true));g.combat.kills=0;}
function tracer(g,a,b,color=0xffe0a0){const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(a.x,a.y||1.4,a.z),new T.Vector3(b.x,b.y||1.3,b.z)]),new T.LineBasicMaterial({color,toneMapped:false}));g.scene.add(line);g.combat.tracers.push({line,ttl:.09});}
export function fireWeapon(g){const c=g.combat,w=WEAPONS[c.weapon];if(g.car||g.flying||c.cool>0)return;if(g.save.ammo[c.weapon]<=0){g.notify('EMPTY / ESTRELLA SELLS AMMUNITION');c.cool=.5;return;}g.save.ammo[c.weapon]--;c.cool=w.delay;c.shots++;g.commitCrime('gunfire',.5);sound('gun');g.muzzle=.09;
  for(let i=0;i<w.pellets;i++){const angle=g.player.heading+(Math.random()-.5)*w.spread;let target=null,range=w.range;for(const e of [...c.enemies,...c.targets,...g.police.units]){const d=distance(g.player,e);if(e.health>0&&d<range&&Math.abs(wrap(bearing(g.player,e)-angle))<Math.atan2(e.kind?1.5:.65,d)+.035&&lineOfSight(g.city,g.player,e)){range=d;target=e;}}
    if(target){target.health-=w.damage;if(target.health<=0){if(target.enemy){target.alive=false;c.kills++;target.mesh.rotation.z=Math.PI/2;target.mesh.position.y=.3;}else{target.speed=0;g.effects.explode(target.x,target.z);}}}tracer(g,g.player,{x:g.player.x+Math.sin(angle)*range,z:g.player.z+Math.cos(angle)*range});}
}
export function updateCombat(g,dt){const c=g.combat;c.cool=Math.max(0,c.cool-dt);for(let i=c.tracers.length-1;i>=0;i--){const t=c.tracers[i];t.ttl-=dt;if(t.ttl<=0){g.scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();c.tracers.splice(i,1);}}
  for(const e of c.enemies){if(!e.alive)continue;e.cool-=dt;const d=distance(e,g.player),visible=d<65&&lineOfSight(g.city,e,g.player);e.heading=bearing(e,g.player);if(visible&&d>18)moveOnStreets(g.city,e,Math.sin(e.heading)*dt*2.5,Math.cos(e.heading)*dt*2.5,.5);if(visible&&e.cool<=0){e.cool=1.4+Math.random();g.damage(g.inCover?1.2:4);tracer(g,e,g.player,0xff5473);}posePerson(e,g.time,visible&&d>18);}
  g.avatar.gun.visible=!g.car&&!g.flying;g.avatar.gun.scale.z=c.weapon===2?1.8:c.weapon===1?1.3:1;
}
