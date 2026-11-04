---
title: 首批十题参考运行报告
description: 固定开发样本、真实DSH headless及官方评分结果，待全批结束后填入成绩。
type: report
status: complete
created: 2026-11-04T10:30:00Z
---

## 固定条件

reference-v1完整listen，本地Whisper large-v3-turbo + YAMNet + signal，主模型deepapi/gpt-6.1-sol。首批10题sound4/speech3/music3，按既有开发集ID排序选取并排除旧3题；无答案驱动选择。每会话600000ms、每题3工具调用、全批40主模型请求。旧预检成绩不混入。

共享输入复用完整下载parquet，按ID提取10题媒体、按内容hash唯一存储，case相对链接；题目/选项原文保留。输入音频时长5.16–30.4秒，ffprobe10题检查通过。本批安装包28836字节、独立DSH_HOME配置dump通过、既有本地Whisper/LiteRT和官方评分tqdm导入通过；无新增下载，代理不读凭据正文。原音频本地处理，图像/转写等证据发主模型。

## 运行器实证

合成运行器和汇总回归15/15通过：单调总截止、TERM/KILL、实际同组后代清理、退出leader后存活后代保守停止、取消、32MiB日志限额、独占文件和全批task/audio hash预检。普通答案中的quota/payment词不误触停止。未把该测试声称为任意daemon后代回收保证。

执行代码固定5e968ed；后续b281765只增加测试，不修改运行代码。3187实例未升级/重启。

## 实际结果

10/10会话complete，0 timeout/failed/not_run；24/40主模型请求。固定缓存官方evaluation.py通过既有Python直接执行exit0，与本地摘要一致7/10（70%）。领域sound3/4（75%）、speech3/3（100%）、music1/3（33.33%）；难度easy0/1、medium3/5、hard4/4。小样本分布不能推出难题更容易，更不能证明正式10pp效果门槛。

会话耗时累计172.421秒（含各自启动/退出，不含批次准备），均值17.242秒、中位14.765秒、P95/最大29.301秒。输入token234030、输出1038；cache_read观测64640但仅2/10会话具备完整计数，其余8缺测，不当作0、不推账单。

14次工具尝试：listen13次（11completed、2次INVALID_RANGE），bash1次被AUDIO_EVALUATION_TOOL_NOT_ALLOWED拒绝。listen调用成功率11/13（84.62%），不能用会话完成率100%隐藏。10题均有成功listen，语音一题补查transcript；工具不强制所有组件，参考配置是“可用完整工具”而非每题强行使用全部特征。10个成功工具result在headless事件展示中truncated，另2可解析；不能从显示截断推断主模型证据也被截断或全部组件成功。

## 证据入口

- [本批清单](../../../.work/evaluation/runs/2026-11-04T10-22-28-860Z-reference-v1-b6d68e17/manifest.json)：共享输入ID/hash引用，无答案。
- [本地结构化汇总](../../../.work/evaluation/runs/2026-11-04T10-22-28-860Z-reference-v1-b6d68e17/scoring/summary.json)：本地匹配official=false标识保留，不改成伪官方输出。
- [官方评分原文](../../../.work/evaluation/runs/2026-11-04T10-22-28-860Z-reference-v1-b6d68e17/scoring/official-report.txt)：固定版本CLI实际输出。
- [工具错误审计](../../../.work/evaluation/runs/2026-11-04T10-22-28-860Z-reference-v1-b6d68e17/scoring/tool-audit.json)：原事件derived，不修改预测。

## 下一步建议（未执行）

同样10题跑无音频工具对照，之后去YAMNet等单变量消融；需新批次授权，不能因剩余16请求自动继续。音乐2错是后续分析入口，不立即按答案改工具或重跑。本批完成不代表整体工程/效果验收完成，不合并/发布。
