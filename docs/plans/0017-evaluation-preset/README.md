# 原生评测preset、多声道与错误反馈

用户明确采用宿主minimal+音频工具的专用preset，不做评测工具拦截，删除3次调用限制，仅保留会话10分钟及独立全局模型请求预算。本轮修复与离线/本地提取验证，不自动重跑60题或更改3187。

- preset按安装版minimal定义快照构造并以测试逐项核对，不把“minimal”误解为无shell；其原生工具包括read_image和persistent bash，均不在评测层拦截。音频工具只在该preset注册，避免宿主重复。
- 真实六声道MMAU输入f430c276本地复放通过：48kHz/6ch解码、6ch信号统计/PNG、Whisper ready5segments、YAMNet ready13windows。首次用stdin --input-type导致worker继承flag失败，改成项目.work模块运行成功；不属于音频解码失败。无主模型请求。
- 完整feature gate188项187通过0失败1可选真实ASR跳过、覆盖门禁通过；包30744字节，默认依赖673215字节。preset原生headless装配仍单独实际验证，不用单测通过替代。
- 多声道保持原采样率与各通道信号；模型提取分支明确混音。聚合样本数上限避免声道数扩大造成内存无限放大；不退化现有立体声承诺。
- 参数错误给恢复建议；组件错误返回安全白名单code/recovery，不回显任意stderr/提供商body/内部路径。
- minimal shell可以读cwd外路径；数据分离不是强制隔离，不能声称preset防止答案泄漏。题单和共享题面不修改，不把答案送给Agent；后续正式运行需采用适当文件部署隔离，而不是恢复工具拦截。
