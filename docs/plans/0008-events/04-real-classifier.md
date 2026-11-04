# 真实本地事件分类验证

仅已有自制fixture、项目隔离LiteRT和已批准官方模型，无联网推理。

## 观察结果（原始score不是校准概率）
- 4.781875秒say合成语音，9窗：Speech mean0.9939236、Speech synthesizer0.0177951、Narration0.00390625。
- 2秒数字零，4窗：Silence0.80078125、Sound effect0.0078125、Speech0.00390625。证明即静音也有非零其他类分数，不能把top标签无条件视真。
- 2秒1kHz合成正弦，4窗：Beep/bleep0.888671875、Sound effect0.0380859、Sine wave0.0332031。
以上仅受控烟测，不能推环境/音乐泛化准确率。

## 正式可选provider
TDD新增makeLocalEventProvider：用户本地python/model路径、模型SHA256 cache身份、validate变更检查、临时WAV/进程限额/JSON和eventEvidence校验/finally清理。2项单元PASS，Python AST通过；真实Node provider decode本地语音→runner→结果通过，首候选Speech mean0.9943576、9窗。
实际模型输入15600样本，测试提取策略hop7800；对应0.975秒窗/0.4875秒hop，是本工具策略，不冒称完整TF模型0.96/0.48秒精确事件边界。尾pad记录，模型窗口裁到真实源范围。

## 明确欠账
目前只接受16k音频，其他sr拒绝，需有验证的重采样支路后才能宣称一般采样率可用；不得让ASR的mono支路污染原声统计。制品许可metadata虽有Apache提示，完整对应许可仍核。插件配置接入、取消/大输入/覆盖门禁与独立review待补；Goal active。
