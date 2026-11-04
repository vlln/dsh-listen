---
title: 首批10case完整工具参考运行
description: 复用MMAU缓存固定开发十题，600000ms会话上限与40请求硬预算，真实DSH headless运行并外部官方评分。
type: plan
status: done
created: 2026-11-04T10:20:00Z
---

## 授权

用户明确“可以开始跑第一批（10个case）”。沿用完整listen参考配置、既有主模型路由、本地Whisper/YAMNet。10题sound4/speech3/music3，旧3题排除，封存970不动；每题3音频调用、每会话600000ms、全批40主模型请求。原音频本地处理，证据发送既有主模型服务。不得静默扩量/重跑失败，不升级3187。

## 顺序与边界

1. 缓存parquet与既有标注按ID选开发题，媒体按hash共享、case用相对链接。唯一共享版本固定，run仅引用。已准备10题并检查ffprobe时长≤60s，无真实调用。
2. 安装当前tarball到本批独立DSH_HOME，保存无密钥overlay/包指纹，dump-config验证。代理不读取密钥；DSH凭据服务自行访问既有store。
3. 新runner合成测试验证超时、取消、有界输出、原文回答、结果与预算；不足则不开始真实任务。优先回收本题进程组，无法证明清理则停止而非扩大风险。
4. 逐题执行，原始事件和逐题result落run，超时/失败保留。最多10case，预算耗尽/认证或配额失败立即停止，剩余记not_run。
5. 外部summarize-run生成质量/资源指标，已有Python+tqdm直接运行固定缓存官方evaluation.py，保留全部失败行。仅10题开发结果，不宣布总体效果门槛完成。
