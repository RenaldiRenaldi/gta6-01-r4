import * as T from '../vendor/three.module.min.js';
import { createCar,createPerson,posePerson,piece,mat,emissive,syncCar } from './actors.js';
import { randomSeed,distance } from './config.js';
import { sound } from './audio.js';

export function createEffects(g){
  const rand=randomSeed(384),fires=[],debris=[],fighters=[],policeStreaks=[],sparks=[];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.25,'rgba(255,220,160,.85)');gradient.addColorStop(.55,'rgba(255,130,60,.4)');gradient.addColorStop(1,'transparent');c.fillStyle=gradient;c.fillRect(0,0,64,64);const soft=new T.CanvasTexture(canvas);
  const flameGeometry=new T.IcosahedronGeometry(1,1),smokeGeometry=new T.IcosahedronGeometry(1,1);
  function burn(x,z,size=1){const root=new T.Group();g.scene.add(root);root.position.set(x,0,z);const flames=[],smoke=[];
    for(let i=0;i<18;i++){const m=new T.Mesh(flameGeometry,emissive(i%3===0?0xffde6a:i%2?0xff621a:0xffa52b,2.3));root.add(m);flames.push({m,phase:rand()*6,x:(rand()-.5)*3*size,z:(rand()-.5)*3*size,size});}
    for(let i=0;i<13;i++){const m=new T.Sprite(new T.SpriteMaterial({map:soft,color:i%2?0x282b37:0x52424a,transparent:true,opacity:.58,depthWrite:false}));root.add(m);smoke.push({m,phase:i/13,x:(rand()-.5)*2});}
    const glow=new T.Sprite(new T.SpriteMaterial({map:soft,color:0xff6e15,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.position.y=3;glow.scale.set(13*size,16*size,1);root.add(glow);
    const light=new T.PointLight(0xff681b,95,33,1.6);light.position.set(0,3,0);root.add(light);g.city.reflect(x,z-7,0xff772a,8*size,24,.7);const f={root,x,z,flames,smoke,light,size,glow};fires.push(f);return f;
  }
  function explode(x,z){
    if(fires.some(f=>distance(f,{x,z})<4))return;burn(x,z,1.2);g.shake=.45;sound('explosion');
    for(let i=0;i<20;i++){const m=new T.Mesh(new T.BoxGeometry(.2+rand()*.7,.15+rand()*.4,.3+rand()*.7),mat(i%2?0x323d46:0x9b6151));m.position.set(x,2,z);g.scene.add(m);debris.push({m,vx:(rand()-.5)*17,vy:3+rand()*12,vz:(rand()-.5)*17,life:8});}
    const flash=new T.Sprite(new T.SpriteMaterial({map:soft,color:0xffbb55,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));flash.position.set(x,3,z);flash.scale.set(20,20,1);g.scene.add(flash);sparks.push({m:flash,life:.5});
  }
  let battle=null;
  function igniteBattle(x=0,z=40){if(battle)return;battle={x,z};
    const wreck=createCar(g.scene,x-7,z-2,0x322c36,'BURNING CORA');wreck.heading=.5;wreck.health=0;wreck.mesh.rotation.z=.09;syncCar(wreck);explode(x-7,z-2);burn(x+9,z+4,.7);
    for(let i=0;i<7;i++){const barricade=new T.Group();piece(barricade,0,.9,0,2.4,1.7,.7,mat(i%2?0x7d5550:0x394653));for(let a=-1;a<=1;a++)piece(barricade,a*.7,1.1,-.4,.22,1.1,.04,emissive(0xffaa55,.3));barricade.position.set(x-11+i*3.6,0,z+7);barricade.rotation.y=i*.13;g.scene.add(barricade);if(i===1||i===5)burn(x-11+i*3.6,z+7,.65);}
    for(let i=0;i<32;i++){const cop=i>=18,px=x+(i%9-4)*2.05,pz=z+(cop?11:1)+Math.floor(i/9)*1.6,p=createPerson(g.scene,px,pz,cop?0x263c58:[0xe6bc8a,0xcb657a,0x48a6a0,0xddd1ad][i%4],false);p.cop=cop;p.homeX=px;p.homeZ=pz;p.action=i%5;fighters.push(p);if(cop){const shield=piece(p.mesh,0,1.1,-.5,.7,1.1,.1,mat(0x698a9c,.2));piece(p.mesh,0,2.03,0,.32,.17,.3,mat(0x233a51));}}
    for(let i=0;i<25;i++){const m=new T.Mesh(new T.BoxGeometry(.09,.09,.09),emissive(0xffb94d,4));g.scene.add(m);sparks.push({m,ember:true,x:x-7,z:z-2,phase:rand()*6,life:Infinity});}
    g.notify('PORT RESERVE BLAST / PEARL MILE IS ERUPTING',7);
  }
  function attachPoliceLights(car){for(const [sx,color] of [[-.7,0x2584ff],[.7,0xff284a]]){const streak=g.city.reflect(car.x+sx,car.z-4,color,2.4,18,.7);policeStreaks.push({car,streak,sx});}}
  function update(dt){const t=g.time;
    for(const f of fires){for(let i=0;i<f.flames.length;i++){const a=f.flames[i],cycle=(t*.7+a.phase)%1,m=a.m;m.position.set(a.x,1+cycle*5*f.size,a.z);m.scale.set((1-cycle)*(.7+Math.sin(t*7+i)*.12)*f.size,(1.8-cycle)*f.size,(1-cycle)*.65*f.size);m.rotation.set(t*.6+i,t+i,Math.sin(t*3+i)*.2);}
      for(const a of f.smoke){const cycle=(t*.065+a.phase)%1;a.m.position.set(a.x+cycle*4,4+cycle*24,a.x+Math.sin(cycle*6)*2);a.m.scale.setScalar((5+cycle*12)*f.size);a.m.material.opacity=(1-cycle)*.48;a.m.material.rotation=t*.12+a.phase;}
      f.light.intensity=90+Math.sin(t*15)*25+Math.sin(t*23)*15;f.glow.material.opacity=.18+Math.sin(t*10)*.04;
    }
    for(const p of fighters){const flee=p.action===0&&!p.cop;p.x=p.homeX+(flee?Math.sin(t*.8+p.phase)*3:Math.sin(t*2+p.phase)*.4);p.z=p.homeZ+(flee?Math.cos(t*.8+p.phase)*3:Math.sin(t*2.3+p.phase)*.65);p.heading=p.cop?Math.PI:0;posePerson(p,t,true);if(!flee){p.limbs[1].rotation.x=-1.25+Math.sin(t*6+p.phase)*.7;p.limbs[3].rotation.x=-1.3+Math.cos(t*6+p.phase)*.7;}}
    for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.life-=dt;if(d.m.position.y>.12){d.vy-=dt*20;d.m.position.x+=d.vx*dt;d.m.position.y=Math.max(.12,d.m.position.y+d.vy*dt);d.m.position.z+=d.vz*dt;d.m.rotation.x+=dt*4;}if(d.life<0){g.scene.remove(d.m);debris.splice(i,1);}}
    for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];if(s.ember){const a=(t*.7+s.phase)%1;s.m.position.set(s.x+Math.sin(s.phase*5)*a*4,1+a*12,s.z+Math.cos(s.phase*4)*a*3);}else{s.life-=dt;s.m.material.opacity=Math.max(0,s.life*2);if(s.life<=0){g.scene.remove(s.m);sparks.splice(i,1);}}}
    for(const {car,streak,sx} of policeStreaks){streak.visible=!!car.mesh.parent;streak.position.set(car.x+sx,.08,car.z-5);streak.material.opacity=.5+Math.sin(t*12+sx)*.15;}
  }
  return {explode,igniteBattle,attachPoliceLights,update,fires,fighters,get battle(){return battle;}};
}
