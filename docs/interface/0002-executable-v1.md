---
title: 第一版最小执行契约
description: 收敛既有修订，明确生产实现边界、参数、状态和未验证能力。
type: interface
status: proposed
created: 2026-11-03T14:30:00Z
---

# 第一版执行契约

本稿汇总用户已确认[基线](../v1-baseline.md)与[验收](../acceptance.md)，不改变范围。细节参数沿用[配方](../spec/0002-feature-recipe.md)及[可调Pipeline](../adr/0003-portable-configurable-pipeline.md)。这不是效果通过声明；正式冻结前需独立审查与人类确认。

## 输入与工具面
聚合listen，拆分audio_signal/audio_transcript/audio_events，共用执行器；配置选择一种面，不同时暴露对照两面。
- source_path/attachment_id恰好一个。路径基于调用Agent cwd，附件只从当前有权会话解析；无执行Agent上下文则fail closed。生产解析必须走宿主文件身份/工作目录/附件能力，不能照搬spike传root就认为权限已检查。
- from默认0，to默认文件末尾；有限数值且0≤from<to≤时长，≤60秒；size≤256MiB、8–192kHz、1–2声道、单音轨。首版格式目标WAV/FLAC/MP3/M4A/OGG，但实际每种格式需验证才列支持，不声称WAV-only spike覆盖全部。
- features默认signal/transcript/events，非空且不重复。拆分工具固定其唯一feature；signal含元数据/波形/能量/mel/统计。
- spectral_detail transient/balanced/tonal对应1024/2048/4096，hop=N/4。frequency_range_hz仅裁图，不变全带统计；channel_view separate/power_mean仅显示。未用到图像的请求传显示参数拒绝PARAMETER_NOT_APPLICABLE，不静默忽略。
- 未声明字段一律UNKNOWN_PARAMETER，特别拒绝question/prompt/自由shell/供应商/授权字段；宿主implicit参数根开放不等于工具应接受额外字段。

## 核心与可选提取器
轻核心Node+fft.js4.0.4/pngjs7.0.0候选；不bundling Python/TF/Torch/模型。FFmpeg复用或显式可选安装，不自动下载。
- signal：受控源快照→FFprobe/FFmpeg有界解码→worker数值/制图→宿主saveImage引用；全链观察取消，严格输出/时长限制。下载/解码URL/playlist/外部引用拒绝。
- API ASR：用户配置精确endpoint/model/secret引用，外发由用户授权；不从Agent参数授权、不读/回显secret、不自动重试/跨供应商。multipart转写无question，供应商不支持verbose_json则该协议不准入，不假称通用兼容。
- 本地ASR/事件分类作为可选能力，只有真实模型/制品验证后才声明可用；未配置unavailable，不把假服务或格式化器当可用提取器。事件score仅候选、固定词表/模型版本、窗时间非事件精确起止。

## 输出和错误
返回recipe_version/analysis_id/source_hash、requested/effective_parameters、requested/available/missing_features、各feature status/coverage/limitations、方法/单位/版本、实际调用与缓存命中、紧凑文本和正式图像附件。
- complete：本次明确请求项均可用并完成；partial：至少一个可用证据但部分请求缺失/失败；failed：无可用证据。不可用原因分未配置/不适用/缺模型/失败。不把空ASR等同无人声。
- typed错误INVALID_SOURCE/ACCESS_DENIED/INVALID_RANGE/RANGE_TOO_LARGE/DECODE_FAILED/PARAMETER_NOT_APPLICABLE/EXTERNAL_PROCESSING_NOT_AUTHORIZED/BACKEND_UNAVAILABLE/TIMEOUT/CANCELLED，失败不伪装静音。
- 不返回正在运行的任务，首版先用有界同步等待的异步execute；内部worker不阻塞宿主。若之后接jobs，需要另行核验真实取回/取消契约，不预造running状态。
- source数据未知允许null；图片未实际发送给主模型必须注明，文件路径不等于图像内容。

## 多轮与缓存
Agent自主选择下一轮，工具内部不做语义规划。缓存key含源hash、源时间、组件版本、有效参数和用户部署身份，读取缓存仍核权限；不可将某用户授权结果提供给别的会话。首版可仅有本次进程/Agent隔离的有界内存LRU，不承诺持久数据库。
显示改动不重跑ASR/events；局部裁旧转写和重新推理分开。日志不记key/鉴权header/原始服务错误正文，不记录未授权外发。

## 数值与资源注意
spike已验证公式，不合并原型到develop。正式开发按同一数学契约重新实现并TDD。阈值比较允许相对1e-12数值等值容差；mel显示相对reference的同阶容差不当解码错误。worker资源限制不等于总RSS，需要数组预算/输入硬限/进程组清理；权限race使用受控快照等闭合，不宣称仅realpath即足够。

## 尚未验收
真实宿主严格注入/注册/图像投影、格式支持、权限race/Windows清理、安装包/全依赖/卸载、真实ASR/分类后端、MMAU媒体许可与A/B效果均需实证。本稿不降低≥10个百分点/三域增益/≥95%完成率门槛。付费或音频外发授权不足时先做可独立验证事项，不编造成绩。
