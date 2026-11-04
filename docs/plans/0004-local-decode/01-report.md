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
独立review发现脱组孙进程持管道可阻close、close时历史PGID信号可能误杀：已force阶段销毁本地管道、exit后不再向历史组发信号并清理管道。新增抗TERM直接子进程回归后48/48 PASS，process branch84.09%。此runner限定受信非daemonizing二进制，不能保证清理主动脱组后代；生产FFmpeg调用不接受任意命令，完整隔离仍需系统验证。不得宣称任意进程树回收安全。

# 正式源快照
TDD新增createSourceSnapshot：root内realpath包含检查、O_NOFOLLOW最终源打开、fstat大小/常规文件、有界分块复制、SHA256、私有mkdtemp/0600文件、复制后size/mtime/ctime变化检测、幂等dispose和失败清理。`npm run gate:feature`53/53 PASS，source line100%、branch81.58%，包12962字节。支持空字节快照不冒称有效媒体。独立review发现EOF/最终stat/close取消窗口，已终态前复查并新增active取消后scratch清理回归。最终gate54/54 PASS，source branch86.96%。父目录替换race依赖同权限并发参与者，需宿主强制sandbox/稳定身份层后续加固，不能仅靠本模块宣称授权边界关闭。

# 未完成
快照/哈希/清理/授权包含关系、真实FFmpeg白名单/裁剪、压缩格式、多轨、宿主附件权限均未完成。没有ASR/events或效果评估，Goal保持active，本feature尚不合并。
