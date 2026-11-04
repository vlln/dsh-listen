---
title: DSH工具面适配首轮记录
description: 聚合拆分共用inspect与图像引用投影，尚未实际宿主装载。
type: report
status: draft
created: 2026-11-04T02:48:00Z
---

# 工具面
TDD实现makeAudioTools，注入宿主defineTool/inspect/caller/saveImage；聚合listen与拆分三工具共用Pipeline。render JSON与ImageBlock附件引用分离，二进制PNG不进canonical JSON。未提供caller由适配回调拒绝，不从模型参数取owner。
`npm run gate:feature`92/92 PASS，tools line/branch100%；包17382字节、依赖673215。该组使用纯definition替身验证适配职责，不把mock ctx或保存图片替身当真实附件/严格注入验收。下一步使用已安装SDK validate/实际Cordis宿主验证。

# 尚缺
真实调用Agent cwd/附件白名单/沙箱执行身份，Cordis注册清理、实际图像投影、独立DSH_HOME测试、插件manifest/icon/locale和用户设置均待完成。无ASR/events真实路径及MMAU结果，Goal保持active。
