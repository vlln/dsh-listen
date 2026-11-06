---
title: 打包成可安装插件与 README 结果化
description: 版本化 bundle、安装默认值修复、真实安装冒烟与负控、README 重写并收录评测结论。
type: report
status: complete
created: 2026-11-06T05:00:00Z
---

# 0036 可安装插件与 README

用户要求：把插件收缩成方便安装的 dsh 插件（参考 make-dsh-plugin），并把实验结果整理进 README。分支 `feat/0036-installable-plugin`，未推送、未合并 main、未发布到 npm/GitHub。

## 结论先说

安装冒烟发现并修掉了一个致命默认值：**按包自带默认组合层安装后，`listen` 的每次 `path` 调用都返回 `UNSUPPORTED_EXECUTION_WORLD`**——插件装上了、工具出现在模型工具表里，但一次也用不了。原因是 `localExecution` 在 Config 与 bundle patch 里都是 `false`，而历史评测批次都由评测配置显式覆盖成 `true`，所以这个坑一直没暴露。

## 改动

| 文件 | 改动 |
|---|---|
| `package.json` | 版本 `0.0.0-dev`→`0.1.0`；`engines.dsh: ^0.2.1-rc.5`；description 改成“是什么+拿到什么”；加 `keywords` |
| `cordis.patch.yml` | `localExecution: true` 并注释说明这是部署确认；手写 insert 用沙箱/远程文件系统时仍应设回 `false` |
| `src/index.mjs` | 只改该字段的说明文字，默认值保持 `false`（手写 insert 仍保守） |
| `scripts/gates.mjs` + `check.mjs` | 新增 `checkBundle` 门禁：bundle patch 存在且 `name` 匹配包名、`files` 白名单含 `src`/patch/图标/locale、`exports` 有 `./package.json` 与 `./locale/*.json`、`engines.dsh` 存在、图标在包内且 ≤256 KiB 且 SVG 自包含；`npm run check` 现在会跑它 |
| `test/infra/gates.test.mjs` | 4 条负控：缺 patch、`files` 缺项、缺 package 导出、缺 `engines.dsh`，以及真实 manifest 通过 |
| `README.md` | 按使用者的读法重写：30 秒安装、装好怎么确认、为什么需要它、用法、能力表、**实测结果**、配置、限制、安全与数据、插件管理、兼容性 |

## 安装冒烟（真实产物）

脚本 `.work/0036/smoke.mjs`：新建隔离 `DSH_HOME` → 真实 `dsh plugin --profile headless add <tarball>` → 两次真实 headless 会话（本地 fixture transport 发出 `listen`）：

- **stock**：只有包自带组合层，即普通用户安装后的状态；
- **preset**：仓库自带的评测 preset（评测批次用的装配，显式传 `localExecution`）。

| 批次 | 包 | stock 会话 | preset 会话 |
|---|---|---|---|
| 改前 | `0.0.0-dev`（45107 字节） | **失败** `UNSUPPORTED_EXECUTION_WORLD` | 成功 |
| 改后 | `0.1.0`（46327 字节） | 成功，`signal_image`+`levels` 有值 | 成功 |

最终产物复测（`report-final.json`）：安装退出 0、已安装 `src` 与 checkout 逐文件哈希一致、两次会话的 `listen` 都是 `completed` 且返回 `status: complete`。

改前那次失败正是本次的**负控**：默认值错时错误是响亮的（工具返回明确错误码），不是静默返回空证据。

另做一次结构负控（`.work/0036/negative.mjs`）：装好后把已安装入口的 `inject` 去掉 `fs`，宿主报

```
dsh: warning: 1 entry did not activate
dsh-listen (dsh-listen): Error: cannot get property "fs" without inject
```

说明“装上了没报错”不等于可用，必须真调一次。

## 图标（机械验证 + 视觉）

- 机械：通过运行时自己的 `readPluginMeta("dsh-listen", profileURL)` 解析安装后的包，得到 `title: {en:"Audio evidence", zh:"音频证据"}`、描述、`data:image/svg+xml;base64` 图标；解码后与仓库 `icon.svg` 逐字节一致；374 字节，在 256 KiB 内，`files` 与 `exports` 都包含。
- 视觉：把该 SVG 渲染成位图查看，图形是 5 根圆头竖条、蓝→青渐变的波形，36×36 透明画布、主体在 8..28，与官方图标的极简风格一致，无裁切或过细笔画。
- **Plugins 页面里的实际展示仍待用户看一眼**（见下），我不把“解析成功”写成“页面视觉通过”。

## 隔离验收站

持久私有 home `.work/station-0036/home`（web profile 已装最终 0.1.0 产物）、工作区 `.work/station-0036/workspace`、固定端口 **3187**（不碰 3080 主 GUI）。2026-11-06 启动的 URL 为 `http://127.0.0.1:3187/?token=iaIGIXY5QPuXr1qUrT1irNEUfKS4LCdqTPIbLYGVKjc`（token 每次重启重新生成，重启后从日志取）。启动日志无 `did not activate` / `failed to import`。启动日志在 `.work/station-0036/server.log`；URL 带一次性 token，每次重启重新生成，取日志里那一行。

用户手动验收点：Plugins 页出现 **Audio evidence** 且图标正确 → 新建会话让它 `listen` 一个本地音频 → 确认返回 `status: complete` 与声谱图。

## README 里的评测结论

README 增“实测结果（MMAU）”一节：四批固定 60 题（0032/0034a/0034b/0035）的成绩、域内分布、完成/超时、单题中位耗时，并写清三条边界——这是本机本子集本模型的 80%，不是官方 1000 题榜单成绩；域间几题差异是采样波动；没有无音频基线所以不能谈增益。数据源与[评测结果](../../evaluation/results.md)一致。

## 未做

- 未发布 npm、未推到 GitHub（因此 README 的安装命令只能是“本仓库打包 + tarball”；git 源一行安装要等推送且获批）。
- 未在 Desktop 上安装验证；Linux/Windows 未测。
- `mode: split`（四个拆分工具）未做安装冒烟，只有单元/系统测试覆盖。
