// 通用工具：日期 / 格式化
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function fmt(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function today() { return fmt(new Date()); }

function parse(s) {
  const p = String(s).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function weekday(s) { return WEEK_CN[parse(s).getDay()]; }

// 星期序号 0–6（周日=0），用于把训练模板绑定到具体某天
function dow(s) { return parse(s).getDay(); }

function dateText(s) {
  const p = s.split('-');
  return (+p[1]) + '月' + (+p[2]) + '日';
}

function dateTextFull(s) { return dateText(s) + ' ' + weekday(s); }

function isToday(s) { return s === today(); }

function monthKey(s) { return s.slice(0, 7); }

function daysInMonth(ym) {
  const p = ym.split('-');
  return new Date(+p[0], +p[1], 0).getDate();
}

// 本周（周一为起点）日期数组
function weekDates(base) {
  const d = parse(base || today());
  const wd = (d.getDay() + 6) % 7; // 周一=0
  const start = addDays(fmt(d), -wd);
  const arr = [];
  for (let i = 0; i < 7; i++) arr.push(addDays(start, i));
  return arr;
}

// 近 n 天日期数组（含今天）
function lastDays(n, base) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) arr.push(addDays(base || today(), -i));
  return arr;
}

function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function round1(n) { return Math.round(n * 10) / 10; }

function num(n) {
  n = parseFloat(n);
  return isNaN(n) ? 0 : n;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 11) return '早上好';
  if (h < 14) return '午间好';
  if (h < 18) return '下午好';
  if (h < 23) return '晚上好';
  return '夜深了';
}

module.exports = {
  WEEK_CN, pad, fmt, today, parse, addDays, weekday, dow, dateText, dateTextFull,
  isToday, monthKey, daysInMonth, weekDates, lastDays, uid, round1, num, greeting
};
