// 动作库：部位 + 动作（mode: weight 负重 / body 自重 / time 计时）
const PARTS = [
  { key: 'chest', name: '胸', color: '#FF6B35' },
  { key: 'back', name: '背', color: '#5B9CFF' },
  { key: 'leg', name: '腿', color: '#2DD4A7' },
  { key: 'shoulder', name: '肩', color: '#FFB020' },
  { key: 'arm', name: '手臂', color: '#A78BFA' },
  { key: 'core', name: '核心', color: '#FF7BA9' },
  { key: 'cardio', name: '有氧', color: '#38BDF8' }
];

const LIST = [
  // 胸
  { n: '杠铃卧推', p: 'chest', m: 'weight' },
  { n: '哑铃卧推', p: 'chest', m: 'weight' },
  { n: '上斜哑铃卧推', p: 'chest', m: 'weight' },
  { n: '器械推胸', p: 'chest', m: 'weight' },
  { n: '哑铃飞鸟', p: 'chest', m: 'weight' },
  { n: '龙门架夹胸', p: 'chest', m: 'weight' },
  { n: '双杠臂屈伸', p: 'chest', m: 'body' },
  { n: '俯卧撑', p: 'chest', m: 'body' },
  // 背
  { n: '引体向上', p: 'back', m: 'body' },
  { n: '高位下拉', p: 'back', m: 'weight' },
  { n: '坐姿划船', p: 'back', m: 'weight' },
  { n: '杠铃划船', p: 'back', m: 'weight' },
  { n: '单臂哑铃划船', p: 'back', m: 'weight' },
  { n: '硬拉', p: 'back', m: 'weight' },
  { n: '直臂下压', p: 'back', m: 'weight' },
  { n: '山羊挺身', p: 'back', m: 'body' },
  // 腿
  { n: '杠铃深蹲', p: 'leg', m: 'weight' },
  { n: '腿举', p: 'leg', m: 'weight' },
  { n: '哈克深蹲', p: 'leg', m: 'weight' },
  { n: '罗马尼亚硬拉', p: 'leg', m: 'weight' },
  { n: '保加利亚分腿蹲', p: 'leg', m: 'weight' },
  { n: '箭步蹲', p: 'leg', m: 'weight' },
  { n: '坐姿腿屈伸', p: 'leg', m: 'weight' },
  { n: '俯卧腿弯举', p: 'leg', m: 'weight' },
  { n: '站姿提踵', p: 'leg', m: 'weight' },
  { n: '臀桥', p: 'leg', m: 'weight' },
  { n: '深蹲跳', p: 'leg', m: 'body' },
  // 肩
  { n: '杠铃推举', p: 'shoulder', m: 'weight' },
  { n: '哑铃推举', p: 'shoulder', m: 'weight' },
  { n: '哑铃侧平举', p: 'shoulder', m: 'weight' },
  { n: '哑铃前平举', p: 'shoulder', m: 'weight' },
  { n: '俯身飞鸟', p: 'shoulder', m: 'weight' },
  { n: '绳索面拉', p: 'shoulder', m: 'weight' },
  { n: '直立划船', p: 'shoulder', m: 'weight' },
  // 手臂
  { n: '杠铃弯举', p: 'arm', m: 'weight' },
  { n: '哑铃弯举', p: 'arm', m: 'weight' },
  { n: '锤式弯举', p: 'arm', m: 'weight' },
  { n: '绳索下压', p: 'arm', m: 'weight' },
  { n: '仰卧臂屈伸', p: 'arm', m: 'weight' },
  { n: '窄距俯卧撑', p: 'arm', m: 'body' },
  { n: '腕弯举', p: 'arm', m: 'weight' },
  // 核心
  { n: '平板支撑', p: 'core', m: 'time' },
  { n: '卷腹', p: 'core', m: 'body' },
  { n: '悬垂举腿', p: 'core', m: 'body' },
  { n: '俄罗斯转体', p: 'core', m: 'body' },
  { n: '登山跑', p: 'core', m: 'time' },
  { n: '侧平板', p: 'core', m: 'time' },
  // 有氧
  { n: '跑步', p: 'cardio', m: 'time' },
  { n: '快走', p: 'cardio', m: 'time' },
  { n: '骑行', p: 'cardio', m: 'time' },
  { n: '游泳', p: 'cardio', m: 'time' },
  { n: '跳绳', p: 'cardio', m: 'time' },
  { n: '划船机', p: 'cardio', m: 'time' },
  { n: '椭圆机', p: 'cardio', m: 'time' },
  { n: '爬楼机', p: 'cardio', m: 'time' },
  { n: 'HIIT', p: 'cardio', m: 'time' }
];

const MODE_TEXT = { weight: '负重', body: '自重', time: '计时' };
const UNIT_W = { weight: 'kg', body: '次', time: '分钟' };

function partInfo(key) {
  for (let i = 0; i < PARTS.length; i++) if (PARTS[i].key === key) return PARTS[i];
  return { key: key, name: '其他', color: '#8A8F98' };
}

// 常见训练分化模板：一键套用到某个训练日
const PRESET_TPL = {
  push:  { name: '推 · 胸肩三头', exs: [['杠铃卧推', 3, 8], ['上斜哑铃卧推', 3, 10], ['哑铃侧平举', 3, 15], ['绳索下压', 3, 12]] },
  pull:  { name: '拉 · 背二头', exs: [['引体向上', 3, 8], ['杠铃划船', 3, 10], ['坐姿划船', 3, 12], ['杠铃弯举', 3, 10]] },
  legs:  { name: '腿 · 股四头臀', exs: [['杠铃深蹲', 4, 8], ['罗马尼亚硬拉', 3, 10], ['腿举', 3, 12], ['站姿提踵', 3, 15]] },
  upper: { name: '上肢 · 胸背肩臂', exs: [['杠铃卧推', 3, 8], ['高位下拉', 3, 10], ['杠铃推举', 3, 10], ['哑铃弯举', 3, 12]] },
  lower: { name: '下肢 · 腿臀核心', exs: [['杠铃深蹲', 4, 8], ['保加利亚分腿蹲', 3, 10], ['俯卧腿弯举', 3, 12], ['卷腹', 3, 20]] },
  full:  { name: '全身 · 复合为主', exs: [['杠铃深蹲', 3, 8], ['杠铃卧推', 3, 8], ['杠铃划船', 3, 10], ['平板支撑', 3, 1]] },
  core:  { name: '核心 + 有氧', exs: [['平板支撑', 3, 1], ['悬垂举腿', 3, 12], ['俄罗斯转体', 3, 20], ['跑步', 1, 25]] }
};

function find(name) {
  for (let i = 0; i < LIST.length; i++) if (LIST[i].n === name) return LIST[i];
  return null;
}

// 生成模板对象 {name, exs:[{name, part, mode, sets, reps}]}
function buildTpl(key) {
  const p = PRESET_TPL[key];
  if (!p) return { name: '', exs: [] };
  const exs = p.exs.map(function (e) {
    const L = find(e[0]) || { p: 'core', m: 'weight' };
    return { name: e[0], part: L.p, mode: L.m, sets: e[1], reps: e[2] };
  });
  return { name: p.name, exs: exs };
}

function search(kw, part) {
  const k = (kw || '').trim().toLowerCase();
  return LIST.filter(function (e) {
    const okPart = !part || e.p === part;
    const okKw = !k || e.n.toLowerCase().indexOf(k) >= 0;
    return okPart && okKw;
  }).map(function (e) {
    return { name: e.n, part: e.p, mode: e.m };
  });
}

module.exports = { PARTS, LIST, MODE_TEXT, UNIT_W, partInfo, search, PRESET_TPL, buildTpl, find };
