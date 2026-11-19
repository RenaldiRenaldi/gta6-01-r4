export const TITLE = 'Solmara: The Burning Mile';
// World units are meters; every speed stored by the simulation is meters/second.
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const bearing = (a,b) => Math.atan2(b.x-a.x,b.z-a.z);
export const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
export function randomSeed(seed=61743) { return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296); }
export const SEASONS = [
  {name:'SPRING',weather:'LIGHT SHOWERS',leaf:0xf5a5c3,ground:0x6c9578,sky:0x789ba9,horizon:0xd6b9ac,wet:1,hour:16.6},
  {name:'SUMMER',weather:'AFTER THE STORM',leaf:0x398c70,ground:0x78916b,sky:0x304a79,horizon:0xff925f,wet:1,hour:18.8},
  {name:'AUTUMN',weather:'GOLDEN WIND',leaf:0xe78a35,ground:0xa08960,sky:0x7395b0,horizon:0xe9c092,wet:.45,hour:16.2},
  {name:'WINTER',weather:'SNOWFALL',leaf:0xb9d7dd,ground:0xc5d9e2,sky:0x09172f,horizon:0x3d506c,wet:1,hour:22.1},
];
export const WEAPONS = [
  {name:'Kestrel 9',label:'PISTOL',damage:36,range:65,pellets:1,spread:.04,delay:.24,price:180,rounds:48},
  {name:'Breaker 12',label:'SHOTGUN',damage:28,range:30,pellets:7,spread:.2,delay:.85,price:750,rounds:24},
  {name:'Longline .30',label:'RIFLE',damage:85,range:150,pellets:1,spread:.015,delay:.5,price:1150,rounds:36},
];
export const SERVICES = [
  {x:-13,z:-64,name:'Pearl House',type:'save'}, {x:15,z:-64,name:'Palmetto Customs',type:'garage'},
  {x:-14,z:0,name:'Estrella Outfitters',type:'arms'}, {x:-256,z:192,name:'Air Solmara',type:'heli'},
];
export function district(p) { return p.x<-210&&p.z>90?'AIR SOLMARA':p.x>180?'SUNBREAK COAST':p.z>215?'LANTERN MARINA':p.x<-95?'OLD CORAL':p.z<-150?'ALTA VISTA':p.x>25&&p.z>10?'GLASS QUARTER':'PEARL MILE'; }
