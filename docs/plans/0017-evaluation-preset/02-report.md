---
title: 原生评测preset与多声道修复报告
description: 无工具拦截与调用限额的minimal+listen装配，实际headless四次成功调用及真实六声道本地全链路。
type: report
status: complete
created: 2026-11-04T12:10:00Z
---

## 实现与验证

- 原生audio-evaluation preset采用安装版minimal快照，逐项等价测试通过；模型真正看到bash/listen/read_image，不注册glob/read/web_search/subagent等宿主全局工具。正常profile停用Host工具行，非tools/pre-execute拦截；headless-preset用原生registry.select绑定并持久化preset身份。
- 删除3音频调用限额；request-budget只注入llm计全批请求，不注入tools，不按tool名称拒绝。历史restriction入口仅budget兼容shim，不再有guard逻辑。准备器不输出max_audio_calls；run-batch保留600000ms总截止与独立预算。
- 实际安装版dsh headless + 仅loopback确定性传输，2/2通过：模型schema恰为bash/listen/read_image；合成WAV4次listen均completed；未发真实供应商请求。runner/budget/restriction对应18/18通过。过程曾发现headless不自动绑定registry默认项、嵌套plugins !!js不展开及Host工作目录工具残留，已由实际装配验证修正，不用mock伪证。
- 支持1..8原生声道及23040000标量样本上限；多声道power_mean平均全部声道，波形union保留全部，非2声道不输出伪stereo相关。8声道PNG允许3060高度；六/八声道worker测试通过。ASR/events输入算术平均混音及重采样元数据明确。
- 缓存MMAU f430c276六声道48kHz真实复放：原6声道解码、信号图178054字节、Whisper ready5分段、YAMNet ready13窗；未输出/分析正确答案。源音频未改写，无主模型调用。
- 参数错误具体指出source二选一及display必须signal。组件失败附安全error.code/recovery，原始未知异常/secret body不泄漏；输入不支持明确实际采样率/声道/允许范围。
- 完整feature gate188项187通过、0失败、1可选ASR跳过；覆盖门禁通过，包30744字节，默认依赖673215字节。多声道近上限总RSS/FFT压力尚未实测，不宣称全资源验收。

## 边界

minimal原本含shell，可读权限之外的答案取决部署，preset不是沙箱。保持答案不输入模型，不把文件分离当强隔离。没有自动重跑旧60题、没有改旧预测和成绩，没有修改3187；后续新批次需独立授权与新run-id。整个项目工程/效果验收仍未通过。
