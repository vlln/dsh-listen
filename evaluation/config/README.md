# 评测装配

| 文件 | 用途 |
|---|---|
| [preset.patch.yml](preset.patch.yml) | 音频persona、compaction、read_image/listen，无通用shell |
| [preset.mjs](preset.mjs) | 从规范YAML取得evaluationPlugins，minimalPlugins仅参考 |
| [headless-preset.mjs](headless-preset.mjs) | 原生registry绑定会话preset |
| [model.patch.yml](model.patch.yml) | deepseek-official/deepseek-flash路由 |
| [experiment.mjs](experiment.mjs) | 极简persona单一音频条件、工具面与任务格式 |

创建run不自动合并模型patch，实际overlay需显式固定路由和已批准本地extractor配置；认证由DSH处理，不读凭据正文、不静默回退。旧overlay完整plugins可能恢复旧shell/persona，不能原样作新默认。动态嵌套plugins表达式不作为支持路径。

[装配与边界](../../docs/evaluation/preset-usage.md)是操作依据；无shell与offline环境不是通用网络/跨case强隔离。
