const KEY='solmara-burning-mile-r4';
export function freshSave(){return {version:4,cash:4800,done:0,respect:12,weapons:[0],ammo:[96,0,0],upgrades:[],packages:[],races:[null,null,null],jumps:[],season:1,hour:18.8};}
export function loadSave(){
  try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw?.version!==4)return freshSave();const s={...freshSave(),...raw};
    for(const k of ['weapons','ammo','upgrades','packages','races','jumps'])if(!Array.isArray(s[k]))s[k]=freshSave()[k];
    s.cash=Number.isFinite(s.cash)?Math.max(0,s.cash):4800;s.done=Math.max(0,Math.min(12,s.done|0));s.season=((s.season|0)%4+4)%4;s.respect=Math.max(0,Math.min(100,Number(s.respect)||12));s.hour=Number.isFinite(s.hour)?s.hour:18.8;
    s.weapons=[...new Set([0,...s.weapons.filter(n=>n===1||n===2)])];s.ammo=[0,1,2].map(i=>Math.max(0,Number(s.ammo[i])||0));return s;
  }catch{return freshSave();}
}
export function saveGame(save){try{localStorage.setItem(KEY,JSON.stringify(save));return true;}catch{return false;}}
