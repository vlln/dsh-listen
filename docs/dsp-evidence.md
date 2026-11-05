# 数值DSP证据

通过listen的features显式选择`dsp`；默认仍为signal/transcript/events。split模式增加audio_dsp，无新增npm/Python运行时依赖或模型下载。

```json
{"source_path":"audio.wav","features":["dsp"],"from":0,"to":10,"dsp_band_hz":[400,600]}
```

## 返回结构与用途

- `evidence.dsp.spectral.peaks`：最多12个局部谱峰的Hz及相对最大谱bin的dB功率，不是dBFS、音源或确定基频。
- `spectral.band_energy`：可选dsp_band_hz范围内bin功率占全部正频率功率的比例（DC去除）。不是waveform滤波，不改变其他特征；frequency_range_hz仍只负责signal绘图裁剪。
- `spectral.chroma`：A440十二平均律最近半音的音级能量汇总；不是和弦/调性标签。暂不做调音偏移估计。
- `temporal.pitch.frames`：有界抽样帧的单声部音高候选及周期性；原采样率计算，不降采样。明确选用去DC后能量最高的通道，不对多声部/其他通道作完整代表。
- `temporal.rhythm.onsets`：全频功率变化起音证据，不是频谱通量；软起音可能漏检。tempo_candidates提供实测周期性及明确标记的节拍倍/半速假设，不直接输出拍号或beat grid。

## 方法及边界

频谱复用fft.js：原生采样率、每通道Hann功率后求均值，不做波形下混。FFT约90ms上取整二次幂，1024..16384；hop=N/2。最多300个覆盖区间两端的确定性抽样帧，返回抽样覆盖比例和步长。部分帧补零及窗口能量归一化；补零不提高真实分辨率，Hann主瓣约4bin。频带按bin中心计入，窄带结果受泄漏/边界限制。

音高最多200个64ms原采样率窗口，FFT线性自相关及重叠能量归一化；60..1000Hz，最多3个候选，周期性阈值0.8。周期性分数不是概率，倍频/半频错误仍可能发生。短于完整音高窗不提供音高。

起音和节拍使用通道功率均值而非波形平均，避免相消；保留完整区间时间轴。至少3秒、4个起音才尝试40..240BPM候选。周期性不保证音乐节拍正确，持续音、噪声、多声部与弱攻击都可能失败。

所有计算在现有受管worker内，继承PCM1..8通道、8..192kHz、实际区间60秒和23040000标量样本上限；可取消、默认20秒组件截止。数字结果无图像附件；时间用源文件绝对秒。返回method/parameters/coverage/limitations，缓存按来源hash、会话owner、实际区间和数值band区分。

这些特征仅提供问题无关测量，不输出题目答案，不替代ASR、歌声检测、说话人分离或情绪模型。尚未证明其带来MMAU增益；真实主模型评测需单独启动。
