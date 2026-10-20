/**
 * 冒烟测试：用最小 DOM / 存储桩加载 src/app.js，验证数据层与所有页面渲染。
 * 运行：node preview/test/smoke.js
 */
const fs = require('fs');
const path = require('path');

/* ---------- DOM / 存储桩 ---------- */
const mem = new Map();
global.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
function El(id) {
  return {
    id, textContent: '', innerHTML: '', value: '', scrollTop: 0, style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, remove() {}, focus() {}, click() {},
    insertAdjacentHTML() {}, getAttribute() { return null; }, setAttribute() {},
    appendChild() {}, parentElement: null
  };
}
const els = {};
const doc = {
  getElementById(id) { if (!els[id]) els[id] = El(id); return els[id]; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(t) { return El(t); },
  addEventListener() {}
};
global.document = doc;
['screen', 'tabbar', 'navTitle', 'navLeft', 'navRight', 'toast', 'clock'].forEach(id => {
  doc.getElementById(id).parentElement = doc.getElementById('phone');
});
global.window = global;

const APP = path.join(__dirname, '..', 'src', 'app.js');
let src = fs.readFileSync(APP, 'utf8');

src += `
/* ================= 断言 ================= */
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fail++; };

console.log('\\n[1] 数据种子');
ok(totalDays() >= 15, '示例训练天数 = ' + totalDays());
ok(getWeights().length >= 15, '体重记录 = ' + getWeights().length);
ok(Object.keys(DB.templates).length === 3, '训练日模板 = ' + Object.keys(DB.templates).length + ' 天');

console.log('\\n[2] 上次成绩 / 最佳 / PR');
const lp = lastPerf('杠铃卧推', today());
ok(!!lp, '杠铃卧推上次 @' + lp.date + ' 首组 ' + lp.sets[0].w + 'kg×' + lp.sets[0].r);
const bo = bestOf('杠铃卧推');
ok(bo.e1rm > 0 && bo.maxW > 0, '最佳 e1RM=' + bo.e1rm + ' 最重=' + bo.maxW + ' 练过 ' + bo.times + ' 次');
const board = prBoard(6);
ok(board.length > 0 && board[0].e > 0, 'PR 榜 top1 = ' + board[0].name + ' ' + board[0].e + 'kg（' + board[0].partName + '）');
ok(board.every((x, i, a) => i === 0 || a[i - 1].e >= x.e), 'PR 榜按 e1RM 降序');
const fr = freqRank(5);
ok(fr.length > 0 && fr[0].count >= fr[1].count, '常用动作 top1 = ' + fr[0].name + ' ' + fr[0].count + ' 组');

console.log('\\n[3] 容量 / 统计 / 日历');
const m30 = rangeStats(lastDays(30));
ok(m30.days > 0 && m30.volume > 0, '近30天：' + m30.days + '天 / ' + m30.volume + 'kg / ' + m30.sets + '组');
const ps = partStats(lastDays(30));
ok(ps.length >= 3 && ps[0].pct === 100, '部位分布 ' + ps.map(p => p.name + p.sets).join(','));
const cal = calendar(monthKey(today()));
ok(cal.length >= 28 && cal.some(c => !c.pad && c.level > 0), '日历格子=' + cal.length + ' 有训练=' + cal.filter(c => !c.pad && c.done).length);
ok(volumeSeries(lastDays(7)).length === 7, '容量序列长度=7');

console.log('\\n[4] 自动带入（核心）');
const wdToday = dow(today());
ok((DB.profile.weekDays || []).indexOf(wdToday) >= 0, '示例计划把今天设为训练日（' + WEEK_CN[wdToday] + '）');
ok(streak() >= 1, '昨天已练 -> 连续天数 = ' + streak());
const tplToday = DB.templates[wdToday];
ok(!!tplToday && tplToday.exs.length > 0, '今日模板 = ' + tplToday.name + '（' + tplToday.exs.length + ' 个动作）');
ok(hasW(DB.logs[today()]), '启动时已自动套用今日计划（首屏即就绪）');
delete DB.logs[today()];                       // 清掉后重新验证一次完整流程
const nAuto = applyTemplate(today());
ok(nAuto === tplToday.exs.length, '套用模板 -> ' + nAuto + ' 个动作');
const auto = getLog(today());
const filled = auto.exercises.filter(e => e.sets.some(s => s.w !== '' && s.r !== '')).length;
ok(filled === auto.exercises.length, '自动填入上次成绩 ' + filled + '/' + auto.exercises.length);
ok(auto.exercises[0].sets[0].w !== '', '首组自动带入 = ' + auto.exercises[0].name + ' ' + auto.exercises[0].sets[0].w + 'kg×' + auto.exercises[0].sets[0].r);
ok(applyTemplate(today()) === 0, '已有内容时重复套用不会覆盖');

console.log('\\n[5] 添加动作 / 组操作');
const before = getLog(today()).exercises.length;
addExercise('杠铃深蹲');
ok(getLog(today()).exercises.length === before + 1, '添加动作生效');
const ex0 = getLog(today()).exercises.find(e => e.name === '杠铃深蹲');
ok(ex0 && ex0.sets.length === DB.profile.defSets, '默认组数 = ' + ex0.sets.length);
ok(ex0 && ex0.sets[0].w !== '', '自动带入上次 = ' + ex0.sets[0].w + 'kg×' + ex0.sets[0].r);

console.log('\\n[6] 单位换算 / e1RM');
DB.profile.unit = 'lb';
ok(Math.abs(toDisplay(100) - 220.5) < 0.2, '100kg -> ' + toDisplay(100) + 'lb');
DB.profile.unit = 'kg';
ok(toDisplay(100) === 100, '切回 kg -> ' + toDisplay(100));
ok(Math.abs(e1rm(100, 5) - 116.7) < 0.2, '100kg×5 -> e1RM ' + e1rm(100, 5));
ok(e1rm(0, 5) === 0 && e1rm(100, 0) === 0, '无效输入返回 0');

console.log('\\n[7] 页面渲染');
['train', 'plan', 'stats', 'mine'].forEach(p => {
  page = p; render();
  ok(document.getElementById('screen').innerHTML.length > 200, 'render ' + p + ' -> ' + document.getElementById('screen').innerHTML.length + ' 字符');
});
SUB = { w: DB.profile.weekDays[0] }; page = 'tplEdit'; render();
ok(document.getElementById('screen').innerHTML.length > 200, 'render tplEdit');
page = 'weight'; render();
ok(document.getElementById('screen').innerHTML.length > 200, 'render weight');
SUB = { date: addDays(today(), -3) }; page = 'day'; render();
ok(document.getElementById('screen').innerHTML.length > 100, 'render day');
T.picker = true; page = 'train'; render();
ok(document.getElementById('screen').innerHTML.length > 200, 'render 动作选择弹层');
T.picker = false; SUB.profile = true; render();
ok(document.getElementById('screen').innerHTML.length > 100, 'render 档案弹层');
SUB.profile = false; SUB.setsEditor = true; SUB.i = 0; render();
ok(document.getElementById('screen').innerHTML.length > 100, 'render 组数编辑弹层');
SUB.setsEditor = false; REST = { left: 90 }; render();
ok(document.getElementById('screen').innerHTML.length > 200, 'render 休息浮层');
REST = null;
['week', 'month', 'all'].forEach(r => { RANGE = r; page = 'stats'; render(); });
ok(true, '三种统计区间渲染通过');

console.log('\\n[8] 持久化与迁移');
const raw = localStorage.getItem('fitdb_v2');
ok(!!raw && JSON.parse(raw).v === 2, '写入 localStorage，版本 v2');
const v1 = { logs: { '2026-01-01': { date: '2026-01-01', exercises: [{ id: 'a', name: '杠铃深蹲', part: 'leg', mode: 'weight', sets: [{ w: 100, r: 5 }] }] } }, weights: [{ date: '2026-01-01', kg: 70 }], profile: { name: '老用户', goal: 4 } };
const m = migrate(JSON.parse(JSON.stringify(v1)));
ok(m.v === 2 && m.profile.goal === 'muscle' && Array.isArray(m.profile.weekDays), 'v1 -> v2：goal 归一化并补全字段');

console.log('\\n' + (fail ? 'FAIL ' + fail + ' 项' : 'ALL PASS'));
process.exit(fail ? 1 : 0);
`;
eval(src);
