---
title: 固定音频证据配方 v0
description: 逐项信号来源、算法、参数、时间单位、缺失语义与首版范围；不实现。
type: spec
status: draft
version: 1
created: 2026-11-03T12:33:53Z
---

# 固定证据配方 v0（设计值，未实测）

> 历史数学参考（保持draft）：本文的声道、范围、运行时、暂缓特征与产物设计不是全部当前实现规格。项目入口见[文档导航](../README.md)，已确认边界见[执行契约](../interface/0002-executable-v1.md)，规范实现见[信号](../../src/signal.mjs)、[频谱](../../src/spectrum.mjs)与[请求校验](../../src/request.mjs)，DSP增量见[说明](../dsp-evidence.md)。保留原设计值和未实测表述，不追溯改为实验结论。

上游：[工具面](../interface/0001-agent-tool-surface.md)、[推进方向](../direction.md)。本稿是数学/单位与balanced默认参数参考；[可调轻量Pipeline](../adr/0003-portable-configurable-pipeline.md)新增Agent有界参数并取代默认依赖/必装模型/完成条件。数值是设计建议，非验证结果；Python库仅为参考实现，不要求用户默认安装。只有审核冻结后才可实施。

## A. 统一信号与时间契约

### A1 输入与边界
- 本地文件/会话附件二选一，禁止网络URL、播放列表、设备输入与外部引用媒体；FFmpeg允许协议/解复用器白名单在实现时核实，解码进程不能任意联网。
- 建议首版上限：源文件256MiB；请求范围≤60秒；采样率8–192kHz；1–2声道；只取用户指定音轨，首版多音轨拒绝并解释，不暗选第一轨。格式首版WAV/FLAC/MP3/M4A/OGG，实际支持以解码器探测为准，不按后缀担保。
- FFprobe JSON读取格式、音轨、采样率、声道、时长；元数据duration只作预检，解码样本数才是该轨可读时长依据。时长未知须有界探测；需超过预算才能确定则报unsupported-duration，不无限扫文件。
- 提案解码/探测20秒超时、完整任务180秒超时；PCM+中间数组+图像工作区合计≤1GiB，不含模型常驻。只流式收集请求范围PCM，硬限ceil(60*192000)*2个float样本，严禁先缓存整轨；全轨计数若必要则流式且受20秒预算，超限返回unsupported-duration。首版同一宿主最多1个提取任务，ASR/TF顺序加载执行并卸载；所有进程含模型合计RSS建议准入上限6GiB，实施时需验证可监控/终止进程组；无法保证预算就拒绝加载，不把超时等同内存保障。实际平台自证后冻结，取消/超限终止整个任务进程组，不遗留模型子进程。
- 输出全部基于文件解码起点的秒坐标，不处理录音设备绝对时钟。压缩格式priming/seek精度记录限制；精确裁剪必须解码后按样本索引，不依赖快速seek毫秒精度。

### A2 原信号与派生
- 主信号：FFmpeg解码为native sample rate、原L/R声道的float32 PCM；不做AGC、去噪、去静音、pre-emphasis或幅度归一；PCM满量程定义为1.0，不截断超满量程float值。
- 范围索引：start=ceil(from*sr)，end=ceil(to*sr)，取[start,end)；返回实际样本覆盖秒数，不伪造用户所填边界恰好落样本。若实际音频短于请求，明确INVALID_RANGE，不补静音。
- 非有限样本拒绝该范围；额外报告|x|>1的overrange样本数，不静默clip。源文件不能原地修改，hash计算受文件大小限制。
- DSP图像/频谱分支每声道分别带限重采样至min(native_sr,48000)，不先合mono；使用显式scipy.signal.resample_poly和Kaiser beta=5.0、padtype=constant（需核固定版本支持），比率以gcd约分。超过48k损失高频须注明。低sr不升采样伪造高频。
- ASR/事件模型有各自独立派生要求；单声道候选为L/R平均，另算反相/声道相关警告。模型只支持mono而左右严重抵消时，仍不得称完整双声道理解；不暗中换算法或择声道。
- 长任务先预算，再解码；不得将用户输入拼shell命令。原数据不入git、不外发；模型下载需单独批准。

### A3 两套帧网格
- 时间统计：25ms矩形帧、10ms hop，长度分别round(sr*0.025)、round(sr*0.010)且至少1；从请求区间起点开始。末尾短帧保留，只按真实样本计算，禁止补零降低RMS。若末帧起点已超信号不创建。每帧测量支持为[start,start+25ms)裁真实范围，统计拥有区为[start,start+hop)裁真实范围；100ms桶按拥有区交叠时长加权rms²再开根号，min/max取有交叠帧。低能量用rms_dbfs<-60，按拥有区时长加权，同时给每声道及联合占比；quantile固定NumPy method=linear非加权分位数。
- 时频：N_fft=2048、hop=512、periodic Hann窗，center=false。这是固定样本数配方，窗长秒数随sr变化，必须在返回元数据声明，不承诺跨sr相同时间分辨率。小于2048样本整段只右补零到2048，标partial_frame/padded_samples；常规尾部补至最后一个hop窗覆盖真实末样本，所有时间支持裁到真实范围。该帧窗不同于统计网格，不混用。
- FFT定义：D[k,m]=sum_n(x[mH+n]*w[n]*exp(-2πikn/N))，使用未归一rfft，无1/N缩放；w为periodic Hann。P=abs(D)^2，不对单边内部bin乘2，DC/Nyquist同权；这是分析权重约定，不宣称PSD或能量守恒估计。mel、centroid、rolloff、flatness统一消费该P，禁止混用scipy.signal.stft默认缩放；eps固定按此尺度解释。
- 每个帧/图返回源时间坐标；帧中心用于绘图，frame_support记录有效真实范围。STFT窗跨越事件时标window，不称精确事件起止。

## B. 首版逐项规格

| ID | 输出 | 信号/算法和参数 | 单位、归约与Agent可见 | 边界/失效 |
|---|---|---|---|---|
| F01 | 技术元数据 | FFprobe+实际解码样本计数 | duration秒、sr Hz、channels、codec、请求与实际范围 | 无法探测/损坏明确失败；不是声源语义 |
| F02 | 波形包络 | 原sr每声道；时间等宽分桶，最多1200桶，每桶min/max | 满量程线性幅度，图不做逐声道自动归一 | 短于桶数按样本；保留瞬态不简单抽点 |
| F03 | RMS/峰值 | 原sr；25ms/10ms真实帧；rms=sqrt(mean(x²))，peak=max(abs(x)) | 每声道全段RMS/样本峰值、帧RMS p10/p50/p90；20log10(max(value,1e-12)) dBFS，零值序列化null+is_zero=true，-240只可作绘图地板，不当测量值 | 不是LUFS/真峰值，也不代表听感响度；超满量程可>0dBFS |
| F04 | 能量/低能量轨迹 | 各声道帧RMS；联合frame能量取各声道mean square均值再开根号 | 每100ms时间桶的能量均值(dB转回功率平均)及min/max；低能量阈值固定-60dBFS；覆盖占比按每10ms hop区域真实时长加权 | 名称low_energy不是silence/VAD；数字静音另按全样本==0判断 |
| F05 | DC/过载提示 | 原sr逐声道mean、abs(x)>=0.999计数/总样本、abs(x)>1计数 | DC线性值、near_full_scale_fraction、overrange_count | 近满量程不是已确认clipping；不说“失真率” |
| F06 | 左右关系 | 原sr；去均值Pearson相关、L/R RMS能量差20log10(rmsL/rmsR) | correlation [-1,1]、balance_db，L正；近反相提示候选r<-0.8且两边非零 | 零方差/单声道相关=null；任一rms=0则balance=null并给mute_side；只说明声道关系，不能推断空间场景 |
| F07 | log-mel图 | 每声道DSP分支STFT功率；128 mel，0到sr/2、Slaney标度/norm=slaney；保留线性mel_power用于聚合，显示转换按右列相对参考规则 | 图采用请求全声道mel_power共享参考R=max；R>0时先算10log10(max(mel_power/R,1e-12))再clip至[-80,0]，R=0专门标全零；显示dB相对峰值；轴源秒/mel刻度附Hz标签 | 归一只用于显示，不改信号；相对dB不是dBFS；全零标全零不制造纹理 |
| F08 | 频谱统计 | DSP分支未mel化功率谱P=abs(STFT)²；centroid=sum(fP)/sum(P)，rolloff累计P达85%频率，flatness=exp(mean(log(max(P,eps))))/mean(max(P,eps)) | centroid/rolloff Hz、flatness无量纲；按声道给有效帧median/p10/p90；eps=1e-12；这些显式功率权重不采用库函数隐含幅度默认值 | 频谱窗真实样本RMS≤-60dBFS或任何补零窗排除，报告有效帧占比；全无有效帧=null，不以0Hz冒充结果 |
| F09 | ASR段落 | 独立16k mono专用模型；模型与参数见[技术栈](../adr/0002-extraction-stack.md) | 源秒start/end、原语言text、language估计、方法/模型版本、时间为estimated | 未转写≠无人声；歌词/噪声可幻觉；默认非逐词强制对齐，不给人名身份/说话人数 |
| F10 | 固定声音事件候选 | 独立模型固定词表，见[技术栈](../adr/0002-extraction-stack.md) | 固定窗top-k标签/原始score/词表版本；不是用户问题或候选选项驱动 | 固定词表有盲区；分数不是校准概率；窗标签不是事件精确边界 |

## C. 图像合成与特征产物
- 首版一张1600×(单声道900/双声道1200)PNG：顶部per-channel min/max包络和能量轨迹；底部per-channel log-mel；横轴同一源时间范围、刻度≥5个；共享颜色条。保证字可读，宿主图像压缩/像素预算需实测，不承诺原图必然全部送模型。
- 展示频谱按最多1200时间列聚合：线性mel功率沿时间桶取mean再转dB，不能对dB直接平均；输出original_frames/columns/bin_seconds，说明窄瞬态可能被压缩；Agent可缩范围重提，原分辨特征保留NPZ供受控读取。
- 默认不向Agent提供NPZ内部大数组；JSON统计与图像是直接可见证据。统计feature来源是原sr/DSP分支，不从缩小图像倒算。
- 若Agent无视觉，仍有F01–06/F08–10文本统计/标签，但必须报告图像未消费；不能默认“看不见图”由后台音频LLM补答。评测锁定text-only或text+image能力。
- 默认文本软预算建议3000token（采用固定tokenizer计数），安全/覆盖与统计字段优先完整；ASR最多80段/3000字符先触限者，事件全局top8+每窗top3且最多60窗；若全部窗标签超软预算，按时间均匀保留至多12桶并列出未显示桶范围，不按用户问题挑桶；其他完整产物留授权引用。truncated及displayed_range/total_count必须明示，处理覆盖和显示覆盖不能混为一谈。

## D. 暂缓特征（不在首版偷偷执行）
| 特征 | 若启用的具体候选技术 | 暂缓理由/缺失语义 |
|---|---|---|
| BPM/beat | librosa onset_strength+beat_track；需冻结mono策略、sr/hop、tempo先验及半倍拍规则 | 无明确节拍不该输出精确BPM；全谱事件标签+图像先测，暂无可靠质量保证 |
| chroma/调性 | STFT chroma或CQT，12 pitch classes | 打击/噪声、多音/失谐使解释不稳，不能由一个key标签概括所有音乐 |
| 基频F0 | librosa.pyin，限定fmin/fmax并带voicing mask | 主要单音假设，混合声不适用；非首版人声“情绪识别” |
| MFCC | mel→log→DCT，系数/能量约定需固定 | Agent不天然理解系数；已有log-mel时没有直接消费收益 |
| embedding/CLAP检索 | 固定版本音频编码器；若分类需固定文本词表而非用户选项 | 不能直接喂向量宣称理解，词表/校准会新增设计面 |
| VAD/diarization | Silero VAD/专用分离说话人模型 | RMS不是VAD，分离身份/人数需另证据；首版不据ASR段数推人数 |
| LUFS/真峰值 | ITU-R BS.1770/EBU R128工具链 | 比sample peak复杂，当前任务收益不明；不乱用响度术语 |
| 分离/降噪 | 专用源分离网络 | 伪影改变证据，额外依赖/耗时；首版保留原声 |

## E. 缺失、确定性与测试要求
- 每项状态ready/partial/unavailable/failed/pending；unavailable必须区分disabled/not_applicable/model_missing。不安装/下载后自动“补齐”。必需F01–08，F09/F10在目标评测配方中要求安装；未装仍允许工具给DSP结果但整体partial，不能称完整配方完成。
- 每项包含source hash/range、method/version、参数、input_sr/channels、时间精度及warnings；模型随机性/硬件差异记录，不宣称字节确定性。
- 工程验证须覆盖：纯零/常数/DC/正弦/冲击、左右交换/反相、短于窗/尾帧、低sr/高sr、范围边界、非有限/损坏、多轨、取消/权限/超时。合成信号有可计算真值；检查RMS/频率/时间/单位，不用benchmark答案校准公式。
- 边界输入max资源、模型加载、实际图像送达须真实运行验证；静态文档审查不代表可行性已经证明。
- benchmark选择后只调整预先可见开发样例所需配方；封存前锁定recipe版本，不按测试答案动态改变提取方法。
