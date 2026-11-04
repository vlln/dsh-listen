---
title: 正式ASR API开发记录
description: 原生采样率PCM16序列化首单元通过，尚未请求真实后端。
type: report
status: complete
created: 2026-11-04T03:06:00Z
---

# 前置
DSH工具feature最终实际SDK gate106/106 PASS后合并develop；此分支只做ASR API。不装本地模型，不读key、不调用公网模型。

# WAV序列化
TDD三项通过：原生sr写WAV header、显式算术mono（无需假装重采样16k）、PCM16量化及对相消的限制、原通道超满量程拒绝而非clip/AGC。
Node内建Buffer无新增依赖。真实服务须支持所提交sr/PCM16/WAV，未验证不得标兼容。该测试不证明语音转写可用。

# 正式API客户端
TDD实现makeAsrProvider：配置endpoint/model/授权（部署非工具参数）、禁redirect，Node FormData上传native WAV，无question/prompt；流式响应字节限额，状态码错误不回显正文，JSON/段时间校验+source offset，缺timing明确unavailable，超时/取消清理。loopback7/7 PASS，无真实secret/公网调用。实际SDK完整gate116/116 PASS，asr line100%、branch81.97%，wav100%；包20887字节、依赖不变。独立review发现等待secretProvider不受timeout/cancel，已传入同一signal并race deadline，未完成凭据阶段绝不发请求；回归117/117 PASS，asr branch82.61%，包21001字节。该race只能结束本工具等待，供应商凭据解析必须响应signal以释放自有资源；本轮只挂起无资源Promise的fake，未调用真实凭据。

# 配置接入
configureExtractors/Config接Plugin→Pipeline，默认disabled无key/权重；启用错误endpoint/未授权外发/要求key却无resolver构造时拒绝。loopback真实multipart经Pipeline映射source offset并cache一次，提取器设置4项通过。完整SDK gate121/121 PASS，extractors line/branch100%，包21426字节。凭据resolver只能由部署注入，当前官方entry尚无已验证的凭据服务绑定：requiresKey启用会fail-closed，不能宣称BYOK用户路径完整。

# 本地模式与实际模型
prepareExtractors异步选择api/local，Config新增asrMode/asrPython/asrModelDirectory，无默认下载或绝对路径。配置测试2项PASS，静态/包预算通过（22715字节、673215闭包）。用户已有MLX权重路径真实Node provider转写1/1 PASS，详见[本地记录](02-local-verification.md)。独立review进行中，尚不宣称完整feature gate通过。

# 最终feature门禁
实际已授权本地环境+真实SDK gate129/129 PASS，ASR/local-ASR line100%、branch86.11%/86.67%，pipeline96.43%；包22868字节。provider变更校验发生在缓存查找前，回归确认旧结果不返回。可合并本feature，默认不安装Python/MLX/权重，真实本地ASR已有受控样例证据；不宣称音乐/环境或benchmark效果已过。

# 未完成
API endpoint/授权/限额/响应/offset/取消、用户配置接Plugin和真实能力验收仍待；Goal active。真实API外发与付费需要单独授权。
