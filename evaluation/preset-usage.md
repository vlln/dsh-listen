# 原生评测preset

后续评测使用 `audio-evaluation`：采用安装版DSH minimal插件定义的快照，并以测试逐项对照安装版原定义，保持其persona/compaction/read_image/persistent shell，再加一个preset内dsh-listen。不是only-listen模式；minimal中的shell与read_image正常执行。评测侧没有tools/pre-execute拒绝钩子，没有3次音频调用计数；宿主原生权限/审批仍适用。

## 装配

run-batch加载[preset.patch.yml](preset.patch.yml)及每批runtime overlay。preset patch按官方Host/Agent分层停用宿主全局工具行，工具注册在Agent子树，不是模型看到后再拦截。headless没有Web controller，因此通过[headless-preset.mjs](headless-preset.mjs)调用原生registry.select，记录真正preset身份。数据集题面不变。

每批overlay只负责：

1. 模型路由（后续deepseek-flash）和必要凭据服务引用，不读取/复制密钥。
2. 按原生完整config替换preset-audio-evaluation：id保持audio-evaluation，plugins须是完整显式YAML列表，可在准备阶段用preset.mjs的evaluationPlugins(baseUrl, listenConfig)生成并序列化；不要把动态!!js表达式嵌入plugins数组（安装版不会展开）。也可复制preset.patch.yml中完整plugins列表，仅配置audio-listen子行。listenConfig必须给scratch并显式启用localExecution及可选已有本地提取器；默认不自动开启或下载。
3. 单独挂载[request-budget.mjs](request-budget.mjs)，config.budgetFile指本批budget.json，maxModelRequests匹配批准上限。该插件只监听llm/stream计数，不消费tools服务。
4. 不再放宿主dsh-listen启用行、不插audio-evaluation-restriction，不使用max_audio_calls；旧run不会自动迁移/复跑。

实际每题600000ms总截止保留。去除音频次数限制不等于解除全批费用预算；请求预算耗尽仍停止。旧restricted批次原样保留，不能修改其元数据伪装新配置。

## 数据边界

minimal有shell，preset不是安全沙箱；共享cwd外的keys/历史评分若可被同用户读取就不是强制隔离。本项目只把答案放在外部评分端并不向模型输入；不能再声称拦截工具防泄漏。可信正式评测应让Agent执行环境在文件权限/执行世界层不可见标注，且保留工具轨迹检查。不要恢复自定义工具deny hook来掩盖这一问题。

## 验证边界

离线确定性本地transport/实际DSH headless必须验证原生模型可见工具schema、真实preset绑定和第4次listen执行；mock ctx不替代。多声道及模型提取的本地复放独立验证，不用它声称新主模型效果。修复不授权自动重新跑60题。
