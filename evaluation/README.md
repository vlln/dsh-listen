# 评测协议（尚未真实跑分）

protocol.mjs只准备输入/钥匙分离、固定分层dev/test、失败纳入分母。Agent输入仅id/audio_id/question/choices；task/answer只在外部评分器，工具提取不读题目或选项。生成的keys必须单独目录/不交给Agent。

用户明确测试入口为隔离DSH headless profile/preset安装本插件，使用DSH已有模型路由；不另建主模型评测服务，不再重复询问已定本地ASR。正式baseline/聚合/拆分在相同DSH模型与设置/预算下运行并记录JSON工具轨迹；不得读取凭据本体或因测试擅自开大额调用。headless默认不继承GUI登录，具体安全认证继承需核对官方机制后实施。开发区选择工具面后冻结正式测试；如全1000题报告需标明开发使用情况，不把970封存子集冒称完整官方榜。

scorePredictions把choice_index映成完整选项文本以对齐官方token规则；所有预定题均写model_output，失败空串，不被官方脚本跳过。该JS实现需和官方Python逐例对照后才认定正式评分兼容；原官方评分文件不vendor。

当前仅合成两题做系统协议测试，3/3 PASS，不是MMAU成绩。HF媒体/源许可仍网络不可达；未下载或外发benchmark音频。
