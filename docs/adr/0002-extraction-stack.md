---
title: 固定证据提取技术栈提案
description: DSP、ASR和事件分类的明确候选、参数、依赖与开工前核验清单。
type: adr
status: draft
created: 2026-11-03T12:33:53Z
---

# ADR-0002 固定证据，而非后端问答

> 历史技术栈候选（保持draft）：保留当时官方正文获取失败、依赖建议和未验证结论，不据此安装或替换当前后端。项目入口见[文档导航](../README.md)，边界见[执行契约](../interface/0002-executable-v1.md)，规范接入见[提取器配置](../../src/configure.mjs)及[提取器](../../src/extractors.mjs)。

## 已被修订的默认部署
[ADR-0003](0003-portable-configurable-pipeline.md)取代本稿默认运行时/必装模型要求：易安装和总体积优先，轻核心＋可选本地/API提取器。本稿模型/信号细节保留为候选参考，不据此安装Python/TF或非量化small。

## 决策提案（历史候选）
采纳无question、无音频LLM问答的固定配方；主Agent负责语义推理。不是先安装所有候选再比较：以下是一条建议实现路径，未验证兼容性、性能或模型质量。

| 层 | 首选候选 | 选择理由 | 备选/不选理由 |
|---|---|---|---|
| DSH边界 | Node/Cordis工具＋独立Python提取进程 | 宿主权限/附件/作业与数值提取分离，便于取消/限额；不内嵌第二宿主 | 不为本机研究建HTTP服务或新聊天产品 |
| 解码 | FFprobe/FFmpeg本机二进制 | 同一解码源供各支路，格式和进程资源可控 | 不让各库各自读取文件改变元数据/归一化 |
| DSP/制图 | NumPy、SciPy、librosa、Matplotlib Agg | 显式参数、无GUI、统计/图像可复现 | 不默认依赖Torch计算基础DSP；不手写整套mel滤波器 |
| ASR | whisper.cpp＋multilingual small，非small.en、非量化基准权重 | 原生sidecar、Apple加速候选、避免ASR再引入一套Python深度框架 | MLX适合本机但平台绑定；faster-whisper更适合特定CPU/CUDA环境，不能把CUDA吞吐外推本机 |
| 固定事件标签 | 官方YAMNet实现＋其原始checkpoint，TensorFlow CPU候选 | 较轻的固定词表分类提供环境/音乐/人声粗粒度标签，避免ASR+图像缺少语义锚点 | PANNs通常更重；改ONNX/CoreML会引入转换等价性验证，首版不自行转模型 |

YAMNet引入TensorFlow是此方案最大依赖风险。若所选Python/系统无法直接加载官方权重，暂停此项并报告，而非默认转模型/补音频LLM。具体依赖版本在支持的Python交集中查验并锁定；候选Python3.11，当前不是已证实可共存的环境。所有安装/权重下载另获授权。

## ASR固定设置候选
- whisper.cpp官方转换的small multilingual权重；模型来源、下载hash、许可证、运行时版本必须锁定。非量化避免首轮引入量化混杂，不承诺资源已适合本机。
- 16k mono float支路，按CLI要求写PCM16 WAV；float超界时先报该支路不可用，不静默clip；量化前round/saturate策略与PCM满量程映射实现前核对。
- 固定transcribe非translate、语言auto、temperature=0、greedy解码、不自动升温fallback、无initial_prompt/热词、context carry关闭。CLI具体flag及JSON字段须按选定版本全文核实；不硬抄猜测参数。
- no_speech/logprob过滤采用选定版本原始实现并记录有效参数，不发明概率阈值；数字静音/全段DC无变化可直接空转写且注明skipped_signal_degenerate，低能量非零仍跑ASR，不用RMS假装VAD。
- 不默认VAD裁剪：唱歌、弱声、音乐背景可能误删。ASR对噪声/音乐的幻觉列已知风险；语言auto不保证中英切换/方言/歌词。
- 输出segment文本和估计源时间，按区间offset加回，不做强制词级对齐、说话人识别或情绪判定。最长60秒可由Whisper内部窗口处理，记录其有效版本设置；内部重叠规则不得臆造精确时间。
- ASR字段只给模型原始诊断分数的命名含义，不合成confidence。若该版本不提供某字段则省略，不能造值。

## 固定事件标签设置候选
- 官方YAMNet公开说明常见规格为16k mono、0.96秒patch/0.48秒hop、521类；这些数字本轮全文未核实，作为待核候选而非已验证协议，须与checkpoint/源码对应后冻结。
- 独立于ASR处理完整请求范围，不能沿VAD删除非人声段；单声道折叠风险明确标记。只接受所选模型的幅度规范，overrange不静默归一化，返回支路unavailable。
- 用官方类表原英文label/id，不让Agent、用户问题、benchmark选项改变词表。保留同义/父子类，不用未经验证的人工合并冒充唯一声源。
- 每个patch时间支持从模型实际预处理计算，尾部pad显式记录，范围裁到真实样本；短于patch仍按官方padding处理并标短窗，空音频拒绝。
- Agent展示全段各类patch-score算术mean的top8；每个源时间1秒桶展示与桶重叠patch的score加权均值top3，权重是实际支持与桶重叠时长（注意patch重叠，此为score聚合非事件持续时间）。最多60桶。
- 所有top-k仅叫ranked_candidates，不设未经校准的存在阈值、不把top1强判存在；不声称不同标签score等价。数字静音/全段DC仍可运行事件模型，但输出须醒目标记无交流变化及标签可能伪阳性；不把任何标签当已证实事件。
- 原始score矩阵保留受控产物并绑定类表hash；不返回embedding冒充可解释证据。未加载/推理失败与“没有声音”不同。

## 预估/验证边界
不填未经实测的下载量、RAM、时延、准确率或“最佳”。以下是开工前必须关闭的问题：
1. 官方全文/源码：版本API、FFmpeg协议白名单、whisper.cpp参数/JSON、YAMNet类数/窗长/score时间映射和padding。
2. 许可证：代码和具体权重独立核验；FFmpeg构建许可证影响分发，不因为项目MIT就自动允许再分发二进制。首版先引用用户安装，不打包权重/二进制。
3. Python/TF/SciPy/librosa/Matplotlib在本机的版本交集、原生平台支持、锁文件方案；TF依赖风险要在实现前说明，不隐瞒。
4. DSH实际工具图像输出/权限/取消/jobs契约，模型像素预算与图中文字可读性。
5. benchmark具体小集/许可/格式/题型先定；此方案覆盖三域的能力是待测假设，不能因固定词表而保证全部语义。

用户确认设计后可进入有限技术验证（加载、合成信号、真实工具烟测），不是先跑大型多路线实验；benchmark仍在功能完成后跑一轮。未批准前不安装/编码。

## 官方来源与获取边界
本轮两个独立研究者使用官方索引；web_fetch均网络失败，所以以下为核实入口，不声称已读全文/完成兼容性核验：
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp)、[mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper)、[faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [YAMNet官方实现](https://github.com/tensorflow/models/tree/master/research/audioset/yamnet)、[PANNs](https://github.com/qiuqiangkong/audioset_tagging_cnn)、[Silero VAD](https://github.com/snakers4/silero-vad)
- [librosa STFT](https://librosa.org/doc/latest/api/generated/librosa.stft.html)、[mel](https://librosa.org/doc/0.10.2/generated/librosa.feature.melspectrogram.html)、[flatness](https://librosa.org/doc/latest/api/generated/librosa.feature.spectral_flatness.html)
- [SciPy resample_poly](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.resample_poly.html)、[FFmpeg文档](https://ffmpeg.org/ffmpeg.html)
