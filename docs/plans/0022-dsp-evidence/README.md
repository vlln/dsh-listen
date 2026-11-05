# 轻量数值DSP证据

分支：feat/0022-dsp-evidence，接续ASR容错修复分支；本轮不部署、不改PTY、不自动跑真实模型评测。

- 用户批准：零新增运行时依赖，补频谱峰值/频带能量、音高候选/chroma、起音/节拍候选；说话人模型暂不加入。
- 接口：listen显式features增加dsp，默认仍signal/transcript/events；split增加audio_dsp。dsp_band_hz计算数值频带能量，区别于仅裁图的frequency_range_hz。
- 实现：复用fft.js，在既有受管worker内计算，继承原始采样率、多声道样本限制、取消和超时；输出明确方法、覆盖、抽样及不确定性。
- 验证：合成信号、原缓存公开音频本地复放、离线参考计算、全量单元及覆盖门禁；不宣称benchmark提升。
- 详细参数与边界见[dsp使用说明](../../../docs/dsp-evidence.md)。
