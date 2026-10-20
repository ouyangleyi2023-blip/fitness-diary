# 每日健身 · 健身记录小程序

一个只做一件事的小程序：把每一天的训练记下来。纯本地存储，打开即用，不需要登录和后端。

## 功能

| 模块 | 内容 |
| --- | --- |
| 今日 | 日期问候、连续打卡天数、今日训练概览、一键打卡 / 取消、本周目标进度、近 7 天训练柱状图、今日体重快速记录 |
| 训练 | 按天记录；内置 50+ 动作库（胸/背/腿/肩/手臂/核心/有氧）；逐组记录重量×次数；支持自定义动作、往日补录、时长与备注 |
| 统计 | 本周 / 本月 / 全部三档；训练次数、总容量、总组数、总时长；容量柱状图；部位分布（按组数）；月度训练日历热力图 |
| 我的 | 昵称 / 身高 / 性别、每周训练目标（2–7 次）、体重趋势入口、数据导出、示例数据、清空数据 |
| 体重 | SVG / Canvas 折线趋势、最低 / 最高 / 平均、近 7 天变化、历史增删 |

## 运行

1. 打开「微信开发者工具」→ 导入项目
2. 目录选择 `fitness-miniapp/`，AppID 可选「测试号」
3. 直接编译预览

`preview/index.html` 是网页版交互预览（数据存浏览器 localStorage，刷新不丢），双击即可在浏览器打开，无需起服务。

## 目录结构

```
fitness-miniapp/
├── app.js / app.json / app.wxss      全局配置与主题变量
├── utils/
│   ├── util.js                       日期、格式化、问候语
│   ├── exercises.js                  部位与动作库（50+）
│   └── store.js                      本地数据层：读写、统计、日历、示例数据
├── pages/
│   ├── index/   今日                  打卡、概览、周目标、体重快记
│   ├── train/   训练记录              动作与组数编辑（tabBar）
│   ├── stats/   数据统计              容量、部位、日历热力（tabBar）
│   ├── mine/    我的                  设置与数据管理（tabBar）
│   └── body/    体重记录              折线趋势（canvas 2d）
├── assets/tab/                       tabBar 图标（tools_gen_icons.py 生成）
└── preview/index.html                网页版可交互预览
```

## 数据结构

```
{
  logs: {
    "2026-10-20": {
      date, done, duration, note,
      exercises: [{ id, name, part, mode, sets: [{ w, r }] }]
    }
  },
  weights: [{ date, kg }],
  profile: { name, gender, height, goal, unit, start }
}
```

- `mode`：`weight` 负重（重量 kg × 次数）/ `body` 自重（次数）/ `time` 计时（分钟）
- 训练容量 = Σ 重量 × 次数（仅统计负重动作）
- 全部数据存在 `wx.setStorageSync('fitdb_v1')`，「我的」页可导出 JSON 或一键清空

## 说明

- 首次启动会自动写入最近一周的示例数据，方便查看效果；「我的 → 清空全部数据」即可从零开始
- 图标由 `tools_gen_icons.py` 用 Python 标准库生成，无需安装依赖，可自行改色重跑
