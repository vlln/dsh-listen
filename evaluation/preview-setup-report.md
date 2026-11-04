# 真实headless预检前置状态

用户批准≤9任务/每任务3音频工具/总40主请求。已从既有web非秘密配置核对默认路由deepapi/gpt-6.1-sol、OpenAI completions endpoint及key引用名（未读取key）。隔离overlay恢复DSH credentials服务指既有store、watch=false，不拷贝/导出凭据，Agent不触正文。dump-config-schema exit0，不代表认证调用已成功。

新增persistent budget file锁和先reserve再llm/stream、scope-local非音频工具拒绝及每Agent3次计数，budget/restriction两项测试通过。实际overlay引入时还需headless负控/真实第一任务验证，不能以单元证明所有retry已计费覆盖。

新pack通过官方CLI安装到项目隔离headless home。初次未设PNPM_HOME触ERR_PNPM_UNEXPECTED_STORE，恢复原项目-local store后成功，不改全局配置。local ASR/events显式路径已接隔离patch，未改真实profile。

尚未发真实主模型请求；下一轮从3个独立工作区逐个运行（先aggregate），收集原始JSON流、预算文件/错误，任何配额/付费失败停止。自制协议fixture key不用作真实请求。
