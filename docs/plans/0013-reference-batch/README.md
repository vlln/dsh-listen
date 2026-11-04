# 首批十题参考运行

用户明确批准执行首批10case；配置当前完整listen，sound4/speech3/music3，优先排除既有3题；每会话600000ms、每题3音频调用、全批40主模型请求。既有本地模型和下载复用，不扩封存集，不修改3187体验实例。

- 本批准备和运行结果留项目忽略区，按[批次约定](../../../evaluation/batch-layout.md)分离共享输入与run。
- 脚本：prepare-reference-batch建立共享入口；run-batch有界运行；summarize-run外部评分汇总。完整结果待实际运行后回填，不将准备成功写成成绩。
