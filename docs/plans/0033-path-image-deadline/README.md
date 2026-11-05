---
title: 参数改名、图像无用计算移除与五分钟截止
description: 用户批准的三项小范围改动及0032五分钟长尾统计。
type: report
status: complete
created: 2026-11-05T15:55:00Z
---

# 0033 参数改名、图像优化与截止

用户在0032诊断后批准：工具来源参数改名为 `path`；先移除图像路径的无用计算；新评测每题总截止改为5分钟。未启动真实模型评测，未更新3080/3187。

## 改动

| 项 | 内容 |
|---|---|
| 参数名 | listen/拆分工具的 `source_path` 改为 `path`；`source_path`、`file_path` 作为未知参数拒绝，不保留别名。`attachment_id` 不变。 |
| 图像计算 | selective `signal_image` 不再计算返回中不存在的频谱统计：跳过逐帧统计，以及 tonal/transient 下额外的整遍 balanced FFT。旧入口默认行为不变。 |
| 截止 | create-run 与实验配置新run写入 `session_timeout_ms:300000`；run-batch 显式把run记录值传给session，只接受300000或历史600000，缺失不推断。0032等历史run不改写。 |

## 无损验证

- 27组（tonal/transient/balanced × 1/2/6声道 × 普通/全零/极短）PNG字节与返回元数据，和改动前采集的SHA-256逐一相等。
- FFT计数测试：tonal/transient每次 signal_image 少一整遍 balanced 变换，balanced 不变。
- 本地合成计时（1s/8kHz/双声道，仅preparePlot，7次中位数）：tonal 118.54→57.49ms，transient 135.97→74.14ms，balanced 67.87→69.67ms（无变化，在噪声内）。不含解码、worker、PNG编码和模型；不代表0032那两次6声道图像超时一定消除。

## 测试

- `npm run gate:feature`：298项，296通过、0失败、2跳过（真实ASR、计时基准opt-in），覆盖率门禁通过。
- 真实安装运行时 system 测试 13/13 通过，包括离线transport实际发送 `{path:"audio.wav"}` 并执行listen。

## 0032 五分钟长尾（同批历史数据，非新截止实测）

60题中**10题超过300s**，其中最终正确 **5/10（50%）**；3题是600s超时，7题在300–600s之间完成、其中5题正确。≤300s的50题正确44/50（88%）。

若当时就是5分钟截止，按定义这10题都会计为超时，总分上限为44/60；但这只是事后切分，Agent在更短截止下可能改变行为，不能当作预测分数。

## 未改项

- `spectral_detail` 等显示参数的说明与校验未改；它们只影响 `signal_image`。
- mel 滤波的稠密计算未优化，需要另做数值等价验证。
