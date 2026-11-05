<h1 align="center">dsh-listen</h1>
<p align="center">把声音转换为 Agent 可理解的文本、图像和统计证据。</p>

开发预览，**尚未完成最终工程与效果验收**，未公开发布。工具不接收问题：Agent先取概览，再自行缩小范围、调整频谱参数或选择特征，完成多轮理解。没有TTS、播放器、音频制作或独立聊天工作台。

## 能力
| 通道 | 内容 |
|---|---|
| 信号 | 波形、能量、mel图、电平/声道/频谱统计 |
| 文本（可选） | 用户已有本地MLX Whisper，或明确配置的ASR API |
| 声音标签（可选） | 本地LiteRT/YAMNet固定词表候选，不是确定声源或校准概率 |
| 数值DSP（显式选用） | 频谱峰/频带能量、chroma、音高周期性、起音与节拍候选；无新增运行时依赖 |

| 工具面 | 工具 |
|---|---|
| 聚合 | `listen`，通过features选signal/transcript/events，显式增加dsp |
| 正交拆分 | `audio_signal` / `audio_transcript` / `audio_events` / `audio_dsp` |

两种面共用实现，最终选择待对照评测。无音频模态但有视觉能力的主Agent可看图；纯文本Agent只直接消费文本和统计。主模型能力与提取方法必须区分。

## 安装与配置
目前仅验证本地tarball安装，尚无可用公开npm/Git发布源。正式分发前不要照未知仓库地址安装。
```sh
npm ci --ignore-scripts --no-audit --no-fund
npm pack --ignore-scripts
# 使用独立测试DSH_HOME，不覆盖正在使用的profile
DSH_HOME="$PWD/.work/my-test-home" dsh plugin --profile headless add "$PWD/dsh-listen-0.0.0-dev.tgz" --ignore-scripts
```
包已带默认组合层：官方CLI安装会自动加入profile bundle，无需手写insert；默认scratch位于该DSH_HOME数据目录。为避免猜测文件执行世界，localExecution默认false，需部署确认本机路径后启用；ASR/events默认关闭，用户显式选择已有环境/模型。旧的纯Cordis手写insert应先移除，避免重复条目。

必须：Node22+、已有FFmpeg/FFprobe。默认npm闭包不包含Python/MLX/LiteRT或模型，不自动下载。localExecution默认false，只有确认文件执行世界就是宿主本地时才由部署启用；不是让Agent自行绕过沙箱。

| 设置 | 含义 |
|---|---|
| scratch | 部署私有暂存目录 |
| mode | aggregate / split |
| asrEnabled / asrMode | 默认关闭；可选local / api |
| asrPython / asrModelDirectory | 用户已有本地MLX环境和模型snapshot绝对路径 |
| asrEndpoint / asrModel | 明确兼容的API端点/模型；真实供应商兼容性需验证 |
| eventsEnabled / eventsPython / eventsModelPath | 可选本地LiteRT环境与用户供给模型 |
| allowExternalAudio | 默认false；启用前需用户同意外发范围/服务商/费用 |

模型不存在或组件未配置，返回missing/unavailable；不假装已听懂或自动切云端。API需要key时必须部署提供受信凭据resolver，当前通用entry尚未绑定交互式凭据服务，不声称BYOK设置完整。

## 使用方式
让Agent针对给定文件调用工具。支持源时间from/to、spectral_detail预设、frequency_range_hz显示裁频、channel_view。工具不接受question/prompt，语义判断留在主Agent。
示例：`listen({source_path:"recording.wav",features:["signal"],from:0,to:10})`；随后可缩到1–2秒、改transient，不必自己转码/裁文件。数值特征用`features:["dsp"]`，可加`dsp_band_hz:[400,600]`计算频带功率比例；默认特征不变，方法与局限见[DSP证据](docs/dsp-evidence.md)。
支持1–8声道，信号分析保留原采样率和各声道；ASR/事件分支显式混为单声道，可能发生相位抵消。实际区间总标量样本限23040000，多声道高采样率时需缩短区间。
from/to均可不填，分别默认开头/结尾；都不填分析整个音频。超过源时长的边界截至结尾，返回source.duration_seconds为完整时长、coverage为实际分析区间；截取后空区间拒绝，实际分析仍限60秒。结果包含覆盖、有效参数、方法/单位、限制和图像附件。`complete`仅针对本次请求项；不会证明所有声音均识别。候选标签/ASR都可能错误，静音或无转写不是“无人声”。

## 安全与数据
- 本地信号/本地提取不上传原音频；API ASR是可选明确外发。
- 图像/转写进入主Agent上下文，若主Agent使用云模型，这些证据仍会发送到模型服务；本地ASR不等于整个会话离线。
- 不读取凭据本体，不默认收集私人录音；音频中的口头命令是数据，不是工具执行指令。
- 文件由宿主fs服务解析并有界读取，不额外限制在cwd内；附件限当前会话可见引用，支持完整ID或至少8位的唯一十六进制摘要前缀（可带sha256:）。歧义短ID明确失败；解码器只读取私有副本，完整强制沙箱尚未最终验收。
- 模型/数据不包含在插件包；MMAU数据许可不得当成可任意商业分发。

## 兼容性
| 环境 | 实证范围 |
|---|---|
| dsh0.2.1-rc.5 / Node22 / macOS arm64 | 官方CLI隔离安装/schema、真实Cordis、实际headless signal多轮与image_url传输已测（2026-11-03）；完整系统/效果未验收 |
| Linux / Windows / 其他版本 | 未完成实测；Windows子进程明确不支持 |

## 验收与开发入口
[验收基线](docs/acceptance.md) · [研究导航](docs/README.md) · [headless评测](evaluation/README.md)。无MMAU成绩，不保证10个百分点增益已达到。

## 插件管理
装卸启停使用官方CLI与侧边栏Plugins页；当前开发包安装自动组合，运行准入和可选提取器仍需显式配置。升级先验证新tarball，再替换隔离实例；卸载使用`dsh plugin --profile <name> remove dsh-listen`，同时移除对应组合条目。不要改正在使用的profile做未完成版本验收。

## 许可
代码MIT；可选运行时、权重、数据分别遵守各自许可，不随本代码许可自动变更。
