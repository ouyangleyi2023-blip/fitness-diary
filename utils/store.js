// 本地数据层（全部存在 wx storage，无需后端）
const U = require('./util.js');
const E = require('./exercises.js');

const KEY = 'fitdb_v2';
const OLD_KEY = 'fitdb_v1';

// 训练目标 / 经验 / 时段的中文文案
const GOALS = { muscle: '增肌', fat: '减脂', strength: '增力', keep: '保持健康' };
const LEVELS = { new: '新手（<1年）', mid: '进阶（1–3年）', adv: '资深（3年+）' };
const SLOTS = { morning: '早晨', noon: '午间', evening: '晚上', night: '深夜' };

function defProfile() {
  return {
    name: '健身达人', gender: 'male', height: 172,
    goal: 'muscle', level: 'mid', unit: 'kg',
    restSec: 90, defSets: 3, weekDays: [1, 3, 5], slot: 'evening', autoFill: true,
    start: ''
  };
}

const DEFAULT = {
  v: 2,
  logs: {},        // { '2026-10-20': { date, tplKey, exercises:[{name,part,mode,sets:[{w,r,ok}]}], duration, note, done } }
  weights: [],     // [{ date, kg }]
  steps: {},       // { '2026-10-20': 8200 }
  templates: {},   // { '1': {name, exs:[{name,part,mode,sets,reps}]} }  key = 星期 0–6
  profile: defProfile()
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

// v1 -> v2 迁移：goal 由数字改为枚举，补齐习惯字段
function migrate(d) {
  if (d.v === 2) return d;
  const p = Object.assign(defProfile(), d.profile || {});
  if (typeof p.goal !== 'string' || !GOALS[p.goal]) p.goal = 'muscle';
  if (!Array.isArray(p.weekDays) || !p.weekDays.length) p.weekDays = [1, 3, 5];
  d.v = 2;
  d.profile = p;
  d.templates = d.templates || {};
  d.steps = d.steps || {};
  return d;
}

function read() {
  let d = null;
  try { d = wx.getStorageSync(KEY); } catch (e) { d = null; }
  if (!d || typeof d !== 'object' || !d.logs) {
    // 尝试读取旧版数据
    let old = null;
    try { old = wx.getStorageSync(OLD_KEY); } catch (e) { old = null; }
    if (old && typeof old === 'object' && old.logs) {
      d = migrate(old);
    } else {
      d = clone(DEFAULT);
      d.profile.start = U.today();
    }
    write(d);
  }
  if (!d.weights) d.weights = [];
  if (!d.steps) d.steps = {};
  if (!d.templates) d.templates = {};
  if (!d.profile) d.profile = defProfile();
  return d;
}

function write(d) {
  try { wx.setStorageSync(KEY, d); } catch (e) { }
}

function emptyLog(date) {
  return { date: date, tplKey: '', startAt: 0, exercises: [], duration: 0, note: '', done: false };
}

function getLog(date) {
  const d = read();
  return d.logs[date] ? clone(d.logs[date]) : emptyLog(date);
}

function saveLog(log) {
  const d = read();
  d.logs[log.date] = log;
  write(d);
}

function removeLog(date) {
  const d = read();
  delete d.logs[date];
  write(d);
}

function hasWorkout(log) { return !!(log && log.exercises && log.exercises.length); }

function allDates() {
  const d = read();
  return Object.keys(d.logs).filter(function (k) { return hasWorkout(d.logs[k]); }).sort();
}

/* ---------- 体重 ---------- */
function getWeights() { return read().weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }

function setWeight(date, kg) {
  const d = read();
  let hit = false;
  for (let i = 0; i < d.weights.length; i++) {
    if (d.weights[i].date === date) { d.weights[i].kg = U.num(kg); hit = true; break; }
  }
  if (!hit) d.weights.push({ date: date, kg: U.num(kg) });
  d.weights.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  write(d);
}

function weightOf(date) {
  const w = getWeights();
  for (let i = 0; i < w.length; i++) if (w[i].date === date) return w[i].kg;
  return null;
}

/* ---------- 档案 ---------- */
function getProfile() { return read().profile; }

function saveProfile(p) {
  const d = read();
  d.profile = Object.assign(d.profile, p);
  write(d);
}

/* ---------- 计算 ---------- */
// 给一条训练记录补充派生数据（容量、最佳重量、e1RM、组数文案）
function decorate(log) {
  const unit = (read().profile.unit || 'kg') === 'lb' ? 'lb' : 'kg';
  const disp = function (w) { return unit === 'lb' ? U.round1(w * 2.20462) : U.round1(w); };
  const u = unit;
  const exs = (log.exercises || []).map(function (ex) {
    let vol = 0, reps = 0, best = 0, bestE = 0;
    (ex.sets || []).forEach(function (s) {
      const w = U.num(s.w), r = U.num(s.r);
      if (ex.mode === 'weight') {
        vol += w * r;
        if (w > best) best = w;
        const e = e1rm(w, r);
        if (e > bestE) bestE = e;
      }
      reps += r;
    });
    const setsText = (ex.sets || []).map(function (s) {
      if (ex.mode === 'weight') return disp(U.num(s.w)) + u + '×' + U.num(s.r);
      if (ex.mode === 'time') return U.num(s.r) + '分钟';
      return U.num(s.r) + '次';
    }).join('  ');
    return {
      id: ex.id, name: ex.name, part: ex.part, mode: ex.mode,
      color: E.partInfo(ex.part).color, partName: E.partInfo(ex.part).name,
      sets: ex.sets, setCount: (ex.sets || []).length,
      volume: Math.round(vol), reps: reps,
      best: U.round1(best), e1rm: U.round1(bestE),
      setsText: setsText || '暂无组数'
    };
  });
  let volume = 0, sets = 0, reps = 0;
  exs.forEach(function (e) { volume += e.volume; sets += e.setCount; reps += e.reps; });
  return {
    date: log.date, tplKey: log.tplKey || '', done: !!log.done,
    duration: U.num(log.duration), note: log.note || '', startAt: log.startAt || 0,
    exercises: exs, volume: volume, sets: sets, reps: reps
  };
}

// 连续打卡天数
function streak() {
  const d = read();
  let cur = U.today();
  if (!hasWorkout(d.logs[cur])) cur = U.addDays(cur, -1);
  let n = 0;
  while (hasWorkout(d.logs[cur])) { n++; cur = U.addDays(cur, -1); }
  return n;
}

function totalDays() { return allDates().length; }

// 区间统计
function rangeStats(dates) {
  const d = read();
  let days = 0, volume = 0, sets = 0, reps = 0, duration = 0;
  dates.forEach(function (dt) {
    const log = d.logs[dt];
    if (!hasWorkout(log)) return;
    const dec = decorate(log);
    days++; volume += dec.volume; sets += dec.sets; reps += dec.reps; duration += dec.duration;
  });
  return {
    days: days, volume: volume, sets: sets, reps: reps, duration: duration,
    avgDuration: days ? Math.round(duration / days) : 0
  };
}

// 部位分布（组数）
function partStats(dates) {
  const d = read();
  const map = {};
  dates.forEach(function (dt) {
    const log = d.logs[dt];
    if (!hasWorkout(log)) return;
    log.exercises.forEach(function (ex) {
      map[ex.part] = (map[ex.part] || 0) + (ex.sets || []).length;
    });
  });
  const arr = [];
  Object.keys(map).forEach(function (k) {
    arr.push({ key: k, name: E.partInfo(k).name, color: E.partInfo(k).color, sets: map[k] });
  });
  arr.sort(function (a, b) { return b.sets - a.sets; });
  const max = arr.length ? arr[0].sets : 1;
  arr.forEach(function (a) { a.pct = Math.round(a.sets / max * 100); });
  return arr;
}

// 某月日历（含前后补位）
function calendar(ym) {
  const d = read();
  const first = ym + '-01';
  const total = U.daysInMonth(ym);
  const lead = (U.parse(first).getDay() + 6) % 7; // 周一为首列
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ empty: true });
  let maxVol = 1;
  for (let day = 1; day <= total; day++) {
    const date = ym + '-' + U.pad(day);
    const log = d.logs[date];
    const vol = hasWorkout(log) ? decorate(log).volume : 0;
    if (vol > maxVol) maxVol = vol;
    cells.push({ date: date, day: day, volume: vol, done: hasWorkout(log), empty: false });
  }
  cells.forEach(function (c) {
    if (c.empty) return;
    c.level = !c.done ? 0 : (c.volume / maxVol > 0.66 ? 3 : (c.volume / maxVol > 0.33 ? 2 : 1));
  });
  return cells;
}

// 最近 n 天容量序列（用于柱状图）
function volumeSeries(dates) {
  const d = read();
  return dates.map(function (dt) {
    const log = d.logs[dt];
    const dec = hasWorkout(log) ? decorate(log) : { volume: 0 };
    return { date: dt, label: (+dt.split('-')[2]), volume: dec.volume, done: hasWorkout(log) };
  });
}

/* ---------- 力量指标 ---------- */
// Epley 公式估算 1RM：w × (1 + r/30)，1RM 以上直接取当次重量
function e1rm(w, r) {
  w = U.num(w); r = U.num(r);
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}

// 某动作在 before 之前最近一次的表现（用于自动带入）
function lastPerf(name, before) {
  const ds = allDates().filter(function (d) { return !before || d < before; });
  for (let i = ds.length - 1; i >= 0; i--) {
    const ex = (read().logs[ds[i]].exercises || []).filter(function (e) { return e.name === name; })[0];
    if (ex && ex.sets && ex.sets.length) {
      return {
        date: ds[i],
        sets: ex.sets.map(function (s) { return { w: s.w, r: s.r }; }),
        mode: ex.mode
      };
    }
  }
  return null;
}

// 历史最佳：e1RM / 最重重量 / 练过次数
function bestOf(name) {
  let e = 0, w = 0, n = 0;
  allDates().forEach(function (dt) {
    (read().logs[dt].exercises || []).forEach(function (ex) {
      if (ex.name !== name || ex.mode !== 'weight') return;
      n++;
      (ex.sets || []).forEach(function (s) {
        const v = e1rm(s.w, s.r);
        if (v > e) e = v;
        if (U.num(s.w) > w) w = U.num(s.w);
      });
    });
  });
  return { e1rm: e, maxW: w, times: n };
}

// PR 榜：按最佳 e1RM 降序
function prBoard(limit) {
  const map = {};
  allDates().forEach(function (dt) {
    (read().logs[dt].exercises || []).forEach(function (ex) {
      if (ex.mode !== 'weight') return;
      const cur = map[ex.name] || { name: ex.name, part: ex.part, e: 0, w: 0, date: dt };
      (ex.sets || []).forEach(function (s) {
        const v = e1rm(s.w, s.r);
        if (v > cur.e) { cur.e = v; cur.date = dt; }
        if (U.num(s.w) > cur.w) cur.w = U.num(s.w);
      });
      map[ex.name] = cur;
    });
  });
  return Object.keys(map)
    .map(function (k) { return map[k]; })
    .filter(function (x) { return x.e > 0; })
    .sort(function (a, b) { return b.e - a.e; })
    .slice(0, limit || 8)
    .map(function (x) {
      return {
        name: x.name, part: x.part, e: x.e, w: x.w, date: x.date,
        color: E.partInfo(x.part).color, partName: E.partInfo(x.part).name
      };
    });
}

// 常用动作排行（按累计组数）
function freqRank(limit) {
  const map = {};
  allDates().forEach(function (dt) {
    (read().logs[dt].exercises || []).forEach(function (ex) {
      map[ex.name] = (map[ex.name] || 0) + (ex.sets || []).length;
    });
  });
  return Object.keys(map)
    .map(function (n) {
      const L = E.find(n);
      return { name: n, count: map[n], part: L ? L.p : 'core', mode: L ? L.m : 'weight', color: E.partInfo(L ? L.p : 'core').color };
    })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, limit || 10);
}

/* ---------- 训练模板 ---------- */
function getTemplates() { return read().templates; }

function getTemplate(wd) { return read().templates[String(wd)] || null; }

function saveTemplate(wd, tpl) {
  const d = read();
  d.templates[String(wd)] = tpl;
  write(d);
}

function removeTemplate(wd) {
  const d = read();
  delete d.templates[String(wd)];
  write(d);
}

// 按模板 + 上次成绩生成当天的训练清单；已有动作则不覆盖
function applyTemplate(date) {
  const wd = U.dow(date);
  const tpl = read().templates[String(wd)];
  if (!tpl || !tpl.exs || !tpl.exs.length) return 0;
  const log = getLog(date);
  if (log.exercises.length) return 0;
  const p = read().profile;
  log.tplKey = String(wd);
  log.exercises = tpl.exs.map(function (e) {
    const last = p.autoFill ? lastPerf(e.name, date) : null;
    const cnt = e.sets || p.defSets || 3;
    const sets = [];
    for (let i = 0; i < cnt; i++) {
      if (last && last.sets[i]) sets.push({ id: U.uid(), w: last.sets[i].w, r: last.sets[i].r, ok: false });
      else if (last) {
        const t = last.sets[last.sets.length - 1];
        sets.push({ id: U.uid(), w: t.w, r: t.r, ok: false });
      } else {
        sets.push({ id: U.uid(), w: '', r: e.mode === 'time' ? e.reps : '', ok: false });
      }
    }
    return { id: U.uid(), name: e.name, part: e.part, mode: e.mode, sets: sets };
  });
  saveLog(log);
  return log.exercises.length;
}

/* ---------- 步数 ---------- */
function getSteps(date) { return U.num(read().steps[date]); }

function setSteps(date, n) {
  const d = read();
  d.steps[date] = U.num(n);
  write(d);
}

function rangeSteps(dates) {
  const d = read();
  let sum = 0, has = 0;
  dates.forEach(function (dt) {
    const v = U.num(d.steps[dt]);
    if (v > 0) { sum += v; has++; }
  });
  return { sum: sum, days: has, avg: has ? Math.round(sum / has) : 0 };
}

function exportJSON() { return JSON.stringify(read(), null, 2); }

function clearAll() { try { wx.removeStorageSync(KEY); } catch (e) { } }

// 首次使用灌入示例数据：围绕「今天」排布 6 周渐进轨迹，保证首屏即可练
function seedDemo() {
  const d = read();
  if (Object.keys(d.logs).length) return false;
  const t = U.dow(U.today());
  const keys = ['pull', 'push', 'legs'];
  const days = [(t + 6) % 7, t, (t + 2) % 7].sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
  d.profile.weekDays = days;
  d.templates = {};
  const plan = {};
  days.forEach(function (w, i) { d.templates[w] = E.buildTpl(keys[i]); plan[w] = keys[i]; });

  const baseW = { '杠铃卧推': 52, '上斜哑铃卧推': 20, '哑铃侧平举': 6, '绳索下压': 18, '引体向上': 0, '杠铃划船': 45, '坐姿划船': 42, '杠铃弯举': 20, '杠铃深蹲': 65, '罗马尼亚硬拉': 50, '腿举': 100, '站姿提踵': 35 };
  const incW = { '杠铃卧推': 1.6, '上斜哑铃卧推': 0.7, '哑铃侧平举': 0.3, '绳索下压': 0.6, '引体向上': 0, '杠铃划船': 1.3, '坐姿划船': 1.2, '杠铃弯举': 0.7, '杠铃深蹲': 2.2, '罗马尼亚硬拉': 1.5, '腿举': 3.0, '站姿提踵': 1.0 };
  const TOTAL_W = 6;
  for (let off = 41; off >= 1; off--) {
    const date = U.addDays(U.today(), -off);
    const key = plan[U.dow(date)];
    if (!key) continue;
    if (off === 17 || off === 9) continue;             // 偶尔缺席，日历更真实
    const wi = TOTAL_W - Math.floor(off / 7);
    const tpl = E.PRESET_TPL[key];
    const log = emptyLog(date);
    log.tplKey = key;
    log.done = true;
    log.duration = 48 + (off % 4) * 6;
    log.exercises = tpl.exs.map(function (e) {
      const L = E.find(e[0]) || { p: 'core', m: 'weight' };
      const isTime = L.m === 'time';
      const sets = [];
      let w = (baseW[e[0]] || 0) + (incW[e[0]] || 0) * wi;
      if (L.m === 'weight') w = Math.round(w * 2) / 2;
      for (let s = 0; s < e[1]; s++) {
        const r = Math.max(1, e[2] - s + (s === 0 ? 1 : 0));
        sets.push({ id: U.uid(), w: isTime ? 0 : (L.m === 'weight' ? w : 0), r: isTime ? e[2] : r, ok: true });
      }
      return { id: U.uid(), name: e[0], part: L.p, mode: L.m, sets: sets };
    });
    d.logs[date] = log;
  }
  let kg = 71.4;
  for (let off = 41; off >= 0; off -= 2) {
    kg = U.round1(kg - 0.16 + (off % 6 === 0 ? 0.22 : -0.05));
    d.weights.push({ date: U.addDays(U.today(), -off), kg: kg });
  }
  U.lastDays(7).forEach(function (dt) {
    d.steps[dt] = 6200 + ((dt.charCodeAt(8) * 137) % 4800);
  });
  write(d);
  return true;
}

module.exports = {
  read, write, emptyLog, getLog, saveLog, removeLog, hasWorkout, allDates,
  decorate, streak, totalDays, rangeStats, partStats, calendar, volumeSeries,
  getWeights, setWeight, weightOf, getProfile, saveProfile, exportJSON, clearAll,
  e1rm, lastPerf, bestOf, prBoard, freqRank,
  getTemplates, getTemplate, saveTemplate, removeTemplate, applyTemplate,
  getSteps, setSteps, rangeSteps, seedDemo,
  GOALS, LEVELS, SLOTS
};
