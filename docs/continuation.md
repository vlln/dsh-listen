# Goal运行收尾与续接入口

本轮自动60/60上限到达，不是完成证明。Goal保持active，不能complete：工程权限/进程残余及GUI手动验收未关闭，效果B未达且用户明确暂停进一步扩量。不要将轮数上限当blocked或擅自修改目标。

## 当前分支
fix/0008-install-bundle，来自test/0010-evaluation-protocol（包含开发评测/报告）；尚未合并develop。develop已含核心/解码/Pipeline/DSH适配/可选ASR/events/附件修复。当前分支新增自组合bundle和lifetime取消、README更新以及验收矩阵；请审查后按最窄文档/代码提交合并，不把spike带入。

## 最后实证
在当前代码运行实际SDK+用户既有本地Whisper+项目LiteRT feature gate：144/144 PASS，lifecycle line/branch100%、plugin line100% branch96%；npm包28476字节、默认npm闭包673215。真实Cordis在途disable系统1/1 PASS。日志在忽略.work可现场查，结论已落盘，不靠临时/tmp路径。

## 真实预检与授权
9任务已用完，16主请求，baseline2/3、aggregate3/3、split3/3；不是正式门槛通过。用户随后明确先不扩量/优先工程，不得拿40余额继续调用。凭据仅DSH自身请求读取，Agent未read/export；真实profile未修改。所有测试服务已停止、相关后台任务已collect，无需要保留的server。

## 下一步（不再加特征）
1. 修复/证明[安全残余](plans/0009-system/04-security-residuals.md)：稳定授权路径读取/宿主sandbox，以及直接子退出后同组后代回收。不得靠README降低硬门槛。
2. 独立Web实例/用户手动Plugins/图标/配置验证；不替换真实3080、不生产安装。需要新managed job时记ID并结束清理。
3. 制品/依赖完整许可、卸载/资源专项与工程矩阵逐项关闭。
4. 只有用户重新批准效果扩量时才跑更多开发A/B和封存测评，门槛不变。

阅读：[工程矩阵](engineering-acceptance-status.md)、[预检结果](../evaluation/preview-results.md)、[用户暂停扩量](../evaluation/next-stage.md)、[冻结验收](acceptance.md)。
