---
title: 正式有界本地解码
description: 子进程生命周期、受控快照和白名单解码的TDD实现。
type: plan
status: pending
created: 2026-11-04T02:05:00Z
---

# 范围
分支feat/0002-local-decode，按已冻结契约。先process边界再source snapshot/decode，不合并spike，不读私人音频/凭据，不外发、不安装系统FFmpeg。

## 步骤
1. 有界argv子进程，超时/取消/输出限额、进程组清理、不可回显敏感stderr。
2. 授权根内source identity/有界私有快照/清理/内容hash；宿主权限仍需后续适配。
3. 单轨白名单解码、source秒/样本裁剪、raw PCM预算；合成fixture测试。
4. 单元/开发集成与coverage、自审/独立review后合并；全系统/插件安装留SYSTEM_TEST。

## Constraints/Checkpoint
仅macOS/Linux进程组路径准入，Windows未验证不谎称支持；有限进程内存/输出，不以超时替代内存保障；错误不得回显完整命令/环境/服务正文。
