---
title: 安装系统验证首轮记录
description: 实际制品npm及官方CLI隔离安装、schema解析成功，尚未boot/工具实际调用。
type: report
status: draft
created: 2026-11-04T04:16:00Z
---

# 证据
在develop对完整当前制品执行npm pack，隔离npm prefix install --ignore-scripts成功3包；实际包entry可通过已安装SDK解析导入，两个可选Python runner/icon/locale均存在。
独立DSH_HOME位于项目.work，用官方dsh headless --dump-config初始化，再官方dsh plugin --profile headless add tarball --ignore-scripts成功3包。CLI警告plain dependency/no bundle，已作为纯Cordis路线在隔离patch插入一行及显式scratch/localExecution，不改用户真实profile。
`dsh --profile headless --dump-config-schema` exit0，输出确含dsh-listen、scratch、eventsEnabled及config条目。这证明真实profile解析/SDK依赖解析，不是实际boot或工具执行成功。

# 真实本地服务系统集成
新增test/system/local-services.test.mjs（不重复单元），真实安装runtime的Cordis/LocalFileSystem/LocalAttachmentStore，生成WAV→正式工具执行→PNG持久化→readImage校验→render ImageBlock→dispose清理。1/1 PASS，图像sha256 cffef7d917739aa647668f282661c68e5aa454d779434671084f3fc9345bef07、1200×540、15743字节，实际read_image查看了持久对象。工作目录/工具注册仍局部测试提供，完整Agent/沙箱权限/会话附件归属尚未闭合；不能当完整DSH应用验收。
视觉看到0.1秒短窗pad造成频谱扩散，图中参数与限制应保留；单点energy只有像素而非长线，非错误但可读性后续专项确认。不据此新增语义能力。

# 会话附件修复
fix/0007-session-attachments新增resolver只扫描当前deriveMessages可见FileAttachmentRef，使用真实AttachmentStore.readFileStream校验流按advertised bytes有界暂存，Pipeline decode结束finally dispose。单元4/4 PASS（ID归属/超额或不符/取消/清理）；真实附件后端saveFile→当前会话引用→tool成功，另一空会话同ID拒绝，系统local-services1/1 PASS。独立review未发现确定bug；完整真实本地模型+SDK gate142/142 PASS，attachments line100%、branch83.33%，包25719字节，修复分支可合并。当前仅可见surface附件可访问，已被compact掉的引用不自动搜索历史。

# 约束与欠账
无模型请求/付费/外发；没有启动替代GUI或生产部署。当前SYSTEM_TEST准备阶段，真实boot负控/工具调用/真实附件持久化/图像送达、权限/sandbox、手动用户测试以及MMAU效果仍待。纯Cordis包安装后需显式启用的体验应在README如实说明或后续改bundle后再验证，不把依赖安装当已启用。
