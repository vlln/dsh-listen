# 工具错误与超时深入诊断

依据：0032正式run `2026-11-05T13-02-37-134Z-585dab05` 原始CLI事件及完整宿主持久session；不新增模型请求、不改分、不改产品。

## 1. 十二次工具错误不是十二个独立参数问题

共11次listen参数错误，另1次read_image文件不存在。11/504次listen=2.18%；12/506次全部工具=2.37%。分属七个case，六个listen错误case与一个read_image错误case。

下列case以唯一前8位标识；完整ID见[逐题审阅](./03-error-review.md)及本机run manifest。`E行号`指正式run对应case的events；同一步中的多工具调用来自一次模型回复，不能把后续兄弟调用当成已经读到前项报错后仍重复。

| case | 错误次数 / 输入 | 意图与恢复 | 结果与事件锚点 |
|---|---|---|---|
| a68348a7 | 1：file_path代替source_path | 想取transcript/events/图像/levels/onsets/tempo；下一模型step只改键名为source_path | complete且正确；E5–6、9–11 |
| 21a2d606 | 1：path代替source_path | 识别持续最久声源；下一step改键名，成功 | complete且正确；E5–6、9–11 |
| a6f1c137 | 1：仅features，没有source | 取transcript/events；下一step补source_path:audio.wav | complete且正确；E5–6、9–11 |
| 7722117e | 2：两次漏source | 已在前两step正确传source，step3批量比较15.9–25.13s及9.8–14s时漏掉；step4两项均补source并成功 | complete但情绪错；E19–22、25–29 |
| 40dd3406 | 1：features包含waveform | 想分析首个Em边界；同step另有5个预先生成的合法chroma/peaks/pitch窗口，不是报错后即时自修；后续使用signal_image | session超时；E10–21、25起 |
| 4ae6c0d3 | 5：features为spectral_peaks/chroma，却传spectral_detail:tonal | 五个拨弦窗口来自同一个step4；step5明确Remove spectral_detail，原五窗口删该字段后全成功 | complete但和弦错；E30–39、42–52 |
| 6b80af3a | 1：read_image构造不存在的附件对象文件路径 | 想复看先前图；之后未修正该路径，转而取其他证据及重新signal_image | complete且正确；E54–60、65–66 |

### 参数契约分析

- source_path/attachment_id在schema分别可选，恰好一个只由描述及运行时校验表达；漏source不是由题面缺路径引起，题面已给audio.wav。
- 错键来自常见file_path/path调用惯性，但仅凭本批不能证明具体训练来源。拒绝错键后，两题下一step都可修正，不需要静默别名。
- waveform不在features枚举；图像中已有波形显示，但不存在名为waveform的独立特征。枚举校验正确拦截。
- spectral_detail属性本身只写time/frequency tradeoff，总工具description才写仅signal_image适用；字段名看似也适用于数值频谱，存在局部说明不够清楚的可用性问题。不能让它静默改变数值算法，也不应为了消除报错自动加图像。
- 5次同类错误是一次错误假设的批量放大，不是五轮无视反馈；2次漏source同理。报错恢复实际有效。

### 最小建议（未实施）

1. source两字段各自描述明确“每次调用必填其中一个”，若宿主schema支持则表达exactly-one；不能简单将source_path设required而破坏附件入口。
2. 将spectral_detail字段自身描述明确为image-only，且不改变spectral_peaks/chroma数值分辨率；同样标注频率显示范围/通道显示参数。维持严格拒绝不适用参数。
3. waveform错误可给出准确的现有选项提示，但不新增默认捆绑、不静默转feature、不加解题persona。
4. read_image须使用真实持久图片访问方式，不能让模型从附件digest猜宿主磁盘布局。

### 图片路径核验：不是存储失败

完整session中该图实际attachment为 `sha256:bff9bf7fdcd7fceb7dfc9ade58bb1be72aeed1a0288cb4939892ad4c962820a8`，1200×540、122553bytes。模型构造路径时同时犯了两错：digest把 `7dfc` 抄成 `7bfc`，且漏掉对象目录的 `bf/` 分片层。实际对象存在；此前完整tool结果包含text和image attachment。因此该次read_image错误是伪造/误抄底层路径，**不是图片没生成或存储丢失的证据**。是否实际视觉编码进出站请求仍需另层验证，不能只凭持久结果有image就宣称模型看到了。

完整记录锚点：worker7，按本机正式run该case的result.session_id定位宿主session。已解码宿主row36/seq34记录真实attachment，row78/seq76记录错误read_image输入。

### 错误本身耗时与模型修正成本

五个显示参数错误完整宿主日志同一assistant/message row48/seq46已包含全部5个call，随后串行dispatch总共约38ms；不是并行执行，也不是五轮看见报错后继续犯错。参数校验在授权/解码前发生，拒绝项没有执行音频提取。额外开销主要是下一次模型修正回复及重发请求，不能将该case全部177.880s归给参数错误。772漏source两项同样来自一条回复。

## 2. 三题session总超时

时长从runner启动算起，绝对截止600000ms，持续进度不会续期。三题分别600.048/600.020/600.059s，记录cleanup_failed=false、stop_batch=false；进程收到取消后exit0不代表在截止内交答卷，不能改成complete。

完整宿主日志有step/start、assistant message、工具call/result以及流式chunk时间戳；CLI投影自身没有时间戳。计时定义：

- 已完成模型阶段：step/start至对应assistant回复持久化，包括准备、网络/服务排队、重试和流式生成，**不是纯模型推理CPU时间**。
- 工具时间：tool call至result持久化；这些会话中调用串行，总和可以用于占比；包含授权、快照、解码、计算、图像写入，不是纯DSP。
- 首chunk前耗时不能等同纯网络；首chunk至reply间隔也包括流间停顿。
- 未完成末轮不包含在“已完成模型阶段”，不虚构usage；其余还含启动/调度开销。

| case / 问题 | 完成模型轮 / 进入step | 工具调用 | 已完成模型阶段 | 工具累计 | 截止时未完成末轮 |
|---|---:|---:|---:|---:|---|
| 51ff0fea / 喇叭声源 | 12 / 13 | 43，全成功 | 537.194s | 15.582s | step13开始于13:19:19.499 UTC，剩约46s |
| 4ef68d01 / 情绪转变 | 11 / 12 | 41，全成功 | 544.453s | 29.545s | step12开始于13:20:59.924 UTC，剩约25s |
| 40dd3406 / 首个Em时长 | 12 / 13 | 75，1枚举错 | 487.537s | 32.772s | step13开始于13:28:34.006 UTC；75s后传输错，再尝试被总截止取消 |

已完成模型阶段已占session约89.5%、90.7%、81.3%；即使把工具执行时间全部抹掉，也不代表会收敛出答案，尤其未完成最后模型阶段仍需时间。不能据本批说“限制工具次数即可解决”。

### 语义探索与运行时延迟共同作用

- 喇叭题反复在车/自行车/火车/船之间，用越来越细的频谱区间验证并不唯一的谐波特征。
- 情绪题反复转写、音高和通道分段，但说话人映射与情绪标签仍未确定。
- Em题反复聚合chroma/peaks/onsets小窗，仍混淆旋律、泛音、和弦及边界，转向capo/歌曲身份猜测。
- 本批同参数精确重复为0，不排除语义重复；相邻窗口换参数可耗掉大量上下文和生成时间。
- 完整宿主日志还记录情绪题与Em题模型传输失败/重试；CLI摘要未完整显露。这修正了“只是过度思考”的过强解释。
- 情绪题step7有2次TRANSPORT失败；Em题末step13在13:29:49.006 UTC记录TRANSPORT，下一尝试13:29:53.015结束为空，结合runner截止推断被取消。没有持久HTTP根因，不能仅因间隔75s宣称“75秒模型超时”；安装运行时把stream-idle watchdog记为TIMEOUT，与本条TRANSPORT不同。
- Em题已完成输出58820 tokens，step10与12单模型阶段分别94.334s、126.430s，后者17760输出tokens，之后11个数值工具合计约1s，再进入未完成末轮。喇叭题/情绪题已完成响应输出分别29140/23570tokens（从完整session usage汇总，不等同补齐全批账单）。
- 三题截止点都没有pending工具。完整宿主锚点（解码JSONL，row1为header）：51ff row152/seq150为末step13；4ef row150/seq148为末step12；40dd row190/seq188开始step12、row192/seq190为长响应、row216/seq214开始末step13、row217–220为传输失败与重试。会话位于worker5/9/10，对应session283c924b/d715e492/cb3aed20（完整UUID见result）。

| case | 已完成模型首chunk前 | 首chunk至回复持久化 | 剩余未归入前两大阶段 |
|---|---:|---:|---:|
| 51ff0fea | 250.237s | 286.957s | 47.272s |
| 4ef68d01 | 285.615s | 258.838s | 26.022s |
| 40dd3406 | 100.253s | 387.284s | 79.750s |

最后一列为runner时长减已完成模型阶段及工具union，主要是末轮未完成等待，还包括启动/阶段切换，不能全归为provider延迟。

## 3. 图像组件超时是另一层问题

发生在bb691833（该session最终586.451s完成，不是三题总超时之一）：

| step / 输入 | 返回 | 恢复 |
|---|---|---|
| 3：48kHz、6声道，0–16s，tonal，60–500Hz，power_mean | signal_image TIMEOUT，外层tool completed、内层status failed | step4改0–7.5s balanced，成功 |
| 6：48kHz、6声道，7.5–15.5s，transient，60–8000Hz，separate | signal_image TIMEOUT | step7改7.5–12.5s balanced，成功 |

事件锚点E15–21、E30–36。数值analysis worker默认20s，独立于session600s；不是ASR180s限制，也不是因“音频无内容”超时。

完整宿主时长：两次失败分别20.296s与20.247s（13:11:17.153–13:11:37.449 UTC、13:14:37.166–13:14:57.413 UTC）。恢复的7.5s balanced耗10.212s、5s balanced耗7.158s；前一7.5s transient完整成功但也耗20.000s，因为工具总时长含worker计时前的解码等，不能仅见20s就判失败。

该session工具总95.436s，其中两次失败40.543s；模型阶段490.069s。另外step7出现5次TRANSPORT及指数退避，最后一次重试开始前累计68.116s，下一尝试7.557s成功。这些传输重试独立于本地worker超时，不能把586.451s全归因图像计算。worker2/session-c0caa7a6，完整宿主seq31–32及49–50记录两次失败。

stderr四题均有SOCKS all_proxy不支持警告，不能据此断言HTTP(S)代理也被绕过。情绪超时题另有启动models列表5s超时回退；它不是600s总超时的同一事件。

### 确定存在的额外计算

- [preparePlot](../../../src/plot-data.mjs)先对所有声道完整STFT/mel，再做power_mean与显示裁频。因此把图缩成60–500Hz/一幅图不会把底层变成窄带单声道分析。
- tonal/transient还额外计算一份balanced完整频谱，只为旧spectral_statistics；selective signal_image最后不返回这些统计，存在未使用的整遍计算。includeEnergy:false只跳过describeSignal，没有跳过它。
- [computeSpectrum/applyMel](../../../src/spectrum.mjs)每帧对128个稠密filter进行全数组校验和reduce；STFT图像帧不设数值特征的300帧上限。
- 静态工作量：16s tonal+balanced合计13464声道帧、约23.54亿个稠密mel权重乘加位置；8s transient+balanced同样13464声道帧、约11.78亿位置。另有同规模filter校验、FFT、分配、聚合与PNG工作。这是按实际参数计算的操作规模，不是CPU profiling或两次失败的唯一因果证明。
- 并发10可能放大竞争，但没有CPU/内存采样或单并发对照，不能把两次超时都归因于并发。此前7.5s transient成功、相邻8s失败也不能单独证明固定长度阈值。

### 优先级

1. 无损移除图像路径未使用的balanced统计遍历，并优化可证明等价的mel滤波/校验与共享；先本地fixture验证数值/图像一致及性能，不改采样、证据、20s限制或并发10。
2. 将模型transport重试、首chunk延迟、工具执行及剩余总时间分开统计；不要把模型等待误记成音频计算。
3. 参数描述修正与附件访问修正可作为小范围工程候选；不先改persona、不加调用次数限额、不简单延长600s。
4. 当前证据不能保证优化计算后3个session会答对；它们更大的成本仍在模型阶段及未收敛的语义探索。
