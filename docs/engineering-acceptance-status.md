# 第一版工程验收状态

以用户冻结acceptance.md为准，当前不整体PASS；效果扩量已由用户暂停，3题预检不算效果验收。

| 项 | 状态 | 依据/欠账 |
|---|---|---|
| 数值/参数/图像/本地提取 | 已有实证 | 142项前次完整门禁；真实本地ASR与YAMNet烟测，headless多轮参数/image_url |
| 包/默认依赖体积 | 已有实证 | 自组合包约28KB、默认依赖673215字节；可选模型/运行时单列 |
| 隔离安装/组合schema | 已有实证 | 官方CLI新DSH_HOME安装自动组合，运行默认false不擅自读宿主 |
| 当前会话附件归属 | 已有实证 | 可见FileAttachmentRef流校验、空会话同ID拒绝、异常暂存清理 |
| 禁用期间在途任务 | 本轮补实证 | 真实Cordis task等待cwd，dispose触lifetime abort、等待settle、零图片、工具注销、旧句柄再调PLUGIN_DISABLED；system1/1 PASS |
| 稳定路径/强制隔离 | 未通过 | localExecution/realpath包含检查不是对抗父目录并发替换的强边界，需闭合读取身份/宿主sandbox或限定可信部署 |
| 任意后代进程回收 | 未通过 | 受信非daemonizing binary限制已有，不能证明同组后代TERM后完全清理；历史PGID信号不可简单恢复 |
| GUI手动安装/图标/配置验收 | 未完成 | 尚未给独立Web实例和用户手动测试点 |
| 跨平台/完整资源限制 | 未完成 | macOS已有，Linux/Windows不冒称支持；V8限额非总RSS |
| 效果B | 未通过/暂停扩量 | 预检baseline2/3、两工具面3/3，单域1题不构成三域正向/10pp正式结论 |

## 不扩大结论
不因goal剩余轮数/包可安装/样例正确宣布完成；不以修改README降格为“不安全但能用”绕过硬门槛。当前修复分支需最终gate及独立review后才能合并。可交付现状与残余清单，但工程/效果均留未通过。
