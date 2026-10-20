/* ===================== 工具 ===================== */
const WEEK_CN = ['周日','周一','周二','周三','周四','周五','周六'];
const pad = n => n < 10 ? '0'+n : ''+n;
const fmt = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today = () => fmt(new Date());
const parse = s => { const p = String(s).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); };
const addDays = (s,n) => { const d = parse(s); d.setDate(d.getDate()+n); return fmt(d); };
const dow = s => parse(s).getDay();
const weekday = s => WEEK_CN[dow(s)];
const dateText = s => (+s.split('-')[1])+'月'+(+s.split('-')[2])+'日';
const dateTextFull = s => dateText(s)+' '+weekday(s);
const diffDays = (a,b) => Math.round((parse(a)-parse(b))/86400000);
const monthKey = s => s.slice(0,7);
const daysInMonth = ym => { const p = ym.split('-'); return new Date(+p[0], +p[1], 0).getDate(); };
const lastDays = n => { const a=[]; for(let i=n-1;i>=0;i--) a.push(addDays(today(),-i)); return a; };
const uid = () => 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num = n => { n = parseFloat(n); return isNaN(n)?0:n; };
const round1 = n => Math.round(n*10)/10;
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kgText = n => Math.round(n)>=1000 ? (Math.round(n/100)/10)+'t' : Math.round(n)+'kg';
function weekDates(){ const d = parse(today()); const wd = (d.getDay()+6)%7;
  const mon = addDays(today(), -wd); const a=[]; for(let i=0;i<7;i++) a.push(addDays(mon,i)); return a; }

/* ===================== 动作库 ===================== */
const PARTS = [
  {key:'chest',name:'胸',color:'#FF6B35'},{key:'back',name:'背',color:'#5B9CFF'},
  {key:'leg',name:'腿',color:'#2DD4A7'},{key:'shoulder',name:'肩',color:'#FFB020'},
  {key:'arm',name:'手臂',color:'#A78BFA'},{key:'core',name:'核心',color:'#FF7BA9'},
  {key:'cardio',name:'有氧',color:'#38BDF8'}
];
const RAW = [
  ['杠铃卧推','chest','w'],['哑铃卧推','chest','w'],['上斜哑铃卧推','chest','w'],['器械推胸','chest','w'],
  ['哑铃飞鸟','chest','w'],['龙门架夹胸','chest','w'],['双杠臂屈伸','chest','b'],['俯卧撑','chest','b'],
  ['引体向上','back','b'],['高位下拉','back','w'],['坐姿划船','back','w'],['杠铃划船','back','w'],
  ['单臂哑铃划船','back','w'],['硬拉','back','w'],['直臂下压','back','w'],['山羊挺身','back','b'],
  ['杠铃深蹲','leg','w'],['腿举','leg','w'],['哈克深蹲','leg','w'],['罗马尼亚硬拉','leg','w'],
  ['保加利亚分腿蹲','leg','w'],['箭步蹲','leg','w'],['坐姿腿屈伸','leg','w'],['俯卧腿弯举','leg','w'],
  ['站姿提踵','leg','w'],['臀桥','leg','w'],['深蹲跳','leg','b'],
  ['杠铃推举','shoulder','w'],['哑铃推举','shoulder','w'],['哑铃侧平举','shoulder','w'],['哑铃前平举','shoulder','w'],
  ['俯身飞鸟','shoulder','w'],['绳索面拉','shoulder','w'],['直立划船','shoulder','w'],
  ['杠铃弯举','arm','w'],['哑铃弯举','arm','w'],['锤式弯举','arm','w'],['绳索下压','arm','w'],
  ['仰卧臂屈伸','arm','w'],['窄距俯卧撑','arm','b'],['腕弯举','arm','w'],
  ['平板支撑','core','t'],['卷腹','core','b'],['悬垂举腿','core','b'],['俄罗斯转体','core','b'],
  ['登山跑','core','t'],['侧平板','core','t'],
  ['跑步','cardio','t'],['快走','cardio','t'],['骑行','cardio','t'],['游泳','cardio','t'],
  ['跳绳','cardio','t'],['划船机','cardio','t'],['椭圆机','cardio','t'],['爬楼机','cardio','t'],['HIIT','cardio','t']
];
const LIB = RAW.map(r => ({name:r[0], part:r[1], mode:r[2]==='w'?'weight':(r[2]==='t'?'time':'body')}));
const MODE_TEXT = {weight:'负重', body:'自重', time:'计时'};
const partInfo = k => PARTS.find(p=>p.key===k) || {key:k,name:'其他',color:'#8A8F98'};
const libFind = n => LIB.find(x=>x.name===n);

const GOALS = {muscle:'增肌', fat:'减脂', strength:'增力', keep:'保持健康'};
const LEVELS = {new:'新手（<1年）', mid:'进阶（1–3年）', adv:'资深（3年+）'};
const SLOTS = {morning:'早晨', noon:'午间', evening:'晚上', night:'深夜'};

/* ===================== 数据 ===================== */
const KEY = 'fitdb_v2';
let DB = null;
const UNIT = () => DB.profile.unit;      // kg | lb
const uText = () => UNIT()==='lb' ? 'lb' : 'kg';
const toDisplay = w => UNIT()==='lb' ? round1(w*2.20462) : round1(w);   // 内部一律存 kg
const fromDisplay = w => UNIT()==='lb' ? round1(w/2.20462) : round1(w);

const defProfile = () => ({
  name:'健身达人', gender:'male', height:172,
  goal:'muscle', level:'mid', unit:'kg',
  restSec:90, defSets:3, weekDays:[1,3,5], slot:'evening', autoFill:true
});
const emptyLog = d => ({date:d, tplKey:'', startAt:0, duration:0, note:'', done:false, exercises:[]});
const emptyTpl = () => ({name:'', exs:[]});

/* ---- 模板库（常见分化，用于一键套用） ---- */
const PRESET_TPL = {
  push:  {name:'推 · 胸肩三头', exs:[['杠铃卧推',3,8],['上斜哑铃卧推',3,10],['哑铃侧平举',3,15],['绳索下压',3,12]]},
  pull:  {name:'拉 · 背二头',   exs:[['引体向上',3,8],['杠铃划船',3,10],['坐姿划船',3,12],['杠铃弯举',3,10]]},
  legs:  {name:'腿 · 股四头臀',  exs:[['杠铃深蹲',4,8],['罗马尼亚硬拉',3,10],['腿举',3,12],['站姿提踵',3,15]]},
  upper: {name:'上肢 · 胸背肩臂', exs:[['杠铃卧推',3,8],['高位下拉',3,10],['杠铃推举',3,10],['哑铃弯举',3,12]]},
  lower: {name:'下肢 · 腿臀核心', exs:[['杠铃深蹲',4,8],['保加利亚分腿蹲',3,10],['俯卧腿弯举',3,12],['卷腹',3,20]]},
  full:  {name:'全身 · 复合为主', exs:[['杠铃深蹲',3,8],['杠铃卧推',3,8],['杠铃划船',3,10],['平板支撑',3,1]]},
  core:  {name:'核心 + 有氧',    exs:[['平板支撑',3,1],['悬垂举腿',3,12],['俄罗斯转体',3,20],['跑步',1,25]]}
};
function buildTpl(key){
  const p = PRESET_TPL[key]; if(!p) return emptyTpl();
  return {name:p.name, exs:p.exs.map(e => {
    const L = libFind(e[0]) || {part:'core', mode:'weight'};
    return {name:e[0], part:L.part, mode:L.mode, sets:e[1], reps:e[2]};
  })};
}

/* ---- 示例数据：6 周真实渐进轨迹 ---- */
function seed(){
  const db = {v:2, logs:{}, weights:[], steps:{}, profile:defProfile(), templates:{}};
  // 围绕「今天」排布示例计划：昨天已练、今天是训练日、后天再练 —— 保证首屏就是可练状态
  const t = dow(today());
  const keys = ['pull', 'push', 'legs'];
  const days = [(t+6)%7, t, (t+2)%7].sort((a,b) => ((a+6)%7) - ((b+6)%7));
  db.profile.weekDays = days;
  db.templates = {};
  const PLAN = {};
  days.forEach((w,i) => { db.templates[w] = buildTpl(keys[i]); PLAN[w] = keys[i]; });

  const baseW = {'杠铃卧推':52,'上斜哑铃卧推':20,'哑铃侧平举':6,'绳索下压':18,
                 '引体向上':0,'杠铃划船':45,'坐姿划船':42,'杠铃弯举':20,
                 '杠铃深蹲':65,'罗马尼亚硬拉':50,'腿举':100,'站姿提踵':35};
  const incW  = {'杠铃卧推':1.6,'上斜哑铃卧推':0.7,'哑铃侧平举':0.3,'绳索下压':0.6,
                 '引体向上':0,'杠铃划船':1.3,'坐姿划船':1.2,'杠铃弯举':0.7,
                 '杠铃深蹲':2.2,'罗马尼亚硬拉':1.5,'腿举':3.0,'站姿提踵':1.0};
  const TOTAL_W = 6;
  for(let off=41; off>=1; off--){
    const date = addDays(today(), -off);
    const wd = dow(date);
    const key = PLAN[wd]; if(!key) continue;
    if(off===17 || off===9) continue;                 // 偶尔缺席，让日历更真实
    const wi = TOTAL_W - Math.floor(off/7);           // 第几周（越大越近）
    const tpl = PRESET_TPL[key];
    const log = emptyLog(date); log.tplKey = key; log.done = true;
    log.duration = 48 + (off%4)*6;
    log.exercises = tpl.exs.map((e,i) => {
      const L = libFind(e[0]) || {part:'core', mode:'weight'};
      const isTime = L.mode==='time';
      const sets = [];
      let w = (baseW[e[0]]||0) + (incW[e[0]]||0)*wi;
      if(L.mode==='weight') w = Math.round(w*2)/2;
      for(let s=0;s<e[1];s++){
        const r = Math.max(1, e[2] - s + (s===0?1:0));
        sets.push({id:uid(), w: isTime?0:(L.mode==='weight'?w:0), r: isTime?e[2]:r, ok:true});
      }
      return {id:uid(), name:e[0], part:L.part, mode:L.mode, sets};
    });
    db.logs[date] = log;
  }
  let kg = 71.4;
  for(let off=41; off>=0; off-=2){
    kg = round1(kg - 0.16 + (off%6===0?0.22:-0.05));
    db.weights.push({date:addDays(today(),-off), kg});
  }
  lastDays(7).forEach(d => { db.steps[d] = 6200 + ((d.charCodeAt(8)*137)%4800); });
  return db;
}
function load(){
  try {
    const s = localStorage.getItem(KEY);
    if(s){ const d = JSON.parse(s); if(d && d.logs && d.profile) return migrate(d); }
  } catch(e){}
  const d = seed(); localStorage.setItem(KEY, JSON.stringify(d)); return d;
}
function migrate(d){
  if(d.v === 2) return d;
  // v1 → v2：补 profile / templates，logs 字段不变
  const p = Object.assign(defProfile(), d.profile||{});
  if(p.goal===undefined || typeof p.goal==='number') p.goal = 'muscle';
  d.v = 2; d.profile = p; d.templates = d.templates || {}; d.steps = d.steps || {};
  return d;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){} }
DB = load();

const getLog = d => DB.logs[d] ? JSON.parse(JSON.stringify(DB.logs[d])) : emptyLog(d);
const saveLog = l => { DB.logs[l.date] = l; save(); };
const hasW = l => !!(l && l.exercises && l.exercises.length);
const allDates = () => Object.keys(DB.logs).filter(k => hasW(DB.logs[k])).sort();
const getWeights = () => (DB.weights||[]).slice().sort((a,b)=>a.date<b.date?-1:1);

/* ===================== 计算层 ===================== */
// Epley 估算 1RM
const e1rm = (w,r) => (w>0 && r>0) ? round1(w*(1 + r/30)) : 0;

function decorate(log){
  const exs = (log.exercises||[]).map(ex => {
    let vol=0, reps=0, best=0, bestE=0;
    (ex.sets||[]).forEach(s => {
      const w=num(s.w), r=num(s.r);
      if(ex.mode==='weight'){ vol += w*r; if(w>best) best=w; const e=e1rm(w,r); if(e>bestE) bestE=e; }
      reps += r;
    });
    const setsText = (ex.sets||[]).map(s =>
      ex.mode==='weight' ? toDisplay(num(s.w))+uText()+'×'+num(s.r)
      : (ex.mode==='time' ? num(s.r)+'分' : num(s.r)+'次')).join('  ');
    return {...ex, color:partInfo(ex.part).color, partName:partInfo(ex.part).name,
      volume:Math.round(vol), reps, best, e1rm:bestE, setCount:(ex.sets||[]).length, setsText:setsText||'暂无组数'};
  });
  let volume=0, sets=0, reps=0;
  exs.forEach(e => { volume+=e.volume; sets+=e.setCount; reps+=e.reps; });
  return {date:log.date, tplKey:log.tplKey||'', done:!!log.done, duration:num(log.duration),
    note:log.note||'', exercises:exs, volume, sets, reps, startAt:log.startAt||0};
}

// 某动作在上次训练中的表现（不含今天）
function lastPerf(name, before){
  const ds = allDates().filter(d => !before || d < before);
  for(let i=ds.length-1;i>=0;i--){
    const l = DB.logs[ds[i]];
    const ex = (l.exercises||[]).find(e => e.name===name);
    if(ex && ex.sets && ex.sets.length) return {date:ds[i], sets:ex.sets.map(s=>({w:s.w,r:s.r})), mode:ex.mode};
  }
  return null;
}
// 历史最佳（e1RM / 最重）
function bestOf(name){
  let e=0, w=0, n=0;
  allDates().forEach(d => {
    const l = DB.logs[d];
    (l.exercises||[]).forEach(ex => {
      if(ex.name!==name || ex.mode!=='weight') return;
      n++;
      (ex.sets||[]).forEach(s => { const e2=e1rm(num(s.w),num(s.r)); if(e2>e) e=e2; if(num(s.w)>w) w=num(s.w); });
    });
  });
  return {e1rm:e, maxW:w, times:n};
}
// PR 榜：按最佳 e1RM 排序
function prBoard(limit){
  const map = {};
  allDates().forEach(d => {
    (DB.logs[d].exercises||[]).forEach(ex => {
      if(ex.mode!=='weight') return;
      const cur = map[ex.name] || {name:ex.name, part:ex.part, e:0, w:0, date:d};
      (ex.sets||[]).forEach(s => {
        const e2 = e1rm(num(s.w),num(s.r));
        if(e2 > cur.e){ cur.e = e2; cur.date = d; }
        if(num(s.w) > cur.w) cur.w = num(s.w);
      });
      map[ex.name] = cur;
    });
  });
  return Object.values(map).filter(x=>x.e>0).sort((a,b)=>b.e-a.e).slice(0, limit||8)
    .map(x => ({...x, color:partInfo(x.part).color, partName:partInfo(x.part).name}));
}
// 常用动作排行（按出现次数）
function freqRank(limit){
  const map = {};
  allDates().forEach(d => { (DB.logs[d].exercises||[]).forEach(ex => {
    map[ex.name] = (map[ex.name]||0) + (ex.sets||[]).length; }); });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0, limit||10)
    .map(([n,c]) => { const L = libFind(n) || {part:'core'};
      return {name:n, count:c, part:L.part, color:partInfo(L.part).color}; });
}
function streak(){
  let cur = today();
  if(!hasW(DB.logs[cur])) cur = addDays(cur,-1);
  let n=0; while(hasW(DB.logs[cur])){ n++; cur = addDays(cur,-1); } return n;
}
const totalDays = () => allDates().length;
function rangeStats(dates){
  let days=0, volume=0, sets=0, reps=0, duration=0;
  dates.forEach(d => { const l = DB.logs[d]; if(!hasW(l)) return;
    const dec = decorate(l); days++; volume+=dec.volume; sets+=dec.sets; reps+=dec.reps; duration+=dec.duration; });
  return {days, volume, sets, reps, duration, avgDuration: days?Math.round(duration/days):0};
}
function partStats(dates){
  const map = {};
  dates.forEach(d => { const l = DB.logs[d]; if(!hasW(l)) return;
    l.exercises.forEach(ex => { map[ex.part] = (map[ex.part]||0) + (ex.sets||[]).length; }); });
  const arr = Object.keys(map).map(k => ({key:k, name:partInfo(k).name, color:partInfo(k).color, sets:map[k]}));
  arr.sort((a,b)=>b.sets-a.sets);
  const max = arr.length ? arr[0].sets : 1;
  arr.forEach(a => a.pct = Math.round(a.sets/max*100));
  return arr;
}
function calendar(ym){
  const total = daysInMonth(ym);
  const lead = (parse(ym+'-01').getDay()+6)%7;
  const cells = [];
  for(let i=0;i<lead;i++) cells.push({pad:true});
  let maxVol = 1;
  for(let day=1; day<=total; day++){
    const date = ym+'-'+pad(day);
    const vol = hasW(DB.logs[date]) ? decorate(DB.logs[date]).volume : 0;
    if(vol > maxVol) maxVol = vol;
    cells.push({date, day, volume:vol, done:hasW(DB.logs[date])});
  }
  cells.forEach(c => { if(c.pad) return;
    c.level = !c.done ? 0 : (c.volume/maxVol > .66 ? 3 : (c.volume/maxVol > .33 ? 2 : 1)); });
  return cells;
}
const volumeSeries = dates => dates.map(d => ({
  date:d, label:(+d.split('-')[2]),
  volume: hasW(DB.logs[d]) ? decorate(DB.logs[d]).volume : 0, done:hasW(DB.logs[d])
}));
function setWeight(date, kg){
  let hit = false;
  DB.weights.forEach(w => { if(w.date===date){ w.kg = round1(kg); hit = true; } });
  if(!hit) DB.weights.push({date, kg:round1(kg)});
  DB.weights.sort((a,b)=>a.date<b.date?-1:1); save();
}
const weightOf = d => { const w = getWeights().find(x=>x.date===d); return w ? w.kg : null; };
function weekDoneCount(){
  const wd = DB.profile.weekDays || [];
  return weekDates().filter(d => wd.indexOf(dow(d))>=0 && hasW(DB.logs[d])).length;
}

/* ===================== 状态 ===================== */
let page = 'train';
let SUB = {};                                  // 二级页参数
let T = {date: today(), picker:false, part:'chest', kw:'', custom:'', newName:'', newPart:'chest', newMode:'weight'};
let RANGE = 'week';
let YM = monthKey(today());
let REST = null;                               // {left, timer}
let session = {on:false, start:0, tick:null};

const screenEl = document.getElementById('screen');
const tabbarEl = document.getElementById('tabbar');
const navTitleEl = document.getElementById('navTitle');
const navLeftEl = document.getElementById('navLeft');
const navRightEl = document.getElementById('navRight');
const toastEl = document.getElementById('toast');

const TABS = [{k:'train',t:'训练',i:'🏋️'},{k:'plan',t:'计划',i:'📅'},
              {k:'stats',t:'统计',i:'📊'},{k:'mine',t:'我的',i:'👤'}];

let toastTimer = null;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>toastEl.classList.remove('on'), 1900);
}

/* ===================== 自动带入 ===================== */
// 按模板 + 上次成绩，生成本次训练的动作清单
function applyTemplate(date){
  const wd = dow(date);
  const tpl = DB.templates[wd];
  if(!tpl || !tpl.exs.length) return 0;
  const log = getLog(date);
  if(log.exercises.length) return 0;
  log.tplKey = String(wd);
  log.exercises = tpl.exs.map(e => {
    const last = lastPerf(e.name, date);
    const sets = [];
    const cnt = e.sets || DB.profile.defSets || 3;
    for(let i=0;i<cnt;i++){
      if(DB.profile.autoFill && last && last.sets[i]) sets.push({id:uid(), w:last.sets[i].w, r:last.sets[i].r, ok:false});
      else if(DB.profile.autoFill && last) sets.push({id:uid(), w:last.sets[last.sets.length-1].w, r:last.sets[last.sets.length-1].r, ok:false});
      else sets.push({id:uid(), w:'', r: e.mode==='time' ? e.reps : '', ok:false});
    }
    return {id:uid(), name:e.name, part:e.part, mode:e.mode, sets};
  });
  saveLog(log);
  return log.exercises.length;
}
// 添加动作时自动带入上次
function addExercise(name){
  const log = getLog(T.date);
  let ex = log.exercises.find(e => e.name===name);
  if(ex){ toast('已在今日清单中'); return false; }
  const L = libFind(name);
  const part = L ? L.part : T.newPart;
  const mode = L ? L.mode : T.newMode;
  const last = lastPerf(name, T.date);
  const sets = [];
  const cnt = DB.profile.defSets || 3;
  for(let i=0;i<cnt;i++){
    if(DB.profile.autoFill && last && last.sets[i]) sets.push({id:uid(), w:last.sets[i].w, r:last.sets[i].r, ok:false});
    else sets.push({id:uid(), w:'', r:'', ok:false});
  }
  ex = {id:uid(), name, part, mode, sets};
  if(!log.tplKey) log.tplKey = '';
  log.exercises.push(ex);
  saveLog(log);
  if(last) toast('已带入上次：'+dateText(last.date)+' '+fmtSet(last.sets[0], mode));
  else toast('已添加 '+name);
  return true;
}
const fmtSet = (s, mode) => mode==='weight' ? (toDisplay(num(s.w))+uText()+'×'+num(s.r))
  : (mode==='time' ? num(s.r)+'分钟' : num(s.r)+'次');

/* ===================== 渲染：训练 ===================== */
function viewTrain(){
  const d = T.date;
  const log = getLog(d);
  const dec = decorate(log);
  const wd = dow(d);
  const tpl = DB.templates[wd];
  const isTrainDay = (DB.profile.weekDays||[]).indexOf(wd) >= 0;
  const st = streak();
  const running = session.on;

  let h = '';
  h += '<div class="hero">';
  h +=   '<div class="date">'+dateTextFull(d)+(d===today()?' · 今天':'')+'</div>';
  h +=   '<div class="h1">'+(d===today()?greeting():'补录训练')+'</div>';
  h +=   '<div class="sub">'+(isTrainDay
          ? '今天是训练日 · '+(tpl?tpl.name:'未设置计划')
          : '今天安排休息 · '+(tpl?'（计划：'+tpl.name+'）':'按计划休息'))+'</div>';
  h +=   '<div class="acts">';
  if(!dec.exercises.length){
    if(tpl && tpl.exs.length) h += '<button class="btn primary sm" data-act="applyTpl">套用「'+esc(tpl.name)+'」</button>';
    h += '<button class="btn ghost sm" data-act="pickEx">手动添加动作</button>';
  } else {
    h += running
      ? '<span class="running"><i></i><em>训练中 '+sessionMin()+'</em></span><button class="btn sm" data-act="finish">完成训练</button>'
      : '<button class="btn primary sm" data-act="start">开始训练</button><button class="btn ghost sm" data-act="pickEx">添加动作</button>';
  }
  h +=   '</div>';
  h +=   '<div class="streak"><div class="n">'+st+'</div><div class="t">连续天数</div></div>';
  h += '</div>';

  if(!dec.exercises.length){
    h += '<div class="card"><div class="emptybox"><div class="ic">🏋️</div>'
      +  '<div class="t">今天还没有训练内容</div>'
      +  '<div class="tiny">'+(tpl&&tpl.exs.length ? '点上方按钮，自动带入本周计划的动作与上次重量' : '去「计划」页设置每周训练安排，之后这里会自动带入')+'</div>'
      +  '</div></div>';
  } else {
    h += '<div class="row between" style="margin:0 2px 8px">'
      +  '<div class="sec-title" style="margin:0">本次训练 · '+dec.exercises.length+' 个动作</div>'
      +  '<div class="tiny dim">'+dec.sets+' 组 · '+kgText(dec.volume)+'</div></div>';
    dec.exercises.forEach((ex, ei) => { h += exCard(ex, ei); });
    h += '<button class="btn ghost block" data-act="pickEx" style="margin-bottom:12px">+ 添加动作</button>';
    if(running) h += '<button class="btn primary block" data-act="finish" style="margin-bottom:12px">完成训练（'+sessionMin()+'）</button>';
    h += '<div class="card tight">'
      +  '<div class="field"><span class="k">训练时长（分钟）</span>'
      +  '<input type="number" inputmode="numeric" data-act="duration" value="'+(dec.duration||'')+'" placeholder="自动或手填" style="max-width:110px"></div>'
      +  '<div class="field"><span class="k">备注</span>'
      +  '<input data-act="note" value="'+esc(dec.note)+'" placeholder="今天状态如何" style="max-width:190px"></div>'
      +  '</div>';
  }
  h += '<div class="tiny dim" style="text-align:center;padding:6px 0 2px">数据保存在本机浏览器 · 换设备请到「我的」导出备份</div>';
  return h;
}
function greeting(){ const h = new Date().getHours();
  return h<6?'凌晨好':h<11?'早上好':h<14?'中午好':h<18?'下午好':h<23?'晚上好':'夜深了'; }

function exCard(ex, ei){
  const last = lastPerf(ex.name, T.date);
  const best = bestOf(ex.name);
  let h = '<div class="excard">';
  h += '<div class="hd"><span class="dot" style="background:'+ex.color+'"></span>'
    +  '<span class="nm">'+esc(ex.name)+'</span>'
    +  '<span class="tag">'+ex.partName+'</span>'
    +  '<button class="del" data-act="delEx" data-i="'+ei+'">✕</button></div>';
  if(last){
    h += '<div class="lastline"><span class="k">上次 '+dateText(last.date)+'</span><span class="v">'
      +  last.sets.slice(0,4).map(s=>fmtSet(s,ex.mode)).join('  ') + (last.sets.length>4?' …':'')+'</span></div>';
  } else if(ex.mode==='weight'){
    h += '<div class="lastline"><span class="k">首次记录</span><span class="v">填完即为个人 PR</span></div>';
  }
  ex.sets.forEach((s, si) => {
    const isPR = ex.mode==='weight' && num(s.w)>0 && num(s.r)>0 && e1rm(num(s.w),num(s.r)) > best.e1rm && best.e1rm>0;
    const isBest = ex.mode==='weight' && num(s.w)>0 && num(s.w) >= best.maxW && best.maxW>0;
    h += '<div class="setrow">';
    h +=   '<span class="idx'+(isPR||isBest?' pr':'')+'">'+(si+1)+'</span>';
    if(ex.mode==='weight'){
      h += '<input class="inp" type="number" inputmode="decimal" data-act="w" data-i="'+ei+'" data-j="'+si+'" value="'+(s.w===''?'':toDisplay(num(s.w)))+'" placeholder="重量">';
      h += '<span class="unit">'+uText()+'</span>';
      h += '<input class="inp" type="number" inputmode="numeric" data-act="r" data-i="'+ei+'" data-j="'+si+'" value="'+(s.r===''?'':num(s.r))+'" placeholder="次数">';
      h += '<span class="unit">次</span>';
    } else if(ex.mode==='time'){
      h += '<input class="inp" type="number" inputmode="decimal" data-act="r" data-i="'+ei+'" data-j="'+si+'" value="'+(s.r===''?'':num(s.r))+'" placeholder="分钟">';
      h += '<span class="unit">分钟</span>';
    } else {
      h += '<input class="inp" type="number" inputmode="numeric" data-act="r" data-i="'+ei+'" data-j="'+si+'" value="'+(s.r===''?'':num(s.r))+'" placeholder="次数">';
      h += '<span class="unit">次</span>';
    }
    h += '<button class="ok'+(s.ok?' done':'')+'" data-act="okSet" data-i="'+ei+'" data-j="'+si+'">✓</button>';
    h += '<button class="rm" data-act="delSet" data-i="'+ei+'" data-j="'+si+'">−</button>';
    h += '</div>';
  });
  h += '<button class="addset" data-act="addSet" data-i="'+ei+'">+ 加一组'+(ex.sets.length?'（复制上一组）':'')+'</button>';
  h += '</div>';
  return h;
}

/* ===================== 渲染：计划 ===================== */
function viewPlan(){
  const p = DB.profile;
  const wk = DB.profile.weekDays || [];
  let h = '';
  // 档案
  h += '<div class="card">';
  h += '<div class="sec-title">我的健身档案</div>';
  h += '<div class="row" style="gap:8px;margin-bottom:10px">';
  h +=   '<div style="flex:1"><div class="tiny dim">训练目标</div><div class="b">'+GOALS[p.goal]+'</div></div>';
  h +=   '<div style="flex:1"><div class="tiny dim">经验水平</div><div class="b">'+(LEVELS[p.level]||'').split('（')[0]+'</div></div>';
  h +=   '<div style="flex:1"><div class="tiny dim">每周计划</div><div class="b">'+wk.length+' 练</div></div>';
  h += '</div>';
  h += '<div class="row" style="gap:8px">';
  h +=   '<div style="flex:1"><div class="tiny dim">常练时段</div><div class="b">'+(SLOTS[p.slot]||'')+'</div></div>';
  h +=   '<div style="flex:1"><div class="tiny dim">身高 / 单位</div><div class="b">'+(p.height||'—')+'cm · '+uText()+'</div></div>';
  h +=   '<div style="flex:1"><div class="tiny dim">组间休息</div><div class="b">'+p.restSec+'s</div></div>';
  h += '</div>';
  h += '<button class="btn ghost block sm" data-act="editProfile" style="margin-top:11px">编辑档案</button>';
  h += '</div>';

  // 每周节奏
  h += '<div class="card">';
  h += '<div class="sec-title">每周训练节奏 <span class="more">点选训练日</span></div>';
  h += '<div class="wk">';
  for(let i=1;i<=7;i++){ const w=i%7; const on = wk.indexOf(w)>=0; const td = dow(today())===w;
    h += '<div class="d'+(on?' on':'')+(td?' today':'')+'" data-act="toggleDay" data-i="'+w+'">'
      +  '<div class="w">'+WEEK_CN[w].slice(1)+'</div><div class="n">'+(on?'练':'休')+'</div></div>'; }
  h += '</div>';
  h += '<div class="tiny dim" style="margin-top:9px">本周已完成 '+weekDoneCount()+' / '+wk.length+' 次'
    +  (wk.length?' · 今日'+(wk.indexOf(dow(today()))>=0?'<span style="color:var(--brand)">是训练日</span>':'休息日'):'')+'</div>';
  h += '</div>';

  // 训练模板
  h += '<div class="card">';
  h += '<div class="sec-title">训练日计划模板 <span class="more">点进去编辑动作</span></div>';
  if(!wk.length){ h += '<div class="tiny dim" style="padding:6px 0">先在上面选择训练日</div>'; }
  wk.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).forEach(w => {
    const t = DB.templates[w];
    const nm = t && t.name ? t.name : '未设置';
    const exs = t && t.exs ? t.exs.map(e=>e.name).join('、') : '';
    h += '<div class="tmpl" data-act="editTpl" data-i="'+w+'">';
    h +=   '<div class="wkname" style="color:'+((dow(today())===w)?'var(--brand)':'var(--text-2)')+'">'+WEEK_CN[w]+'</div>';
    h +=   '<div class="info"><div class="nm">'+esc(nm)+'</div>'
      +    '<div class="ex">'+(exs?esc(exs):'点击从模板库或动作库添加')+'</div></div>';
    h +=   '<div class="arw">›</div>';
    h += '</div>';
  });
  h += '</div>';

  // 常用动作
  const fr = freqRank(8);
  if(fr.length){
    const max = fr[0].count;
    h += '<div class="card"><div class="sec-title">我最常练的动作 <span class="more">按累计组数</span></div>';
    fr.forEach((f,i) => {
      h += '<div class="freqrow"><span class="rk'+(i<3?' top':'')+'">'+(i+1)+'</span>'
        +  '<span class="nm">'+esc(f.name)+'</span>'
        +  '<span class="bar" style="width:'+Math.max(6, Math.round(f.count/max*70))+'px;background:'+f.color+'"></span>'
        +  '<span class="tiny dim num" style="width:44px;text-align:right">'+f.count+' 组</span></div>';
    });
    h += '</div>';
  }

  // 自动填充设置
  h += '<div class="card"><div class="sec-title">录入偏好</div>';
  h += '<div class="field"><span class="k">自动带入上次成绩</span>'
    +  '<button class="btn sm '+(p.autoFill?'primary':'ghost')+'" data-act="toggleAuto">'+(p.autoFill?'已开启':'已关闭')+'</button></div>';
  h += '<div class="field"><span class="k">默认组数</span><span class="v"><span class="seg">'
    +  [2,3,4,5].map(n=>'<button class="'+(p.defSets===n?'on':'')+'" data-act="defSets" data-i="'+n+'">'+n+'</button>').join('')
    +  '</span></span></div>';
  h += '<div class="field"><span class="k">组间休息</span><span class="v"><span class="seg">'
    +  [60,90,120,180].map(n=>'<button class="'+(p.restSec===n?'on':'')+'" data-act="restSec" data-i="'+n+'">'+n+'s</button>').join('')
    +  '</span></span></div>';
  h += '<div class="tiny dim" style="margin-top:8px">开启后：套用模板或添加动作时，重量与次数会自动填入上次训练的数值，你只需改动的部分。</div>';
  h += '</div>';
  return h;
}

/* ===================== 渲染：模板编辑 ===================== */
function viewTplEdit(){
  const w = SUB.w;
  const t = DB.templates[w] || emptyTpl();
  let h = '';
  h += '<div class="card"><div class="sec-title">'+WEEK_CN[w]+' · 计划名称</div>';
  h += '<input class="inp" data-act="tplName" value="'+esc(t.name)+'" placeholder="例如：推 · 胸肩三头" style="text-align:left;width:100%">';
  h += '</div>';

  h += '<div class="card"><div class="sec-title">动作清单 <span class="more">'+(t.exs?t.exs.length:0)+' 个</span></div>';
  if(!t.exs || !t.exs.length){
    h += '<div class="tiny dim" style="padding:8px 0">还没有动作。可从下方模板库一键套用，或逐个添加。</div>';
  } else {
    t.exs.forEach((e,i) => {
      const L = libFind(e.name) || {part:e.part};
      const c = partInfo(L.part).color;
      h += '<div class="exitem" data-act="none">';
      h +=   '<span class="dot" style="background:'+c+'"></span>';
      h +=   '<span class="nm">'+esc(e.name)+'<div class="tiny dim">'+e.sets+' 组 × '+e.reps+(e.mode==='time'?' 分钟':' 次')+'</div></span>';
      h +=   '<button class="btn ghost sm" data-act="tplSets" data-i="'+i+'">'+e.sets+'×'+e.reps+'</button>';
      h +=   '<button class="del" data-act="tplDel" data-i="'+i+'">✕</button>';
      h += '</div>';
    });
  }
  h += '<button class="btn ghost block sm" data-act="pickForTpl" style="margin-top:10px">+ 从动作库添加</button>';
  h += '</div>';

  h += '<div class="card"><div class="sec-title">套用现成分化</div><div class="chips">';
  Object.keys(PRESET_TPL).forEach(k => {
    h += '<span class="chip" data-act="preset" data-k="'+k+'">'+PRESET_TPL[k].name+'</span>';
  });
  h += '</div>';
  h += '<button class="btn danger block sm" data-act="tplClear" style="margin-top:11px">清空这一天</button>';
  h += '</div>';
  return h;
}

/* ===================== 渲染：统计 ===================== */
function viewStats(){
  const dates = RANGE==='week' ? weekDates() : (RANGE==='month' ? lastDays(30) : allDates());
  const st = rangeStats(dates);
  const wk = DB.profile.weekDays||[];
  const goalN = wk.length || 4;
  const doneN = weekDoneCount();
  const series = volumeSeries(RANGE==='week'?weekDates():lastDays(RANGE==='month'?14:30));
  const maxV = Math.max(1, ...series.map(s=>s.volume));
  const parts = partStats(dates);
  const prs = prBoard(6);
  const ws = getWeights().slice(-14);

  let h = '';
  h += '<div class="seg" style="margin-bottom:12px">'
    +  ['week','month','all'].map(k=>'<button class="'+(RANGE===k?'on':'')+'" data-act="range" data-k="'+k+'">'
    +  ({week:'本周',month:'近30天',all:'全部'}[k])+'</button>').join('')+'</div>';

  h += '<div class="kpis">';
  h +=   kpi(st.days, '训练天数') + kpi(kgText(st.volume), '总容量') + kpi(st.sets, '总组数') + kpi(st.duration, '总分钟');
  h += '</div>';

  // 本周打卡环
  h += '<div class="card"><div class="sec-title">本周计划完成度</div>';
  h += '<div class="row" style="gap:12px">';
  h +=   '<div style="flex:0 0 auto">'+ring(Math.round(doneN/goalN*100), doneN+'/'+goalN)+'</div>';
  h +=   '<div style="flex:1">';
  weekDates().forEach(d => {
    const on = wk.indexOf(dow(d))>=0, done = hasW(DB.logs[d]);
    h += '<div class="row between" style="padding:3px 0">'
      +  '<span class="sm" style="color:'+(d===today()?'var(--brand)':'var(--text-2)')+'">'+WEEK_CN[dow(d)]+(d===today()?' · 今天':'')+'</span>'
      +  '<span class="tiny '+(done?'':'dim')+'" style="color:'+(done?'var(--ok)':'')+'">'
      +  (done?('已完成 · '+kgText(decorate(DB.logs[d]).volume)):(on?'计划中 · 未打卡':'休息'))+'</span></div>';
  });
  h +=   '</div></div></div>';

  // 容量趋势
  h += '<div class="card"><div class="sec-title">训练容量趋势 <span class="more">'+kgText(st.volume)+' 累计</span></div>';
  h += '<div class="bars">';
  series.forEach(s => {
    const pct = Math.round(s.volume/maxV*100);
    h += '<div class="b"><div class="col'+(s.volume?' on':'')+'" style="height:'+Math.max(3,pct)+'%"></div>'
      +  '<div class="lb">'+(s.done?s.label:'·')+'</div></div>';
  });
  h += '</div></div>';

  // 部位分布
  if(parts.length){
    h += '<div class="card"><div class="sec-title">部位分布 <span class="more">按组数</span></div>';
    parts.forEach(p => {
      h += '<div class="distrow"><span class="nm">'+p.name+'</span>'
        +  '<span class="track"><span class="fill" style="width:'+p.pct+'%;background:'+p.color+'"></span></span>'
        +  '<span class="v">'+p.sets+' 组</span></div>';
    });
    h += '</div>';
  }

  // PR 榜
  if(prs.length){
    h += '<div class="card"><div class="sec-title">个人纪录 PR <span class="more">估算 1RM · Epley</span></div>';
    prs.forEach(p => {
      h += '<div class="prrow"><span style="width:7px;height:7px;border-radius:50%;background:'+p.color+'"></span>'
        +  '<span class="nm">'+esc(p.name)+'<div class="sub">'+p.partName+' · 最重 '+toDisplay(p.w)+uText()+' · '+dateText(p.date)+'</div></span>'
        +  '<span class="val">'+toDisplay(p.e)+'<span class="tiny" style="color:var(--text-3);font-weight:400"> '+uText()+'</span></span></div>';
    });
    h += '<div class="tiny dim" style="margin-top:9px">1RM 为估算值，按 Epley 公式：重量 ×(1+次数/30)，用于观察力量趋势，不等于实测极限。</div>';
    h += '</div>';
  }

  // 体重
  h += '<div class="card"><div class="sec-title">体重趋势 <span class="more">'+(ws.length?ws[ws.length-1].kg+'kg':'暂无')+'</span></div>';
  if(ws.length>=2){ h += sparkline(ws); }
  else h += '<div class="tiny dim" style="padding:6px 0">至少记录两次才能看到趋势</div>';
  h += '<button class="btn ghost block sm" data-act="goWeight" style="margin-top:10px">记录 / 管理体重</button>';
  h += '</div>';

  // 日历
  h += '<div class="card"><div class="sec-title">训练日历 <span class="more">'
    +  '<span class="chip sm" data-act="pm">‹</span> '+YM+' <span class="chip sm" data-act="nm">›</span></span></div>';
  h += '<div class="cal">';
  ['一','二','三','四','五','六','日'].forEach(x => h += '<div class="h">'+x+'</div>');
  calendar(YM).forEach(c => {
    if(c.pad){ h += '<div class="c pad"></div>'; return; }
    h += '<div class="c lv'+c.level+(c.date===today()?' today':'')+'" data-act="day" data-k="'+c.date+'">'+c.day+'</div>';
  });
  h += '</div>';
  h += '<div class="tiny dim" style="margin-top:9px">颜色深浅 = 当日训练容量高低，点击可查看/补录当天</div>';
  h += '</div>';
  return h;
}
const kpi = (n,t) => '<div class="kpi"><div class="n">'+n+'</div><div class="t">'+t+'</div></div>';
function ring(pct, label){
  const r=26, c=2*Math.PI*r, off=c*(1-Math.min(1,pct/100));
  return '<svg width="70" height="70" viewBox="0 0 70 70">'
    + '<circle cx="35" cy="35" r="'+r+'" fill="none" stroke="#252A34" stroke-width="7"/>'
    + '<circle cx="35" cy="35" r="'+r+'" fill="none" stroke="#FF6B35" stroke-width="7" stroke-linecap="round"'
    + ' stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90 35 35)"/>'
    + '<text x="35" y="39" text-anchor="middle" fill="#EDEFF5" font-size="14" font-weight="700">'+label+'</text></svg>';
}
function sparkline(ws){
  const W=330, H=88, pad=6;
  const vals = ws.map(w=>w.kg);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(0.6, max-min);
  const pts = vals.map((v,i) => {
    const x = pad + i*(W-2*pad)/(vals.length-1);
    const y = pad + (1-(v-min)/span)*(H-2*pad-8);
    return [x,y];
  });
  const path = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area = path + ' L'+pts[pts.length-1][0].toFixed(1)+' '+(H-pad)+' L'+pts[0][0].toFixed(1)+' '+(H-pad)+' Z';
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'
    + '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="#FF6B35" stop-opacity=".35"/><stop offset="100%" stop-color="#FF6B35" stop-opacity="0"/></linearGradient></defs>'
    + '<path d="'+area+'" fill="url(#g1)"/>'
    + '<path d="'+path+'" fill="none" stroke="#FF9A3C" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
    + pts.map((p,i)=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(i===pts.length-1?3.2:1.8)+'" fill="'+(i===pts.length-1?'#FF6B35':'#6B7280')+'"/>').join('')
    + '</svg>'
    + '<div class="row between tiny dim" style="margin-top:2px"><span>'+ws[0].date.slice(5)+' · '+ws[0].kg+'</span>'
    + '<span>最低 '+min+' / 最高 '+max+'</span><span>'+ws[ws.length-1].date.slice(5)+' · '+ws[ws.length-1].kg+'</span></div>';
}

/* ===================== 渲染：我的 ===================== */
function viewMine(){
  const p = DB.profile;
  const ws = getWeights();
  const last = ws.length ? ws[ws.length-1] : null;
  let h = '';
  h += '<div class="card"><div class="row" style="gap:12px">'
    +  '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--brand-2));'
    +  'display:flex;align-items:center;justify-content:center;font-size:20px;color:#1A1005;font-weight:800">'
    +  esc((p.name||'我').slice(0,1))+'</div>'
    +  '<div style="flex:1"><div style="font-size:16px;font-weight:600">'+esc(p.name||'健身达人')+'</div>'
    +  '<div class="tiny dim">'+GOALS[p.goal]+' · '+LEVELS[p.level]+' · 已记录 '+totalDays()+' 天</div></div>'
    +  '<button class="btn ghost sm" data-act="editProfile">编辑</button></div></div>';

  h += '<div class="card"><div class="sec-title">今日自动同步</div>';
  const st = DB.steps[today()];
  h += '<div class="field"><span class="k">步数（微信运动）</span>'
    +  '<span class="v"><input class="inp" type="number" inputmode="numeric" data-act="steps" value="'+(st||'')+'" placeholder="手动填写" style="width:96px;text-align:right;display:inline-block"></span></div>';
  h += '<div class="field"><span class="k">体重</span>'
    +  '<span class="v"><input class="inp" type="number" inputmode="decimal" data-act="quickW" value="'+(last&&last.date===today()?last.kg:'')+'" placeholder="kg" style="width:96px;text-align:right;display:inline-block"></span></div>';
  h += '<div class="syncnote" style="margin-top:10px">'
    +  '<b>能自动抓取的：</b>训练动作与组数（套用计划时自动带入上次成绩）、组间休息倒计时、训练总时长、容量 / 组数 / 估算 1RM、破纪录自动识别。<br>'
    +  '<b>不能自动抓取的：</b>网页版读不到系统健康数据。小程序版可用微信运动步数自动填充；心率、睡眠目前微信未对个人开发者开放。'
    +  '</div></div>';

  h += '<div class="card"><div class="sec-title">快捷入口</div>';
  h += '<div class="chips">';
  h += '<span class="chip" data-act="goPlan">训练计划与习惯</span>';
  h += '<span class="chip" data-act="goWeight">体重管理</span>';
  h += '<span class="chip" data-act="goStats">数据统计</span>';
  h += '</div></div>';

  h += '<div class="card"><div class="sec-title">数据管理</div>';
  h += '<button class="btn ghost block sm" data-act="export" style="margin-bottom:8px">导出备份（JSON）</button>';
  h += '<button class="btn ghost block sm" data-act="import" style="margin-bottom:8px">导入备份</button>';
  h += '<button class="btn ghost block sm" data-act="reseed" style="margin-bottom:8px">载入示例数据（覆盖当前）</button>';
  h += '<button class="btn ghost block sm danger" data-act="clear">清空全部数据</button>';
  h += '</div>';

  h += '<div class="card"><div class="sec-title">单位与显示</div>';
  h += '<div class="field"><span class="k">重量单位</span><span class="seg">'
    +  ['kg','lb'].map(k=>'<button class="'+(p.unit===k?'on':'')+'" data-act="unit" data-k="'+k+'">'+k+'</button>').join('')
    +  '</span></div>';
  h += '<div class="tiny dim" style="margin-top:8px">内部统一以 kg 存储，切换单位仅影响显示。</div>';
  h += '</div>';

  h += '<div class="tiny dim" style="text-align:center;padding:4px 0 8px">每日健身 · v2.0 · 数据全部留在本机</div>';
  return h;
}

/* ===================== 渲染：体重页 ===================== */
function viewWeight(){
  const ws = getWeights();
  const recent = ws.slice(-30);
  let h = '';
  h += '<div class="card">';
  h += '<div class="sec-title">记录今天</div>';
  h += '<div class="row" style="gap:8px">';
  h += '<input class="inp" type="number" inputmode="decimal" data-act="newW" placeholder="'+(ws.length?ws[ws.length-1].kg:'68.0')+'" style="text-align:left">';
  h += '<span class="unit">kg</span>';
  h += '<button class="btn primary" data-act="saveW">保存</button>';
  h += '</div>';
  if(ws.length>=2){
    const a = ws[ws.length-1].kg, b = ws[Math.max(0,ws.length-8)].kg;
    const d7 = round1(a-b);
    h += '<div class="row" style="gap:8px;margin-top:12px">';
    h += '<div style="flex:1"><div class="tiny dim">当前</div><div class="b">'+a+' kg</div></div>';
    h += '<div style="flex:1"><div class="tiny dim">近 7 次变化</div><div class="b" style="color:'+(d7<0?'var(--ok)':(d7>0?'var(--brand)':'var(--text-2)'))+'">'+(d7>0?'+':'')+d7+' kg</div></div>';
    h += '<div style="flex:1"><div class="tiny dim">最低 / 最高</div><div class="b">'+Math.min(...recent.map(x=>x.kg))+' / '+Math.max(...recent.map(x=>x.kg))+'</div></div>';
    h += '</div>';
  }
  h += '</div>';
  if(recent.length>=2){ h += '<div class="card"><div class="sec-title">近 30 次趋势</div>'+sparkline(recent)+'</div>'; }
  if(ws.length){
    h += '<div class="card"><div class="sec-title">历史记录 <span class="more">'+ws.length+' 条</span></div>';
    ws.slice().reverse().slice(0,40).forEach(w => {
      h += '<div class="field"><span class="k">'+w.date+' <span class="tiny dim">'+weekday(w.date)+'</span></span>'
        +  '<span class="v"><span class="num">'+w.kg+' kg</span> <button class="btn sm ghost" data-act="delW" data-k="'+w.date+'">删</button></span></div>';
    });
    h += '</div>';
  }
  return h;
}

/* ===================== 渲染：某天详情 ===================== */
function viewDay(){
  const d = SUB.date;
  const log = getLog(d);
  const dec = decorate(log);
  let h = '';
  h += '<div class="card"><div class="sec-title">'+dateTextFull(d)+(d===today()?' · 今天':'')+'</div>';
  if(!dec.exercises.length){ h += '<div class="tiny dim" style="padding:6px 0">这天没有训练记录</div>'; }
  else {
    h += '<div class="row" style="gap:14px;margin-bottom:4px">'
      +  '<div><div class="tiny dim">动作</div><div class="b">'+dec.exercises.length+'</div></div>'
      +  '<div><div class="tiny dim">组数</div><div class="b">'+dec.sets+'</div></div>'
      +  '<div><div class="tiny dim">容量</div><div class="b">'+kgText(dec.volume)+'</div></div>'
      +  '<div><div class="tiny dim">时长</div><div class="b">'+(dec.duration||'—')+'分</div></div></div>';
    dec.exercises.forEach(ex => {
      h += '<div style="padding:9px 0;border-top:1px solid var(--line)">';
      h += '<div class="row between"><span class="b">'+esc(ex.name)+'</span><span class="tag">'+ex.partName+'</span></div>';
      h += '<div class="tiny dim" style="margin-top:3px">'+esc(ex.setsText)+'</div></div>';
    });
  }
  h += '</div>';
  if(d !== today()){
    h += '<button class="btn primary block" data-act="backfill" style="margin-bottom:12px">切换到这天去补录</button>';
  }
  return h;
}

/* ===================== 弹层：动作选择 ===================== */
function sheetPick(){
  const mode = SUB.pickMode || 'train';
  let h = '';
  h += '<div class="sh"><span class="t">选择动作</span><button class="navbtn" data-act="closeSheet">关闭</button></div>';
  h += '<div class="sb">';
  h += '<input class="inp" data-act="kw" placeholder="搜索动作名称" value="'+esc(T.kw)+'" style="width:100%;text-align:left;margin-bottom:10px">';
  h += '<div class="chips" style="margin-bottom:12px">';
  PARTS.forEach(p => { h += '<span class="chip'+(T.part===p.key?' on':'')+'" data-act="part" data-k="'+p.key+'">'+p.name+'</span>'; });
  h += '</div>';
  const fr = {};
  freqRank(999).forEach(f => fr[f.name] = f.count);
  const kw = T.kw.trim();
  const list = LIB.filter(x => (T.part==='all'||x.part===T.part) && (!kw || x.name.indexOf(kw)>=0))
    .sort((a,b) => (fr[b.name]||0)-(fr[a.name]||0));
  if(!list.length) h += '<div class="tiny dim" style="padding:10px 0">没有匹配的动作</div>';
  list.forEach(x => {
    h += '<div class="exitem" data-act="chooseEx" data-k="'+esc(x.name)+'">';
    h += '<span class="dot" style="background:'+partInfo(x.part).color+'"></span>';
    h += '<span class="nm">'+esc(x.name)+'</span>';
    h += '<span class="mt">'+MODE_TEXT[x.mode]+'</span>';
    h += '<span class="fq">'+(fr[x.name]?fr[x.name]+' 组':'')+'</span>';
    h += '</div>';
  });
  h += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">';
  h += '<div class="sm b" style="margin-bottom:8px">自定义动作</div>';
  h += '<div class="row" style="gap:6px;margin-bottom:6px">';
  h += '<input class="inp" data-act="newName" placeholder="动作名称" value="'+esc(T.newName)+'" style="text-align:left">';
  h += '<select class="inp" data-act="newPart" style="flex:0 0 auto;width:74px">';
  PARTS.forEach(p => { h += '<option value="'+p.key+'"'+(T.newPart===p.key?' selected':'')+'>'+p.name+'</option>'; });
  h += '</select></div>';
  h += '<div class="row" style="gap:6px">';
  h += '<select class="inp" data-act="newMode" style="flex:0 0 auto;width:88px">';
  [['weight','负重'],['body','自重'],['time','计时']].forEach(m => {
    h += '<option value="'+m[0]+'"'+(T.newMode===m[0]?' selected':'')+'>'+m[1]+'</option>'; });
  h += '</select>';
  h += '<button class="btn" data-act="addCustom" style="flex:1">添加并使用</button>';
  h += '</div></div>';
  h += '</div>';
  return '<div class="mask" data-act="closeSheet"><div class="sheet" data-act="stop">'+h+'</div></div>';
}

/* ===================== 弹层：档案编辑 ===================== */
function sheetProfile(){
  const p = DB.profile;
  let h = '<div class="sh"><span class="t">编辑档案</span><button class="navbtn" data-act="closeSheet">完成</button></div><div class="sb">';
  h += '<div class="field"><span class="k">昵称</span><input data-act="f_name" value="'+esc(p.name)+'"></div>';
  h += '<div class="field"><span class="k">性别</span><select data-act="f_gender">'
    +  '<option value="male"'+(p.gender==='male'?' selected':'')+'>男</option>'
    +  '<option value="female"'+(p.gender==='female'?' selected':'')+'>女</option></select></div>';
  h += '<div class="field"><span class="k">身高（cm）</span><input type="number" data-act="f_height" value="'+(p.height||'')+'"></div>';
  h += '<div class="field"><span class="k">训练目标</span><select data-act="f_goal">'
    +  Object.keys(GOALS).map(k=>'<option value="'+k+'"'+(p.goal===k?' selected':'')+'>'+GOALS[k]+'</option>').join('')+'</select></div>';
  h += '<div class="field"><span class="k">经验水平</span><select data-act="f_level">'
    +  Object.keys(LEVELS).map(k=>'<option value="'+k+'"'+(p.level===k?' selected':'')+'>'+LEVELS[k]+'</option>').join('')+'</select></div>';
  h += '<div class="field"><span class="k">常练时段</span><select data-act="f_slot">'
    +  Object.keys(SLOTS).map(k=>'<option value="'+k+'"'+(p.slot===k?' selected':'')+'>'+SLOTS[k]+'</option>').join('')+'</select></div>';
  h += '<div class="tiny dim" style="margin-top:12px">档案用于生成更贴合的训练建议，不会上传。</div>';
  h += '</div>';
  return '<div class="mask" data-act="closeSheet"><div class="sheet" data-act="stop">'+h+'</div></div>';
}

/* ===================== 弹层：模板动作组数 ===================== */
function sheetSets(){
  const w = SUB.w, i = SUB.i;
  const t = DB.templates[w];
  if(!t || !t.exs[i]) return '';
  const e = t.exs[i];
  let h = '<div class="sh"><span class="t">'+esc(e.name)+'</span><button class="navbtn" data-act="closeSheet">完成</button></div><div class="sb">';
  h += '<div class="field"><span class="k">组数</span><span class="seg">'
    +  [2,3,4,5,6].map(n=>'<button class="'+(e.sets===n?'on':'')+'" data-act="e_sets" data-i="'+n+'">'+n+'</button>').join('')+'</span></div>';
  h += '<div class="field"><span class="k">每组目标'+(e.mode==='time'?'（分钟）':'（次数）')+'</span>'
    +  '<input type="number" data-act="e_reps" value="'+e.reps+'"></div>';
  h += '<div class="tiny dim" style="margin-top:10px">套用时按这个组数生成，并自动填入上次的重量与次数。</div>';
  h += '</div>';
  return '<div class="mask" data-act="closeSheet"><div class="sheet" data-act="stop">'+h+'</div></div>';
}

/* ===================== 主渲染 ===================== */
const NAV_TITLE = {train:'训练', plan:'计划', stats:'统计', mine:'我的', tplEdit:'编辑计划', weight:'体重', day:'训练详情'};
function render(){
  let body = '';
  if(page==='train') body = viewTrain();
  else if(page==='plan') body = viewPlan();
  else if(page==='stats') body = viewStats();
  else if(page==='mine') body = viewMine();
  else if(page==='tplEdit') body = viewTplEdit();
  else if(page==='weight') body = viewWeight();
  else if(page==='day') body = viewDay();

  navTitleEl.textContent = NAV_TITLE[page] || '';
  const backable = ['tplEdit','weight','day'].indexOf(page)>=0;
  navLeftEl.innerHTML = backable ? '<button class="navbtn" data-act="back">‹ 返回</button>' : '';
  navRightEl.innerHTML = page==='train' ? '<button class="navbtn brand" data-act="pickEx">＋</button>'
    : (page==='weight' ? '' : '');

  screenEl.innerHTML = body;
  tabbarEl.innerHTML = TABS.map(t =>
    '<button class="tab'+(page===t.k||(backable&&t.k===SUB.from)?' on':'')+'" data-act="tab" data-k="'+t.k+'">'
    + '<span class="ic">'+t.i+'</span><span class="lb">'+t.t+'</span></button>').join('');

  // 浮层
  let overlay = '';
  if(T.picker) overlay = sheetPick();
  else if(SUB.profile) overlay = sheetProfile();
  else if(SUB.setsEditor) overlay = sheetSets();
  if(REST) overlay += restBar();
  screenEl.parentElement.querySelectorAll('.mask').forEach(n=>n.remove());
  screenEl.parentElement.querySelectorAll('.rest').forEach(n=>n.remove());
  if(overlay) screenEl.parentElement.insertAdjacentHTML('beforeend', overlay);
}
function restBar(){
  return '<div class="rest"><div><div class="n">'+REST.left+'s</div><div class="lb">组间休息</div></div>'
    + '<button class="btn ghost sm" data-act="restAdd">+30s</button>'
    + '<button class="btn primary sm" data-act="restStop">跳过</button></div>';
}
function sessionMin(){
  if(!session.on) return '';
  return Math.max(1, Math.round((Date.now()-session.start)/60000))+' 分钟';
}

/* ===================== 交互 ===================== */
function setTab(k){ page = k; SUB = {}; T.picker=false;
  if(k==='train' && !hasW(DB.logs[T.date]) && T.date===today()){
    const wd = dow(today());
    if((DB.profile.weekDays||[]).indexOf(wd)>=0 && DB.templates[wd] && DB.templates[wd].exs.length){
      const n = applyTemplate(today());
      if(n) setTimeout(()=>toast('已按'+WEEK_CN[wd]+'计划带入 '+n+' 个动作'), 400);
    }
  }
  render();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.getAttribute('data-act');
  const i = +el.getAttribute('data-i');
  const j = +el.getAttribute('data-j');
  const k = el.getAttribute('data-k');
  if(act==='stop'){ e.stopPropagation(); return; }

  /* --- Tab / 导航 --- */
  if(act==='tab'){ setTab(k); return; }
  if(act==='back'){
    if(page==='tplEdit'){ page='plan'; } else if(page==='weight'){ page='stats'; } else if(page==='day'){ page='stats'; }
    SUB={}; render(); return;
  }
  if(act==='goPlan'){ page='plan'; SUB={}; render(); return; }
  if(act==='goStats'){ page='stats'; RANGE='week'; SUB={}; render(); return; }
  if(act==='goWeight'){ page='weight'; SUB={from:RANGE==='week'?'stats':'stats'}; render(); return; }

  /* --- 训练页 --- */
  if(act==='applyTpl'){ const n = applyTemplate(T.date); render(); if(n) toast('已带入 '+n+' 个动作（含上次成绩）'); return; }
  if(act==='pickEx'){ T.picker=true; T.kw=''; SUB.pickMode='train'; render(); focusSoon('[data-act=kw]'); return; }
  if(act==='closeSheet'){ T.picker=false; SUB.profile=false; SUB.setsEditor=false; render(); return; }
  if(act==='part'){ T.part=k; render(); return; }
  if(act==='chooseEx'){
    const name = k;
    if(SUB.pickMode==='tpl'){
      const w = SUB.w; if(!DB.templates[w]) DB.templates[w] = emptyTpl();
      const L = libFind(name) || {part:T.newPart, mode:T.newMode};
      DB.templates[w].exs.push({name, part:L.part, mode:L.mode, sets:DB.profile.defSets||3, reps:L.mode==='time'?1:10});
      save(); T.picker=false; render(); toast('已加入'+WEEK_CN[w]+'计划');
    } else {
      T.picker=false; addExercise(name); render();
    }
    return;
  }
  if(act==='addCustom'){
    const name = T.newName.trim();
    if(!name){ toast('请输入动作名称'); return; }
    if(SUB.pickMode==='tpl'){
      const w = SUB.w; if(!DB.templates[w]) DB.templates[w] = emptyTpl();
      DB.templates[w].exs.push({name, part:T.newPart, mode:T.newMode, sets:DB.profile.defSets||3, reps:T.newMode==='time'?1:10});
      save(); T.newName=''; T.picker=false; render(); toast('已加入计划');
    } else {
      T.picker=false; addExercise(name); T.newName=''; render();
    }
    return;
  }
  if(act==='delEx'){ const log=getLog(T.date); log.exercises.splice(i,1); saveLog(log); render(); return; }
  if(act==='addSet'){
    const log=getLog(T.date); const ex=log.exercises[i];
    const last = ex.sets[ex.sets.length-1];
    ex.sets.push(last ? {id:uid(), w:last.w, r:last.r, ok:false} : {id:uid(), w:'', r:'', ok:false});
    saveLog(log); render(); return;
  }
  if(act==='delSet'){ const log=getLog(T.date); log.exercises[i].sets.splice(j,1); saveLog(log); render(); return; }
  if(act==='okSet'){
    const log=getLog(T.date); const s=log.exercises[i].sets[j]; const ex=log.exercises[i];
    s.ok = !s.ok; saveLog(log);
    if(s.ok){
      // PR 判定
      if(ex.mode==='weight' && num(s.w)>0 && num(s.r)>0){
        let prevBest = 0;
        allDates().forEach(d => { if(d>=T.date) return;
          (DB.logs[d].exercises||[]).forEach(x => { if(x.name!==ex.name||x.mode!=='weight') return;
            (x.sets||[]).forEach(y => { const e2=e1rm(num(y.w),num(y.r)); if(e2>prevBest) prevBest=e2; }); }); });
        const cur = e1rm(num(s.w), num(s.r));
        if(cur > prevBest && prevBest>0){ toast('🏆 新纪录！'+ex.name+' 估算 1RM '+toDisplay(cur)+uText()); }
      }
      startRest();
    }
    render(); return;
  }
  if(act==='start'){ session={on:true, start:Date.now()}; startTick(); render(); toast('开始训练，计时中'); return; }
  if(act==='finish'){
    const log=getLog(T.date);
    const mins = session.on ? Math.max(1, Math.round((Date.now()-session.start)/60000)) : (log.duration||0);
    log.duration = mins; log.done = true; saveLog(log);
    session={on:false,start:0}; stopTick(); stopRest();
    const dec = decorate(log);
    toast('训练完成 · '+dec.sets+' 组 · '+kgText(dec.volume)+' · '+mins+' 分钟');
    render(); return;
  }
  if(act==='restAdd'){ if(REST) REST.left += 30; render(); return; }
  if(act==='restStop'){ stopRest(); render(); return; }

  /* --- 计划页 --- */
  if(act==='toggleDay'){
    const w=i; const arr = DB.profile.weekDays||[];
    const p = arr.indexOf(w);
    if(p>=0){ arr.splice(p,1); delete DB.templates[w]; }
    else { arr.push(w); if(!DB.templates[w]) DB.templates[w] = emptyTpl(); }
    arr.sort(); DB.profile.weekDays=arr; save(); render(); return;
  }
  if(act==='editTpl'){ page='tplEdit'; SUB={w:i, from:'plan'}; render(); return; }
  if(act==='preset'){ DB.templates[SUB.w] = buildTpl(k); save(); render(); toast('已套用'+PRESET_TPL[k].name); return; }
  if(act==='tplDel'){ DB.templates[SUB.w].exs.splice(i,1); save(); render(); return; }
  if(act==='tplSets'){ SUB.i=i; SUB.setsEditor=true; render(); return; }
  if(act==='e_sets'){ DB.templates[SUB.w].exs[SUB.i].sets=i; save(); render(); return; }
  if(act==='e_reps'){ return; }
  if(act==='tplClear'){ DB.templates[SUB.w]=emptyTpl(); save(); render(); toast('已清空'); return; }
  if(act==='pickForTpl'){ T.picker=true; T.kw=''; SUB.pickMode='tpl'; render(); focusSoon('[data-act=kw]'); return; }
  if(act==='toggleAuto'){ DB.profile.autoFill=!DB.profile.autoFill; save(); render(); return; }
  if(act==='defSets'){ DB.profile.defSets=i; save(); render(); return; }
  if(act==='restSec'){ DB.profile.restSec=i; save(); render(); return; }
  if(act==='editProfile'){ SUB.profile=true; render(); return; }

  /* --- 统计页 --- */
  if(act==='range'){ RANGE=k; render(); return; }
  if(act==='pm'){ const p=YM.split('-'); let y=+p[0],m=+p[1]-1; if(m<1){m=12;y--;} YM=y+'-'+pad(m); render(); return; }
  if(act==='nm'){ const p=YM.split('-'); let y=+p[0],m=+p[1]+1; if(m>12){m=1;y++;} YM=y+'-'+pad(m); render(); return; }
  if(act==='day'){ page='day'; SUB={date:k, from:'stats'}; render(); return; }
  if(act==='backfill'){ T.date=SUB.date; page='train'; SUB={}; render(); toast('已切换到 '+dateText(T.date)); return; }

  /* --- 我的 --- */
  if(act==='unit'){ DB.profile.unit=k; save(); render(); return; }
  if(act==='export'){
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'fitness-backup-'+today()+'.json'; a.click();
    toast('已导出'); return;
  }
  if(act==='import'){
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange = () => { const f=inp.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result);
        if(!d.logs) throw 0; DB=migrate(d); save(); render(); toast('导入成功'); }catch(e){ toast('文件格式不对'); } };
      r.readAsText(f); };
    inp.click(); return;
  }
  if(act==='reseed'){ DB=seed(); save(); render(); toast('已载入示例数据'); return; }
  if(act==='clear'){ if(confirm('确定清空全部训练、体重与设置？此操作不可恢复。')){
    DB={v:2, logs:{}, weights:[], steps:{}, profile:defProfile(), templates:{}}; save(); render(); toast('已清空'); } return; }

  /* --- 体重页 --- */
  if(act==='saveW'){
    const el2 = screenEl.querySelector('[data-act=newW]');
    const v = num(el2 && el2.value);
    if(v<=0){ toast('请输入体重'); return; }
    setWeight(today(), v); render(); toast('已记录 '+v+'kg'); return;
  }
  if(act==='delW'){ DB.weights = DB.weights.filter(w=>w.date!==k); save(); render(); return; }
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.getAttribute('data-act');
  const v = el.value;
  if(act==='kw'){ T.kw=v; renderSheetOnly(); return; }
  if(act==='newName'){ T.newName=v; return; }
  if(act==='newPart'){ T.newPart=v; return; }
  if(act==='newMode'){ T.newMode=v; return; }
  if(act==='tplName'){ if(DB.templates[SUB.w]) { DB.templates[SUB.w].name=v; save(); } return; }
  if(act==='e_reps'){ if(DB.templates[SUB.w] && DB.templates[SUB.w].exs[SUB.i]){ DB.templates[SUB.w].exs[SUB.i].reps=num(v); save(); } return; }
  if(act==='f_name'){ DB.profile.name=v; save(); return; }
  if(act==='f_height'){ DB.profile.height=num(v); save(); return; }
  if(act==='f_gender'){ DB.profile.gender=v; save(); return; }
  if(act==='f_goal'){ DB.profile.goal=v; save(); return; }
  if(act==='f_level'){ DB.profile.level=v; save(); return; }
  if(act==='f_slot'){ DB.profile.slot=v; save(); return; }
  if(act==='steps'){ DB.steps[today()] = num(v); save(); return; }
  if(act==='quickW'){ const n=num(v); if(n>0){ setWeight(today(), n); } return; }
  if(act==='duration'){ const log=getLog(T.date); log.duration=num(v); saveLog(log); return; }
  if(act==='note'){ const log=getLog(T.date); log.note=v; saveLog(log); return; }
  if(act==='w' || act==='r'){
    const i=+el.getAttribute('data-i'), j=+el.getAttribute('data-j');
    const log=getLog(T.date); const s=log.exercises[i].sets[j];
    if(act==='w') s.w = v==='' ? '' : fromDisplay(num(v));
    else s.r = v==='' ? '' : num(v);
    saveLog(log); return;
  }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.getAttribute('data-act');
  if(act==='newPart'){ T.newPart=el.value; return; }
  if(act==='newMode'){ T.newMode=el.value; return; }
  if(act==='f_gender'||act==='f_goal'||act==='f_level'||act==='f_slot'){
    const map={f_gender:'gender',f_goal:'goal',f_level:'level',f_slot:'slot'};
    DB.profile[map[act]]=el.value; save(); return;
  }
});

function renderSheetOnly(){
  const m = document.querySelector('.mask');
  if(!m) return;
  const inp = m.querySelector('[data-act=kw]');
  const pos = inp ? inp.selectionStart : 0;
  m.outerHTML = sheetPick();
  const n = document.querySelector('.mask [data-act=kw]');
  if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} }
}
function focusSoon(sel){ setTimeout(()=>{ const n=document.querySelector(sel); if(n) n.focus(); },60); }

/* ---- 组间休息计时 ---- */
function startRest(){
  stopRest();
  const sec = DB.profile.restSec || 90;
  REST = {left: sec, timer:null};
  REST.timer = setInterval(() => {
    if(!REST) return;
    REST.left--;
    const bar = document.querySelector('.rest .n');
    if(bar) bar.textContent = REST.left+'s';
    if(REST.left<=0){ stopRest(); toast('休息结束，开始下一组'); const b=document.querySelector('.rest'); if(b) b.remove(); }
  }, 1000);
}
function stopRest(){ if(REST && REST.timer) clearInterval(REST.timer); REST=null; }
function startTick(){
  stopTick();
  session.tick = setInterval(() => {
    const b = document.querySelector('.running');
    if(b){ const em=b.querySelector('em'); if(em) em.textContent = '训练中 '+sessionMin(); }
  }, 30000);
}
function stopTick(){ if(session.tick) clearInterval(session.tick); session.tick=null; }

/* ---- 时钟 ---- */
function tickClock(){
  const d = new Date();
  const el = document.getElementById('clock');
  if(el) el.textContent = d.getHours()+':'+pad(d.getMinutes());
}
tickClock(); setInterval(tickClock, 30000);

/* ---- 启动 ---- */
setTab('train');
