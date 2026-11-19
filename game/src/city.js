import * as T from '../vendor/three.module.min.js';
import { randomSeed, clamp } from './config.js';

export function buildCity(scene){
  const rand=randomSeed(),batches=new Map(),colliders=[],roofs=[],trees=[],reflections=[],buildingMats=[],lamps=[];
  const material=(color,other={})=>new T.MeshStandardMaterial({color,roughness:.7,...other});
  const mats={road:material(0x24323d,{roughness:.13,metalness:.62}),curb:material(0xb8b8ad),roof:material(0xd4c6b7),leaf:material(0x398c70),trunk:material(0x725143),dark:material(0x172c36),white:material(0xf2dfb8),metal:material(0x58717e,{metalness:.7}),pink:material(0xd98f8b),sand:material(0xdcc394),gold:new T.MeshBasicMaterial({color:0xfad69b}),cyan:new T.MeshBasicMaterial({color:0x45ffda}),red:new T.MeshBasicMaterial({color:0xff426d})};
  function box(x,y,z,w,h,d,mat=mats.curb,rotation=0){if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push([x,y,z,w,h,d,rotation]);}
  function mesh(geo,mat,x,y,z){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);scene.add(m);return m;}
  function ground(w,d,x,z,mat,y=.02){const m=mesh(new T.PlaneGeometry(w,d),mat,x,y,z);m.rotation.x=-Math.PI/2;m.receiveShadow=true;return m;}
  const waterMat=material(0x285d74,{roughness:.18,metalness:.7}),groundMat=material(0x78916b);
  ground(2400,2400,0,0,waterMat,-1);ground(644,644,0,0,groundMat,-.1);ground(24,640,333,0,mats.sand,0);
  // Broken, anisotropic streaks are real world-space emissive reflection geometry.
  const rc=document.createElement('canvas');rc.width=64;rc.height=256;const r=rc.getContext('2d');
  r.save();r.scale(1,4);const grad=r.createRadialGradient(32,25,0,32,25,32);grad.addColorStop(0,'rgba(255,255,255,.85)');grad.addColorStop(.45,'rgba(255,255,255,.28)');grad.addColorStop(1,'transparent');r.fillStyle=grad;r.fillRect(0,0,64,64);r.restore();r.globalCompositeOperation='destination-out';
  for(let i=0;i<100;i++){r.globalAlpha=.2+rand()*.7;r.fillRect(0,rand()*256,64,1+rand()*3);}const reflectionTexture=new T.CanvasTexture(rc);
  function reflect(x,z,color,w=4,d=20,opacity=.4){const m=ground(w,d,x,z,new T.MeshBasicMaterial({map:reflectionTexture,color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),.066+rand()*.005);reflections.push(m);return m;}
  for(let n=-4;n<=4;n++){
    const v=n*64;ground(624,24,0,v,mats.road);ground(24,624,v,0,mats.road,.024);
    for(let j=-300;j<=300;j+=12){if(Math.abs(j-Math.round(j/64)*64)<16)continue;box(v,.05,j,.15,.025,5,mats.gold);box(j,.05,v,5,.025,.15,mats.gold);}
    for(let j=-4;j<=4;j++)for(let k=-3;k<=3;k++){box(v+k*1.8,.055,j*64+15,1,.025,4,mats.white);box(v+15,.056,j*64+k*1.8,4,.025,1,mats.white);}
    // Fine pale road grain catches the dusk rather than a flat colored plane.
    for(let j=0;j<150;j++)box(v+(rand()-.5)*21,.038,-300+rand()*600,.03,.009,.1+rand()*.8,mats.metal);
  }
  const colors=['#acb2a0','#bd9b89','#638c9c','#bd7b82','#7d98a4','#d3bb9a'];
  for(let n=0;n<6;n++){
    const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');g.fillStyle=colors[n];g.fillRect(0,0,128,256);
    const ec=document.createElement('canvas');ec.width=128;ec.height=256;const eg=ec.getContext('2d');eg.fillStyle='#000000';eg.fillRect(0,0,128,256);
    for(let y=0;y<256;y+=20){g.fillStyle='rgba(20,36,45,.25)';g.fillRect(0,y,128,2);for(let x=5;x<128;x+=16){const lit=rand()>.58;g.fillStyle=lit?'#d6be87':'#294655';g.fillRect(x,y+4,9,12);if(lit){eg.fillStyle='#ffd696';eg.fillRect(x,y+4,9,12);}g.fillStyle='#89a6ad';g.fillRect(x,y+16,10,2);}}
    const tex=new T.CanvasTexture(c),et=new T.CanvasTexture(ec);tex.colorSpace=et.colorSpace=T.SRGBColorSpace;
    buildingMats.push(material(0xffffff,{map:tex,emissiveMap:et,emissive:0xffca8a,emissiveIntensity:.3,roughness:.42+n*.07,metalness:.12}));
  }
  function building(x,z,w,d,h,index){
    box(x,h/2,z,w,h,d,buildingMats[(index+60)%6]);box(x,h+.4,z,w+1,.8,d+1,mats.roof);
    for(const side of [-1,1])box(x+side*w/2,h+1,z,.4,1.5,d,mats.roof);
    box(x,h+1.3,z,3.5,2,4,mats.metal);box(x,h+2.4,z,3,.15,3.5,mats.dark);
    if(h>45){box(x,h+5,z,.2,8,.2,mats.metal);box(x,h+8,z,.4,.6,.4,mats.red);}
    colliders.push({x,z,w:w/2+.2,d:d/2+.2,h});roofs.push({x,z,y:h+1,w:w/2-1,d:d/2-1});
  }
  for(let x=-4;x<4;x++)for(let z=-4;z<4;z++){
    if(x===-4&&z>0)continue;const cx=x*64+32,cz=z*64+32;
    box(cx,.12,cz,39,.25,39,mats.curb);
    for(let i=0;i<4;i++){const px=cx+(i%2?10:-10),pz=cz+(i<2?-10:10),core=x>0&&x<3&&z>0&&z<3;let h=core?35+rand()*66:10+rand()*24;if(Math.abs(px)<40&&pz<140)h=12+rand()*16;building(px,pz,17,17,h,x+z+i);}
  }
  function sign(text,x,y,z,width,color='#72ffdb',rotation=Math.PI){
    const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.fillStyle='#10242f';g.fillRect(0,0,512,96);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(3,3,506,90);g.fillStyle=color;g.font='bold 35px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,49,480);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=mesh(new T.PlaneGeometry(width,width*96/512),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}),x,y,z);m.rotation.y=rotation;return m;
  }
  for(const [label,x,z,color] of [['PALMETTO CUSTOMS',18,-48,'#63ffda'],['PEARL HOUSE',-18,-48,'#ffd19a'],['ESTRELLA / ARMS',-18,16,'#ff6a9e'],['SOL WAVE 98.4',18,80,'#ffd277'],['MILE NIGHT MARKET',-18,80,'#ff678d'],['HOTEL MAREA',18,144,'#51edff'],['LANTERN MARINA',-18,272,'#76ffcf']]){
    box(x,2.3,z,10,4.6,8,mats.pink);sign(label,x,4.6,z-4.1,12,color);box(x,3,z-5,12,.22,2,mats.cyan);
    for(const o of [-3,3])box(x+o,1.5,z-4.08,2.2,2.4,.08,mats.dark);reflect(x*.5,z-16,color,7,29,.4);
  }
  sign('SOLMARA / PEARL MILE',0,10,150,23,'#ffd4a0');
  const crowns=[],palmVertices=[],dummy=new T.Object3D();
  function tree(x,z,palm=false){box(x,3.5,z,.35,7,.35,mats.trunk);if(palm){for(let a=0;a<8;a++){const angle=a*Math.PI/4,s=Math.sin(angle),c=Math.cos(angle),mx=x+s*2.7,mz=z+c*2.7;palmVertices.push(x,7,z,mx+c*.65,7.6,mz-s*.65,x+s*5.2,5.8,z+c*5.2,x,7,z,x+s*5.2,5.8,z+c*5.2,mx-c*.65,7.6,mz+s*.65);}}else crowns.push([x,6.4,z]);trees.push({x,z});box(x,.18,z,2,.35,2,mats.curb);}
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
    tree(x*64-14,z*64+23,x>=3||x===0&&z%2===0);tree(x*64+14,z*64-21,x>=3||x===0&&z%2===0);
    for(const side of [-1,1]){const px=x*64+side*12.7,pz=z*64-10;box(px,4,pz,.17,8,.17,mats.dark);box(px-side,7.9,pz,2.1,.15,.5,mats.metal);box(px-side*1.5,7.76,pz,.8,.12,.5,mats.gold);const glow=reflect(px-side*2,pz-1,0xffbd78,5,10,.15);lamps.push(glow);}
  }
  for(const z of [-8,36,100])for(const x of [-14.5,14.5])tree(x,z,true);
  const palmGeo=new T.BufferGeometry();palmGeo.setAttribute('position',new T.Float32BufferAttribute(palmVertices,3));palmGeo.computeVertexNormals();const palmMat=material(0x277760,{side:T.DoubleSide}),palmMesh=new T.Mesh(palmGeo,palmMat);palmMesh.castShadow=true;scene.add(palmMesh);
  sign('MAREA / NIGHT MARKET',-18,7.2,-4,12,'#ff5da6');
  for(const x of [-13,13]){box(x,.17,5,.15,.1,35,x<0?mats.red:mats.cyan);reflect(x*.65,0,x<0?0xff367f:0x34ebd0,3,32,.5);}
  // A real market street: awnings, produce crates, cafe tables and workshop benches.
  const stallColors=[0xf1647f,0x44bea8,0xe3b15a];
  for(let i=0;i<18;i++){
    const side=i%2?1:-1,x=side*15.5,z=-100+Math.floor(i/2)*19;
    box(x,1,z,3.7,1.5,2,mats.trunk);box(x,3.1,z,4.5,.22,3.5,material(stallColors[i%3]));
    for(const sx of [-1.7,1.7])box(x+sx,2,z,.1,2,.1,mats.metal);
    for(let k=0;k<6;k++)box(x-1.3+k*.5,1.9,z,.38,.3,.6,k%2?mats.gold:mats.leaf);
    if(i%3===0){sign(i%2?'CAFÉ MAREA':'FRUIT / FRESH',x,3.7,z-1.8,4,'#ffe6bb');box(x+side*3,1.2,z+5,1.7,.13,1.7,mats.white);for(const dz of [-1.3,1.3])box(x+side*3,.55,z+5+dz,.8,1,.8,mats.pink);}
  }
  // Runway, roof extraction pad, marina, and jump ramps remain reachable in free roam.
  ground(72,210,-278,192,mats.road,.027);for(let z=100;z<295;z+=15)box(-278,.06,z,1.8,.04,8,mats.white);
  building(-226,206,22,36,9,3);sign('AIR SOLMARA',-226,11,187,24,'#a4edff');box(-225,17,253,6,34,6,mats.white);box(-225,34,253,12,5,12,buildingMats[2]);
  for(let i=0;i<6;i++){const x=200+i*19;box(x,.4,337,3,1,70,mats.trunk);for(let k=0;k<3;k++){box(x+6,.5,316+k*19,6,1,13,mats.white);box(x+6,1.7,315+k*19,4,1.5,5,mats.dark);box(x+6,6,316+k*19,.12,8,.12,mats.white);}}
  for(let i=0;i<12;i++)box(92+i%4*10,1.6,275+Math.floor(i/4)*6,9,3,5,i%2?mats.pink:mats.metal);
  box(136,2,252,8,4,7,mats.dark);sign('PORT RESERVE / 12',136,5.4,248.4,10,'#ffd09b');
  const roof=roofs.find(r=>r.x===86&&r.z===86),pads=[{x:-256,z:192,y:.1},roof?{x:roof.x,z:roof.z,y:roof.y+.2}:{x:64,z:64,y:0}];
  for(const p of pads){const ring=mesh(new T.TorusGeometry(7,.2,6,40),mats.gold,p.x,p.y+.1,p.z);ring.rotation.x=Math.PI/2;box(p.x-1.8,p.y,p.z,.6,.1,5,mats.white);box(p.x+1.8,p.y,p.z,.6,.1,5,mats.white);box(p.x,p.y,p.z,4,.1,.6,mats.white);}
  const ramps=[{x:0,z:226},{x:-128,z:45},{x:192,z:-174}];for(const p of ramps){const m=mesh(new T.BoxGeometry(7,.5,12),mats.gold,p.x,1.4,p.z);m.rotation.x=.21;}
  const crown=new T.InstancedMesh(new T.IcosahedronGeometry(2.2,1),mats.leaf,crowns.length);crowns.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(1,1.3,1);dummy.rotation.set(0,i*.53,0);dummy.updateMatrix();crown.setMatrixAt(i,dummy.matrix);});crown.castShadow=true;scene.add(crown);
  const geometry=new T.BoxGeometry(1,1,1);
  for(const [mat,items] of batches){const batch=new T.InstancedMesh(geometry,mat,items.length);items.forEach(([x,y,z,w,h,d,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});batch.castShadow=mat!==mats.gold&&mat!==mats.cyan;batch.receiveShadow=true;batch.computeBoundingSphere();scene.add(batch);}
  return {mats,colliders,roofs,trees,buildingMats,reflections,waterMat,groundMat,pads,ramps,sign,reflect};
}
export function solidAt(city,x,z,r=1,y=0){return city.colliders.some(b=>y<b.h&&Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r);}
export function moveOnStreets(city,p,dx,dz,r=1){let hit=false;const x=clamp(p.x+dx,-310,310),z=clamp(p.z+dz,-310,310);if(!solidAt(city,x,p.z,r,p.y||0))p.x=x;else hit=true;if(!solidAt(city,p.x,z,r,p.y||0))p.z=z;else hit=true;return hit;}
export function surfaceHeight(city,x,z){let h=0;for(const b of city.roofs)if(Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d)h=Math.max(h,b.y);return h;}
export function lineOfSight(city,a,b){
  for(const c of city.colliders){let lo=0,hi=1;for(const [v,d,mn,mx] of [[a.x,b.x-a.x,c.x-c.w,c.x+c.w],[a.z,b.z-a.z,c.z-c.d,c.z+c.d]]){if(Math.abs(d)<.00001){if(v<mn||v>mx){lo=2;break;}}else{let t=(mn-v)/d,u=(mx-v)/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);}}if(lo<=hi&&hi>0&&lo<1&&Math.min((a.y||1.5)+((b.y||1.5)-(a.y||1.5))*lo,(a.y||1.5)+((b.y||1.5)-(a.y||1.5))*hi)<c.h)return false;}return true;
}
