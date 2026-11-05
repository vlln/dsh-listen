---
title: 无bash对照与证据引导修复报告
description: 单变量60题结果、默认无shell及summary/full工程验证
type: report
status: complete
created: 2026-11-05T09:17:00Z
---

## 冻结对照

2734c86源码/preset冻结至所有会话结束；只在独立overlay移除persistent-shell，保持原persona/题单/模型/并发10/600000ms截止/无限制请求。官方评分50/60（83.33%），sound16、speech16、music18；60完成0超时。前轮41/60且14超时；配对13改善4退化，净+9题。观测step610→253，耗时中位47.536→15.5545秒。工具轨迹只有listen（426完成55参数错误），无bash/read_image调用。

可分发结果及限制见[测评结果](../../evaluation/results.md)。原对照报告为本机忽略证据路径（相对项目根，不随Git分发）：`.work/evaluation/runs/2026-11-05T08-48-11-238Z-af7aa984/report.md`。反映整个bash工具面在此固定题单/截止下的净效果，不是纯数学计算价值，不是后续persona/summary修复效果。复用旧case/home但媒体/题面hash不变，历史环境产物未清理；上轮有新模型/剧本外援，未重复多seed或全MMAU。

## 实施

- [preset](../../../evaluation/config/preset.patch.yml)去软件工程身份，改音频证据persona，先listen、按判别需求选特征/缩窗，不重复无增益调用，明确ASR/event/测量限制和数据不可信；禁止安装下载、改离线、网络/外部剧本、跨题读取。无次数上限。
- 用户明确确认未来默认禁bash；规范树只留listen/read_image及compaction。[helper](../../../evaluation/config/preset.mjs)从同一规范YAML读取，避免生成旧shell人格。真实runtime schema验证没有bash、shell/job/安装工具，因此切断已观察的“bash改HF_HUB_OFFLINE→装依赖→下载”路径。不是修通HF网络，也不读取/删除历史权重。
- DSH现有sandbox没有已接入网络/读取隔离，提示词及offline env不是强保证。历史完整plugins overlay仍可覆盖新版默认；不迁移/改写旧运行，未来overlay必须用新helper。不宣称runner强制禁shell或敌对情况下跨case强隔离。
- 当时的摘要模块（447890e提交，现已移除）新增纯presentation投影，transcript/events优先、明确省略计数、保留预处理与时间语义；紧凑JSON上限16000字节（内部validated shape），全文预览1200 Unicode码点，energy bins/pitch frames不直接灌上下文。canonical report不变、不round数值、无新依赖。
- [tools](../../../src/tools.mjs)新增`evidence_detail: summary|full`默认summary；full多行完整JSON和图片，长区间仍可能spill，模型用缩窗/选features再取full，不要求bash或不存在的read工具。detail不进入组件缓存key，仍每次鉴权/解码；PTC canonical执行值仍完整。

## 验证

1. 首轮定向tools回归失败是测试structuredClone(Buffer)变Uint8Array导致不等，改用JSON快照检验不变，非产品修改。
2. `npm run gate:feature`带已有DSH/event环境：240项，239通过0失败1真实ASR跳过；逐文件90%行80%分支门禁通过；依赖闭包673215字节，30源文件，包约42KB。
3. `DSH_RUNTIME_ROOT=... node --test test/system/preset.test.mjs` 两项通过：本地HTTP合成传输（不是付费模型）、真实headless仅read_image/listen schemas、4次工具调用不受旧预算变量限制、summary没有energy长数组、full取回energy。未开启主部署。
4. 独立只读审查发现ASR provenance字段漏保留与temporal父级遗漏清单矛盾，已补preprocessing/timing/timing_adjustments及删除虚假父级遗漏，保留frames/onsets精确计数。修正后仅重跑受影响层`node --test --experimental-test-coverage test/unit/evidence-summary.test.mjs test/unit/tools.test.mjs`：14通过0失败；summary行99.14%/分支92.13%，tools100%。
5. 默认8通道/600energy bins/200pitch帧/长中文转写有效shape摘要预算和关键字段保留、null/zero/failure、full无副作用与detail缓存命中测试通过；`git diff --check`通过。

没有新模型下载、主模型效果复跑、系统级通用bash沙箱、跨平台或GUI部署验收。HF本地runner既有离线本地模型检查未改，不声称新完成其所有辅助资产网络负控；本轮修复为默认工具面移除任意shell下载能力。代码和文档分别提交，不推送、不合并main。
