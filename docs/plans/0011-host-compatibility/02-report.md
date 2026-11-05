---
title: 宿主兼容修复验证
description: 有界宿主读取和短ID实际回归，MMAU适配保留原题文本，未更新人工体验进程。
type: report
status: complete
created: 2026-11-04T09:20:00Z
---

## 验证结果

- `npm run gate:feature`，安装版SDK及已批准YAMNet环境：153项，152通过、0失败、1项可选真实ASR跳过，覆盖率门禁通过。host行100%/分支91.43%，attachments行100%/分支87.50%。包28836字节，默认依赖673215字节。本机忽略证据路径（不随Git分发）：`.work/host-compatibility-gate.log`。无主模型请求。
- `node --import ./test/helpers/register-runtime.mjs --test test/system/local-services.test.mjs test/system/disable-active.test.mjs`，安装版SDK：2/2通过、0跳过。真实LocalFileSystem允许cwd外生成音频，经完整工具执行得到complete和可重读图像；当前会话短ID成功、其他会话相同短ID拒绝；disable仍abort并等待任务退出。
- MMAU离线测试及协议依据见[evaluation说明](../../../evaluation/README.md)。旧开发预检不是本次协议的正式成绩。未执行准备脚本或runner，不改写既有产物。

## 交付边界

源码和安装包运行中实例分离；3187仍运行旧安装包，本轮未重启或升级。用户确认更新后再替换该私有实例并保持home/端口不变。整体工程验收未因此转PASS；强制沙箱、进程后代回收、平台与人工UI验收仍未完成。修复分支基于旧安装分支，不自动合并develop或发布。
