# 可选范围与结尾截取修正

本页保留用户范围语义修订与回归证据，后续运行不追溯修改旧批次。项目状态见[文档导航](../../README.md)，返回[容器索引](../README.md)。

分支fix/0015-clamp-audio-range。用户明确修订：from/to各自可省略，开头/结尾默认；越过时长截至结尾，返回完整时长与实际区间。替代0014坚持越界拒绝的处理，不仅改提示。

- 删除normalizeRequest中按请求to-from提前60秒拒绝，资源上限改在探测后按实际截取区间检查，故短音频to1000可接受。
- 解码from/to均至多duration；结尾区间按实际EOF解码，避免ffprobe小数舍入导致长度误判。返回source.duration_seconds及duration_basis，coverage采用测量样本；原请求保留在Pipeline requested_parameters。
- 区间为空EMPTY_RANGE；负数、非有限或倒序仍拒绝，不生成伪静音。实际区间仍≤60秒，未放宽资源预算。from超过EOF时无法产生非空音频，故报空区间并带时长。
- 新行为回归先出现3处预期失败；修复中一次测试fixture生成61秒被自身60秒限制拒绝，改为局部构造WAV延展验证超长拒绝，不改变共享fixture限制。
- 最终feature gate172项171通过0失败1可选ASR跳过，覆盖门禁通过，包29220字节/默认依赖673215字节。
- 对首批两个真实10秒音频复放原to20/to25（只解码，无模型）：两者均成功，coverage.to/source.duration_seconds均10秒。没有改写旧批次成绩，没有新主模型请求或3187重启。
- 用户明确修订已同步[执行契约](../../interface/0002-executable-v1.md)、README和工具schema；后续仍用deepseek-flash，未发起新批次。
