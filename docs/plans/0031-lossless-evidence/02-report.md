---
title: 无损精简与共享计算结果
description: 合成测量显示元数据收益有限，保留全部证据并验证批量数值等价
type: report
status: complete
created: 2026-11-05T12:36:50Z
---

## 实施

- [精简层](../../../src/compact-evidence.mjs)：模型文本不重复analysis_id/recipe_version/execution，完整canonical审计值不变；完整source保留，未引入跨调用状态。
- 特征coverage继承顶层coverage，保留局部不同值/抽样计数；同源算法完全相同参数因子化到parameter_sets，parameters_ref引用且局部parameters覆盖。仅在能缩短时使用共享参数。
- 所有证据数值、转写、候选、逐帧/逐窗数组、单位、方法和实际失败信息保持；图片附件不变。五位有效数字沿用0030，无额外舍入。
- [Pipeline](../../../src/pipeline.mjs)将数值缓存缺项单次提交worker，共享数值依赖；每特征cache identity、计数、provider验证和每调用授权/解码保持。
- [选择性分析](../../../src/selective-analysis.mjs)隔离band/图像/算法族失败，坏band不丢谱峰、坏显示范围不丢数值；未用回退重算循环。
- [测量CLI](../../../evaluation/cli/measure-evidence.mjs)只本地合成PCM，不启动模型；分解非相加分组JSON字节，图片二进制不计入，不以字节冒充token。

## 体积实测

10秒8kHz单通道440Hz门控合成信号，同一原始数值经旧呈现与新精简对照。只测序列化JSON UTF-8字节，不含图片二进制，不证明真实任务准确率/延迟。

| 请求 | 原字节 | 新字节 | 减少 |
|---|---:|---:|---:|
| tempo |1118|979|12.43%|
| spectral_peaks + chroma |2427|1937|20.19%|
| pitch + pitch_frames |26975|26440|1.98%|
| 全部10项数值/图像特征 |41270|39567|4.13%|

全部特征的数据负载分组34635字节、参数3734、特征元数据2076、信封559；各组分别编码所以含标点开销不严格相加。逐帧数组占主要体积，不支持“无损省七成”说法，不据此删帧或重新引入摘要。原本完全相同source跨两次调用仍分别保留，保证独立可解释。

## 验证

- 特性门禁266项：265通过、0失败、1真实ASR跳过，源码覆盖率通过，无新增依赖。
- 本地runtime传输及deadline4项通过，durable fs/附件工具1项通过。初次该项因未加载runtime loader无法解析SDK，补运行环境后通过，不改产品绕过。
- 新去重层展开可还原方法参数及覆盖、源数据不变；批量/单项实际worker结果逐特征相等；批量只调用一次、重叠缓存仅算缺项、ready才缓存、owner和取消不变。
- 忽略日志 `.work/lossless-evidence-size-final.json`、`.work/lossless-evidence-gate.log`，便携测量结论已在本页保存。

没有真实模型请求、评测成绩、模型下载或3187更新。算法失败族内关联产品可能同失败，外部独立族保留可用证据；灾难性worker失败整组报错，不伪称各特征独立进程隔离。
