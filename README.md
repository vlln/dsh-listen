<h1 align="center">dsh-listen</h1>
<p align="center">把声音转换为 Agent 可理解的文本、图像和统计证据。</p>

开发预览，**尚未完成最终工程与效果验收**，未公开发布。工具不接收问题：Agent先取概览，再自行缩小范围、调整频谱参数或选择特征，完成多轮理解。没有TTS、播放器、音频制作或独立聊天工作台。

## 能力
| 通道 | 内容 |
|---|---|
| 信号 | 波形、能量、mel图、电平/声道/频谱统计 |
| 文本（可选） | 用户已有本地MLX Whisper，或明确配置的ASR API |
| 声音标签（可选） | 本地LiteRT/YAMNet固定词表候选，不是确定声源或校准概率 |
| 数值DSP（显式选用） | 频谱峰/频带能量、chroma、稀疏音高摘要、起音与节拍候选、低能量区间与信号诊断；无新增运行时依赖 |

| 工具面 | 工具 |
|---|---|
| 聚合 | `listen`，features必填，只计算并返回所选证据 |
| 正交拆分 | `audio_signal` / `audio_transcript` / `audio_events` / `audio_dsp` |

拆分面中audio_signal固定signal_image，audio_transcript/events固定对应特征，audio_dsp要求显式选择数值features；两种面共用实现。无音频模态但有视觉能力的主Agent可看图；纯文本Agent只直接消费文本和统计。主模型能力与提取方法必须区分。

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
让Agent针对给定文件调用工具。支持源时间from/to、spectral_detail预设、frequency_range_hz显示裁频、channel_view（仅适用于signal_image）。工具不接受question/prompt，语义判断留在主Agent。
示例：`listen({path:"recording.wav",features:["transcript"],from:0,to:10})`只取转写；`features:["tempo","onsets"]`只取节奏；`features:["band_energy"],dsp_band_hz:[400,600]`只取指定频带能量比例。旧signal/dsp捆绑特征不再接受，不提供默认大礼包。方法见[DSP证据](./docs/guides/dsp-evidence.md)。

| features值 | 返回 |
|---|---|
| transcript / events | 转写 / 声音标签候选，各自独立 |
| signal_image | 波形与mel图及制图参数，不附带电平和能量数组 |
| levels | 逐声道电平、DC、峰值、过量程计数及立体声关系 |
| energy | 分bin RMS、分位数、动态范围和低能量区间 |
| spectral_peaks / band_energy / chroma | 频谱峰 / 指定频带能量比例 / 12音级功率，各自独立 |
| pitch / pitch_frames | 音高分位数与跨度 / 稀疏逐窗候选，各自独立 |
| onsets / tempo | 起音候选 / BPM候选，各自独立 |

工具只有一种返回结构：呈现本次请求的证据数据和图片，不另做摘要裁剪，不提供输出模式参数。固定限制声明和解释性引导不返回；保留单位、方法参数、实际缺失/错误与提取层截断状态。非整数呈现为5位有效数字，选择较短的小数或科学计数写法，整数保持原值；底层计算和缓存保持原始精度。数据范围由features、from/to等参数控制，每次调用仍重新鉴权和解码。同一调用的数值缓存缺项批量计算，共享FFT/统计/时域依赖；仍按特征缓存并隔离失败。输出中各特征coverage继承顶层coverage，局部字段覆盖；parameters_ref引用parameter_sets公共参数，局部parameters覆盖公共参数。analysis_id/recipe_version/execution保留在底层审计结果，不重复送入模型文本；源信息和全部证据数值/数组保留。
支持1–8声道，信号分析保留原采样率和各声道；ASR/事件分支显式混为单声道，可能发生相位抵消。实际区间总标量样本限23040000，多声道高采样率时需缩短区间。
from/to均可不填，分别默认开头/结尾；都不填分析整个音频。超过源时长的边界截至结尾，返回source.duration_seconds为完整时长、coverage为实际分析区间；截取后空区间拒绝，实际分析仍限60秒。结果包含覆盖、有效参数、方法/单位和图像附件。`complete`仅针对本次请求项；不会证明所有声音均识别。候选标签/ASR都可能错误，静音或无转写不是“无人声”。

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
[验收基线](./docs/project/acceptance.md) · [文档导航](./docs/README.md) · [headless评测](./evaluation/README.md) · [开发子集成绩与限制](./docs/evaluation/results.md)。已有固定60题开发结果，但不是官方全量榜单；尚未证明原验收的受控10个百分点增益。

## 插件管理
装卸启停使用官方CLI与侧边栏Plugins页；当前开发包安装自动组合，运行准入和可选提取器仍需显式配置。升级先验证新tarball，再替换隔离实例；卸载使用`dsh plugin --profile <name> remove dsh-listen`，同时移除对应组合条目。不要改正在使用的profile做未完成版本验收。

## 许可
代码MIT；可选运行时、权重、数据分别遵守各自许可，不随本代码许可自动变更。
