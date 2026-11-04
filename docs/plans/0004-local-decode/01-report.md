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

# 正式FFmpeg解码
TDD实现decodeAudio：复用私有snapshot，FFprobe JSON单audio轨准入，file/pipe协议及wav/flac/mp3/mov/ogg demux白名单；源sr/声道float32输出，无归一化/downmix；ceil源样本裁剪，stdout按精确PCM字节上限，长度不符明确失败；finally释放快照。真实合成WAV开发集成测试覆盖mono/stereo/范围/坏媒体/cleanup。初次branch78.95%被门禁拦下，补format duration fallback/未知metadata回归后60/60 PASS，decode branch84.62%、line100%；包13957字节。压缩格式只列目标白名单，尚未逐项实证支持。独立review发现ffprobe十进制时长转ceil样本会误拒44100Hz/1000样本WAV；默认末尾改为硬60秒PCM预算内解EOF，以实测样本决定coverage/duration并标duration_basis，显式区间仍严格长度校验。新增44100Hz全段和offset EOF回归，最终gate61/61 PASS，decode branch87.50%，包14071字节。

# 压缩格式开发集成
新增formats测试6/6 PASS：本项目WAV转FLAC、MP3(libmp3lame)、M4A/AAC、Ogg/Opus，再真实解码验证原sr/双声道/0.1–0.3秒精确样本数/全段EOF和清理；实际双轨M4A拒绝，m3u含URL拒绝。初次libvorbis不可用报PROCESS_EXIT_8，查本机encoder确认未编入，改用已存在libopus生成Ogg（48kHz），不跳过失败或下载编码器。此证明本机这四种具体codec样本，不证明所有容器变体/平台支持。

# 未完成
本feature范围已含快照/哈希/清理、本地root包含检查和FFmpeg裁剪/具体codec开发验证。宿主强制权限/附件、全平台进程/系统隔离及性能RSS仍待后续；无ASR/events/效果评估。最后feature门禁/报告收尾后可合并，不能把本地root检查当已完成宿主授权。Goal保持active。
