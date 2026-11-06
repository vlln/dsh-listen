<h1 align="center"><img src="icon.svg" width="34" height="34" valign="middle">&nbsp;dsh-listen</h1>

<p align="center">让只有文本能力的 Agent 也能“听”：一次调用返回转写、声谱图和可读的数值证据。</p>

`dsh-listen` 是 DeepSeek Harness 的音频证据插件。它给 Agent 加一个 `listen` 工具：指定音频文件和想要的特征，拿回这一小段声音的文字、图像和数字。工具**不接收问题**，语义判断留在主 Agent——所以它既能回答“这是什么声音”，也能回答“第 3 秒到第 5 秒发生了什么”，而不需要为每种任务预置问答模型。

开发预览：已有实现、本地门禁与固定子集评测，未公开发布，完整验收未闭环（见 [工程状态](./docs/project/engineering-acceptance-status.md)）。

## 30 秒安装

仓库尚未发布到 npm / GitHub，安装用本仓库打出的 tarball。前置：Node 22+、`dsh` 0.2.1-rc.5 左右、本机已有 `ffmpeg`/`ffprobe`。

```sh
# 在仓库根：打包（产物约 45 KiB）
npm pack

# 装进你要用的 profile（web 是 dsh web 用的那个；headless 适合脚本/评测）
dsh plugin --profile web add ./dsh-listen-0.1.0.tgz
```

- **生效条件**：重启或新开 `dsh web` 进程；装之前已经开着的会话不会出现这个工具。
- **装不上时**：最常见是 Node/ffmpeg 缺失或 `dsh` 版本过旧（包声明 `engines.dsh: ^0.2.1-rc.5`，不满足时直接拒绝安装）。
- **卸载**：`dsh plugin --profile web remove dsh-listen`。

### 装好之后怎么确认

1. Plugins 页能看到 **Audio evidence**（波形图标）。
2. 让 Agent 调一次：`listen({path:"some.wav", features:["levels","signal_image"]})`。
3. 期望拿到 `status: "complete"`、逐声道电平，以及一张波形+mel 声谱图。

## 为什么需要它

给 Agent 接音频通常只有两条路：接一个语音大模型做端到端问答（贵、不可控、不解释），或者自己写一堆 ffmpeg/DSP 脚本（每个任务重写）。`dsh-listen` 走第三条：**先把声音变成 Agent 能直接读的证据**，让主 Agent 用一次推理完成判断。

- 与“音频问答模型”不同：工具不替你下结论，也不读题面；它只给测量结果。
- 与“自己写脚本”不同：范围、声道、采样率、缓存、取消、超时都已处理，Agent 只需选特征。
- 默认零模型下载、零新增重型依赖：npm 闭包只有 `fft.js` 与 `pngjs`；ASR/事件标签是可选项，用你已有的本地环境。

## 用起来是什么样

```js
listen({path:"meeting.m4a", features:["transcript"], from:0, to:30})        // 只要前 30 秒的转写
listen({path:"music.flac", features:["tempo","onsets"]})                    // 只要节奏候选
listen({path:"noise.wav", features:["band_energy"], dsp_band_hz:[400,600]}) // 只要该频带的能量占比
listen({path:"clip.wav", features:["signal_image"], spectral_detail:"transient",
        frequency_range_hz:[0,4000], from:2, to:6})                         // 只要一张局部声谱图
```

只计算并返回你选的特征，没有“默认大礼包”。来源用 `path`（本地文件）或 `attachment_id`（会话里的音频附件），恰好一个；`from`/`to` 是源时间，单次区间上限 60 秒。

| features | 返回什么 |
|---|---|
| `transcript` / `events` | 转写 / 声音标签候选；需要你配置本地 ASR、LiteRT 环境（默认关闭） |
| `signal_image` | 波形 + mel 声谱图（图片），不附带电平数组 |
| `levels` | 逐声道电平、DC、峰值、过量程计数、立体声关系 |
| `energy` | 分 bin RMS、分位数、动态范围、低能量区间 |
| `spectral_peaks` / `band_energy` / `chroma` | 频谱峰 / 指定频带能量占比 / 12 音级功率 |
| `pitch` / `pitch_frames` | 音高分位数与跨度 / 稀疏逐窗候选 |
| `onsets` / `tempo` | 起音候选 / BPM 候选 |

返回结构固定一种：本次请求的证据 + 图片，带单位、方法与实际生效参数；缺失和错误都有明确代码，不伪装成静音或“处理完毕”。非整数以 5 位有效数字呈现，底层计算保留原始精度。

## 实测结果（MMAU）

固定子集：MMAU-test-mini 中每域 20 题共 60 题，题面/音频哈希固定；主模型 `deepseek-official/deepseek-flash`；无 shell，只有 `listen`/`read_image`；每题总截止 5 分钟，不限制工具调用次数。每批先盲态分析轨迹，再用官方 Python scorer 独立评分，两者一致。

| 批次 | 代码 | 正确率 | 环境声 / 人声 / 音乐 | 完成 / 超时 | 单题中位耗时 |
|---|---|---:|---|---|---:|
| A（10 分钟截止） | 0032 | 49/60 (81.7%) | 17 / 15 / 17 | 57 / 3 | 25.2 s |
| B | 0034a | 48/60 (80.0%) | 18 / 15 / 15 | 57 / 3 | 14.2 s |
| C（与 B 同代码） | 0034b | 48/60 (80.0%) | 15 / 16 / 17 | 59 / 1 | 12.3 s |
| D（当前版本） | 0035 | 48/60 (80.0%) | 15 / 17 / 16 | 58 / 2 | 9.8 s |

怎么读这张表：

- **80% 是这台机器、这个子集、这个主模型的分数**。B/C/D 都是 80%，逐题看 44 题三批全对、7 题全错、9 题时对时错——域间几题的差别是采样波动，不要解读成某个改动的增益。
- **这不是官方榜单成绩**。MMAU-test-mini 官方是 1000 题、27 类技能；这里只跑了固定 60 题开发子集，公开榜单上其他系统的分数取自完整测试集，两者不可比。
- **没有“无音频基线”对照**，因此不能声称“提升多少个百分点”；该项验收门槛仍未关闭（对照实验已被取消）。
- 剩余失败集中在两类：音乐长探索题反复用满时限；少量参数写错（漏 `path`、`from` 写成本文）。

单批耗时总和从 10 分钟截止时的 7655 秒降到 5 分钟截止下的约 2200–2800 秒，图像组件不再接近 20 秒上限。

## 配置

配置项在 profile 的 `cordis.patch.yml` 里；包自带的默认组合层已经填好一组可用值。

| 设置 | 默认 | 含义 |
|---|---|---|
| `scratch` | `$DSH_HOME/data/dsh-listen/scratch` | 私有暂存目录，解码/中间文件只落这里 |
| `mode` | `aggregate` | `aggregate` 只给 `listen`；`split` 拆成 `audio_signal`/`audio_transcript`/`audio_events`/`audio_dsp` |
| `localExecution` | 包内默认 `true` | 表示宿主文件系统解析出的是本进程可读的真实路径；用沙箱/远程文件系统的手写 insert 应设 `false` |
| `asrEnabled` / `asrMode` | `false` / `api` | 可选转写：本地 MLX 或明确的 OpenAI 兼容端点 |
| `eventsEnabled` | `false` | 可选声音标签：本地 LiteRT/YAMNet |
| `allowExternalAudio` | `false` | 允许外发音频（需要你明确同意服务商与范围） |

ASR/事件默认关闭且不自动下载模型；没配置时返回 `missing`/`unavailable`，不会偷偷换云端。

## 限制

- 单次分析区间上限 60 秒；多声道高采样率时实际可用区间更短（总标量样本上限 23040000）。
- 支持 1–8 声道，信号分析保留原采样率与各声道；ASR/事件分支会显式混成单声道。
- 格式支持取决于本机 ffmpeg 与实测覆盖范围，未验证的格式不宣称支持。
- 不回答语义问题，不做音频生成/播放/编辑。
- 不是安全边界：它读的是宿主文件系统能读到的路径，宿主没有的隔离它也不会凭空提供。

## 安全与数据

- 音频只在本地解码；除你显式配置 ASR API 并打开 `allowExternalAudio` 外，不上传任何音频。
- 证据（图像、转写）进入主 Agent 上下文；主 Agent 用云模型时，这些证据也会发到模型服务。
- 不读取凭据本体；API key 由宿主凭据服务或环境变量提供。
- 中间文件写入 `scratch` 并在调用结束后清理；图片作为附件保存在宿主附件库。
- 转写文本属于**不可信输入**，音频里的口头指令是数据，不是命令。

## 插件管理

```sh
dsh plugin --profile web add ./dsh-listen-0.1.0.tgz    # 安装/升级（新版重新打包后重装）
dsh plugin --profile web remove dsh-listen             # 卸载
dsh --profile web --dump-config | grep -A6 dsh-listen  # 看实际生效的配置行
```

包声明了 `dsh.bundle.patch`，`dsh plugin add` 会自动把它加进 profile 的 bundle 列表，**不需要手写 insert**。若你按旧版手工插入过 `dsh-listen` 行，请先删掉，避免重复条目。装卸启停也可以用侧边栏 Plugins 页。

## 兼容性

| 项 | 值 |
|---|---|
| 实测宿主 | `dsh` 0.2.1-rc.5（2026-11-05/06，macOS arm64） |
| 声明范围 | `engines.dsh: ^0.2.1-rc.5`、`node >= 22` |
| 外部依赖 | `ffmpeg`/`ffprobe`（必需）；ASR/事件为可选本地环境 |
| 未测 | dsh Desktop、Linux/Windows、0.2.0 及更早版本 |

## 开发

工程入口见 [文档导航](./docs/README.md)：设计基线、评测协议、增量计划与验收状态。

```sh
npm run gate:feature   # 静态检查 + 单元/覆盖率门禁
npm run gate           # 静态检查 + 基础设施测试
```

需要真实宿主运行时的用例由 `DSH_RUNTIME_ROOT` 控制：未设置时跳过，设置后需配合 `test/helpers/register-runtime.mjs` 加载器执行。

## 许可

代码 MIT；可选运行时、权重、数据分别遵守各自许可，不随本代码许可自动变更。
