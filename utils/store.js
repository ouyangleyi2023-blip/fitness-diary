// 本地数据层（全部存在 wx storage，无需后端）
const U = require('./util.js');
const E = require('./exercises.js');

const KEY = 'fitdb_v1';
const DEFAULT = {
  logs: {},        // { '2026-10-20': { date, exercises:[], duration, note, done } }
  weights: [],     // [{ date, kg }]
  profile: { name: '健身达人', gender: 'male', height: 172, goal: 4, unit: 'kg', start: '' }
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function read() {
  let d = null;
  try { d = wx.getStorageSync(KEY); } catch (e) { d = null; }
  if (!d || typeof d !== 'object' || !d.logs) {
    d = clone(DEFAULT);
    d.profile.start = U.today();
    write(d);
  }
  if (!d.weights) d.weights = [];
  if (!d.profile) d.profile = clone(DEFAULT.profile);
  return d;
}

function write(d) {
  try { wx.setStorageSync(KEY, d); } catch (e) { }
}

function emptyLog(date) {
  return { date: date, exercises: [], duration: 0, note: '', done: false };
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
// 给一条训练记录补充派生数据（容量、组数文案等）
function decorate(log) {
  const exs = (log.exercises || []).map(function (ex) {
    let vol = 0, reps = 0;
    (ex.sets || []).forEach(function (s) {
      const w = U.num(s.w), r = U.num(s.r);
      if (ex.mode === 'weight') vol += w * r;
      reps += r;
    });
    const setsText = (ex.sets || []).map(function (s, i) {
      if (ex.mode === 'weight') return U.num(s.w) + 'kg×' + U.num(s.r);
      if (ex.mode === 'time') return U.num(s.r) + '分钟';
      return U.num(s.r) + '次';
    }).join('  ');
    return {
      id: ex.id, name: ex.name, part: ex.part, mode: ex.mode,
      color: E.partInfo(ex.part).color, partName: E.partInfo(ex.part).name,
      sets: ex.sets, setCount: (ex.sets || []).length,
      volume: Math.round(vol), reps: reps, setsText: setsText || '暂无组数'
    };
  });
  let volume = 0, sets = 0, reps = 0;
  exs.forEach(function (e) { volume += e.volume; sets += e.setCount; reps += e.reps; });
  return {
    date: log.date, done: !!log.done, duration: U.num(log.duration), note: log.note || '',
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

function exportJSON() { return JSON.stringify(read(), null, 2); }

function clearAll() { try { wx.removeStorageSync(KEY); } catch (e) { } }

// 首次使用灌入示例数据（可在「我的」里一键清除）
function seedDemo() {
  const d = read();
  if (Object.keys(d.logs).length) return false;
  const plan = [
    { off: 6, ex: [['杠铃卧推', 'chest', 'weight', 60, 10], ['哑铃飞鸟', 'chest', 'weight', 12, 12], ['绳索下压', 'arm', 'weight', 20, 12]] },
    { off: 5, ex: [['高位下拉', 'back', 'weight', 55, 12], ['坐姿划船', 'back', 'weight', 50, 12], ['杠铃弯举', 'arm', 'weight', 25, 10]] },
    { off: 4, ex: [['杠铃深蹲', 'leg', 'weight', 80, 8], ['腿举', 'leg', 'weight', 120, 12], ['站姿提踵', 'leg', 'weight', 40, 15]] },
    { off: 3, ex: [['哑铃推举', 'shoulder', 'weight', 18, 10], ['哑铃侧平举', 'shoulder', 'weight', 8, 15], ['平板支撑', 'core', 'time', 0, 3]] },
    { off: 2, ex: [['硬拉', 'back', 'weight', 90, 6], ['引体向上', 'back', 'body', 0, 8], ['卷腹', 'core', 'body', 0, 20]] },
    { off: 1, ex: [['跑步', 'cardio', 'time', 0, 30], ['跳绳', 'cardio', 'time', 0, 10]] }
  ];
  plan.forEach(function (p) {
    const date = U.addDays(U.today(), -p.off);
    const log = emptyLog(date);
    log.done = true;
    log.duration = 45 + (p.off % 3) * 10;
    log.exercises = p.ex.map(function (e) {
      const sets = [];
      const cnt = e[2] === 'time' ? 1 : 3;
      for (let i = 0; i < cnt; i++) {
        sets.push({ w: e[3], r: e[2] === 'time' ? e[4] : e[4] - i });
      }
      return { id: U.uid(), name: e[0], part: e[1], mode: e[2], sets: sets };
    });
    d.logs[date] = log;
  });
  const ws = [70.5, 70.2, 70.0, 69.6, 69.8, 69.3];
  ws.forEach(function (kg, i) { d.weights.push({ date: U.addDays(U.today(), -(6 - i)), kg: kg }); });
  write(d);
  return true;
}

module.exports = {
  read, write, emptyLog, getLog, saveLog, removeLog, hasWorkout, allDates,
  decorate, streak, totalDays, rangeStats, partStats, calendar, volumeSeries,
  getWeights, setWeight, weightOf, getProfile, saveProfile, exportJSON, clearAll, seedDemo
};
