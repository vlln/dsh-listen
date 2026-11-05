# 删除请求次数限制

- 分支：refactor/0020-remove-request-limits，接续并发适配器；不发布、不自动启动真实评测。
- 用户明确要求不做请求数量限制，不是把上限改成可选。
- 新批次创建只需题单、home、overlay；不生成budget文件或max_model_requests。保留并发参数与每题600000ms。
- 适配器不读取历史预算、不加载请求拦截patch、不传预算环境变量。每题请求数只从DSH step_end统计，缺失未知；它是工程观测，不是控制条件。
- 删除budget计数/锁实现及其过期测试；历史overlay的request-budget/restrict-headless保留无操作兼容，防止旧配置继续执行次数上限。
- 回归：合成子进程验证旧预算耗尽仍运行完整题单、并发请求计数不串算、CLI新参数；实际DSH本地transport验证旧上限1和已有240计数均不拦截5次模型请求/4次listen。无真实provider调用。
- 历史run及其得分不修改；历史脚本不用于新批次，当前入口见[薄适配器](../../evaluation/thin-adapter.md)。
