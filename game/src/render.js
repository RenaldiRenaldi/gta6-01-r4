import * as T from '../vendor/three.module.min.js';
import { SEASONS,randomSeed } from './config.js';

export function createRenderer(canvas){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(59,innerWidth/innerHeight,.15,1400);
  // Thresholded separable bloom at quarter resolution; HDR light bars bloom,
  // while road markings and the DOM interface retain sharp edges.
  const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType});
  const a=new T.WebGLRenderTarget(Math.ceil(innerWidth/4),Math.ceil(innerHeight/4),{type:T.HalfFloatType}),b=a.clone();
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));postScene.add(quad);
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur=new T.ShaderMaterial({uniforms:{image:{value:null},stepSize:{value:new T.Vector2()},threshold:{value:0}},vertexShader:vertex,fragmentShader:'uniform sampler2D image;uniform vec2 stepSize;uniform float threshold;varying vec2 vUv;vec3 sampleAt(vec2 p){vec3 c=texture2D(image,p).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-threshold)/max(.001,max(c.r,max(c.g,c.b)));}void main(){vec3 c=sampleAt(vUv)*.2;for(int i=1;i<5;i++){float w=(5.-float(i))*.04;c+=(sampleAt(vUv+stepSize*float(i))+sampleAt(vUv-stepSize*float(i)))*w;}gl_FragColor=vec4(c,1.);}'});
  const combine=new T.ShaderMaterial({uniforms:{image:{value:target.texture},glow:{value:b.texture}},vertexShader:vertex,fragmentShader:'uniform sampler2D image;uniform sampler2D glow;varying vec2 vUv;void main(){vec3 c=texture2D(image,vUv).rgb+texture2D(glow,vUv).rgb*.24;float vig=1.-.16*pow(length((vUv-.5)*1.35),2.);gl_FragColor=vec4(c*vig,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',toneMapped:true});
  function resize(){renderer.setSize(innerWidth,innerHeight);target.setSize(innerWidth,innerHeight);a.setSize(Math.ceil(innerWidth/4),Math.ceil(innerHeight/4));b.setSize(a.width,a.height);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  function draw(){renderer.setRenderTarget(target);renderer.render(scene,camera);quad.material=blur;blur.uniforms.image.value=target.texture;blur.uniforms.threshold.value=.78;blur.uniforms.stepSize.value.set(1/a.width,0);renderer.setRenderTarget(a);renderer.render(postScene,postCamera);blur.uniforms.image.value=a.texture;blur.uniforms.threshold.value=0;blur.uniforms.stepSize.value.set(0,1/a.height);renderer.setRenderTarget(b);renderer.render(postScene,postCamera);quad.material=combine;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
  window.addEventListener('resize',resize);return {renderer,scene,camera,draw};
}
export function createEnvironment(scene,city){
  const sky=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{top:{value:new T.Color(0x304a79)},bottom:{value:new T.Color(0xff925f)},night:{value:0}},vertexShader:'varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 d;uniform vec3 top;uniform vec3 bottom;uniform float night;void main(){vec3 p=normalize(d);float h=pow(clamp(p.y*1.6,0.,1.),.7);vec3 c=mix(bottom,top,h);float dotSun=dot(p,normalize(vec3(-.018,.08,1.)));float sun=smoothstep(.9987,.9992,dotSun);float halo=pow(max(0.,dotSun),18.)*.3;c+=vec3(1.,.55,.2)*(sun*2.+halo)*(1.-night);float cloud=sin(p.x*31.+p.z*23.)*sin(p.y*85.);c*=1.-smoothstep(.55,1.,cloud)*.1;gl_FragColor=vec4(c,1.);}'});
  const dome=new T.Mesh(new T.SphereGeometry(800,36,20),sky);scene.add(dome);
  const ambient=new T.HemisphereLight(0x9cb5d7,0x775554,1.65),sun=new T.DirectionalLight(0xffb679,3.1);sun.position.set(-70,90,100);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:300});sun.shadow.bias=-.0005;sun.shadow.normalBias=.15;scene.add(ambient,sun,sun.target);
  // Locally painted cubemap gives metal, glass and wet asphalt an atmospheric environment.
  const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,64);grad.addColorStop(0,'#304a79');grad.addColorStop(.45,'#ea946e');grad.addColorStop(.6,'#666372');grad.addColorStop(1,'#172c3a');g.fillStyle=grad;g.fillRect(0,0,64,64);faces.push(c);}const envmap=new T.CubeTexture(faces);envmap.needsUpdate=true;scene.environment=envmap;scene.environmentIntensity=.45;
  const rand=randomSeed(56),positions=new Float32Array(1800*3);for(let i=0;i<1800;i++)positions.set([(rand()-.5)*140,rand()*70,(rand()-.5)*140],i*3);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));const particles=new T.Points(geometry,new T.PointsMaterial({color:0xffbdcd,size:.22,transparent:true,opacity:.85,depthWrite:false}));scene.add(particles);
  const rp=new Float32Array(500*6);for(let i=0;i<500;i++){const x=(rand()-.5)*120,y=rand()*65,z=(rand()-.5)*120;rp.set([x,y,z,x-.1,y+.9,z],i*6);}const rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(rp,3));const rain=new T.LineSegments(rg,new T.LineBasicMaterial({color:0xb8dce9,transparent:true,opacity:.22}));scene.add(rain);
  city.mats.road.envMapIntensity=.3;
  const e={season:1,hour:18.8,weather:'AFTER THE STORM',wet:1,sun,ambient,sky,dome,particles,rain,city,cycle:0};scene.fog=new T.FogExp2(0xb87b77,.003);return e;
}
export function setSeason(g,index){const e=g.env;e.season=(index+4)%4;const s=SEASONS[e.season];e.hour=s.hour;e.weather=s.weather;e.wet=s.wet;e.cycle=0;e.city.mats.leaf.color.setHex(s.leaf);e.city.groundMat.color.setHex(s.ground);e.city.mats.roof.color.setHex(e.season===3?0xdce8eb:0xd4c6b7);e.particles.material.color.setHex(e.season===3?0xffffff:e.season===2?0xffa444:0xffb5d2);e.particles.material.size=e.season===2?.44:e.season===0?.3:.2;}
export function updateEnvironment(g,dt){
  const e=g.env,s=SEASONS[e.season];if(!g.shot)e.hour=(e.hour+dt*.006)%24;e.cycle+=dt;
  if(e.cycle>100){e.cycle=0;e.weather=e.season===3?'SNOWFALL':e.weather==='THUNDERSTORM'?s.weather:'THUNDERSTORM';g.notify(e.weather+' / TRACTION CHANGED');}
  const night=e.hour>20||e.hour<6,dusk=e.hour>17,sky=night?0x0a1830:s.sky,horizon=night?0x3b4e69:dusk?0xff936b:s.horizon;
  e.sky.uniforms.top.value.setHex(sky);e.sky.uniforms.bottom.value.setHex(horizon);e.sky.uniforms.night.value=night?1:0;g.scene.fog.color.setHex(night?0x29374e:dusk?0xb77d7b:0xa7b6b4);g.scene.fog.density=e.weather==='FOG'?.009:night?.003:.0028;g.scene.background=new T.Color(sky);
  e.ambient.intensity=night?1.12:1.65;e.sun.intensity=night?.28:dusk?2.65:3.1;e.sun.color.setHex(night?0x82a9df:0xffb781);e.sun.position.set(g.player.x-75,g.player.y+(dusk?65:100),g.player.z+100);e.sun.target.position.set(g.player.x,0,g.player.z);
  for(const m of e.city.buildingMats)m.emissiveIntensity=night?.6:dusk?.3:.1;
  e.city.mats.road.roughness=.68-e.wet*.56;e.city.mats.road.metalness=.2+e.wet*.45;
  for(const m of e.city.reflections)m.material.opacity=e.wet*(night?.66:dusk?.48:.2);
  const rain=e.weather==='LIGHT SHOWERS'||e.weather==='THUNDERSTORM';e.particles.visible=e.season!==1;e.rain.visible=rain;e.particles.position.set(g.player.x,g.player.y,g.player.z);e.rain.position.copy(e.particles.position);
  const a=e.particles.geometry.attributes.position;for(let i=0;i<a.count;i++){a.array[i*3+1]-=dt*(e.season===3?4:2.7);if(a.array[i*3+1]<0)a.array[i*3+1]+=70;a.array[i*3]+=dt*(e.season===2?2:1);if(a.array[i*3]>70)a.array[i*3]=-70;}a.needsUpdate=true;
  const b=e.rain.geometry.attributes.position;if(rain){for(let i=0;i<b.count;i+=2){b.array[i*3+1]-=dt*30;if(b.array[i*3+1]<0)b.array[i*3+1]=65;b.array[(i+1)*3+1]=b.array[i*3+1]+.9;}b.needsUpdate=true;}
}
