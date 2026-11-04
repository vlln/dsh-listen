# DSH headless测试装配

按用户纠正执行：本插件装入隔离DSH headless测试profile/preset，主Agent就是DSH已有路由，不新建外部Agent服务；ASR继续已有本地MLX，events项目本地LiteRT。

## 已核运行时事实
官方headless README说明：headless默认禁credentials/authorization/account，GUI保存登录不自动继承；可overlay恢复三服务，API-key route可用启动环境或明确的凭据服务引用。不得为复用模型读出key/拷贝credential正文。
base默认deepseek-official/deepseek-flash，不保证等于当前GUI会话模型；测试overlay需显式固定路由和模型（baseline/聚合/拆分完全一致），不能静默拿默认模型替换。

## 最小测试profile
- 独立DSH_HOME、sessions/attachments/cache均工作区隔离，不改真实profile。
- 本插件、本地ASR和events显式路径（机器路径只本地覆盖，不入模板）；工具面可选aggregate/split，baseline不装音频工具。
- 保留文件/取消/许可约束，禁止network工具及任意bash作为“听”的旁路；音频只通过本插件，题干答案分离。
- headless --json记录tool_call/tool_result/final与退出码；系统验证至少确认实际工具调用、多轮缩窗/调参、图片引用真正出现在模型请求，以及失败不被runner exit0掩盖。
- 首次仅自制样本少量运行，不发起1000题全量费用；正式请求/费用预算另定，沿用当前已有模型配置而不需要用户再选一套技术路线。

## 身份与认证安全
可以让DSH凭据服务在用户批准范围读取自己的store，Agent不能read凭据本体；不把真实HOME整棵复制到测试HOME。若需要credential-store root单独配置，先核服务Config字段，使用只读既有store并确认无写操作；不能通过猜测文件格式/导出key绕开。现有headless测试包schema已加载，但认证继承尚未实施，不宣称模型真实调用完成。
