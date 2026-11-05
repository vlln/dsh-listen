# 共享实现

| 文件 | 用途 |
|---|---|
| [protocol.mjs](protocol.mjs) | 分层分区、验证与本地字符串评分 |
| [headless-adapter.mjs](headless-adapter.mjs) | 保留question/choices原文顺序，plain-text任务及原样回答 |
| [run-session.mjs](run-session.mjs) | 单调总截止、进程清理、有界日志和观测计数 |
| [trace-metrics.mjs](trace-metrics.mjs) | 轨迹辅助统计 |

题目元数据/答案只供外部评分，不进入Agent任务；失败/超时/未运行纳入分母，不反解选项字母/JSON，不清洗矛盾回答。观测step不是含所有网络重试的精确dispatch计数。详见[汇总格式](../../docs/evaluation/summary-format.md)。
