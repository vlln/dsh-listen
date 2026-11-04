---
title: 正式本地解码开发记录
description: 进程边界首单元通过，快照/媒体解码尚未实现。
type: report
status: draft
created: 2026-11-04T02:09:00Z
---

# 子进程边界
TDD先缺模块红，再实现src/process.mjs，不读spike。argv/shell=false，命令/限额/signal前置校验；stdout硬限、stderr drain不保留回显；超时/取消发组TERM/KILL、close后结算；Windows暂拒绝不冒称进程树支持。
`npm run gate:feature`47/47 PASS，process line100%、branch84.09%；包12078字节、依赖673215不变。测试实际Node子进程，含stderr大流、退出7/2、缺binary、无shell、输出超额、timeout/abort/fake signal。
独立review进行中，不能凭覆盖率宣称进程组全平台清理可靠；继承宿主环境/早退子孙等还需审计。

# 未完成
快照/哈希/清理/授权包含关系、真实FFmpeg白名单/裁剪、压缩格式、多轨、宿主附件权限均未完成。没有ASR/events或效果评估，Goal保持active，本feature尚不合并。
