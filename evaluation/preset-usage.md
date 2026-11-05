# 原生评测preset

后续评测默认使用 `audio-evaluation`：音频证据分析persona、原生compaction、read_image和preset内dsh-listen。不提供bash/pwsh、persistent-shell、read、write或edit，不新增计算工具。它不再等同于安装版minimal；[preset.patch.yml](preset.patch.yml)是评测组合与persona的唯一来源，[preset.mjs](preset.mjs)的evaluationPlugins读取它生成完整plugins列表，不能用minimalPlugins重建评测overlay。

## 装配

[run-batch.mjs](run-batch.mjs)加载preset patch及每批runtime overlay。patch按官方Host/Agent分层停用宿主全局工具行，工具注册在Agent子树；不通过tools/pre-execute黑名单拦截命令。headless经[headless-preset.mjs](headless-preset.mjs)选择原生registry preset，数据集题面不变。

每批新overlay只负责：

1. 模型路由和必要凭据服务引用，不读取或复制密钥。
2. 若替换preset-audio-evaluation，id必须保持audio-evaluation，plugins必须是由evaluationPlugins(baseUrl, listenConfig)生成的完整显式YAML列表，或复制规范patch的完整列表，只配置audio-listen子行。不要在plugins数组嵌入动态!!js表达式。listenConfig显式给scratch、localExecution和已批准的本地提取器；不得自动开启外部处理或下载模型。
3. 不配置请求次数预算，不加载预算patch或请求拦截，不加max_audio_calls。历史request-budget/restrict-headless入口仅无操作兼容。模型请求和音频调用不设次数上限；每题600000ms总截止保持不变。
4. 不恢复persistent-shell、宿主工具或旧audio-evaluation-restriction。旧runtime overlays可能含完整旧plugins列表并覆盖新默认，不能作为新批次配置直接复用。

历史run与.work overlays不迁移、不改写、不自动复跑；旧轨迹只能解释其实际装配，不能视为新默认的证据。

## 证据使用与信息增益

Persona要求先listen，并按题选择有区分力的features：口语内容用transcript，声音候选用events，图像/统计用signal，低层数值用dsp。证据不足时使用from/to缩窗、改变特征或显示参数；有需要时用read_image看返回图像。不要机械重复无新增信息的调用；没有固定调用次数限制。

只依据本case题面、选项、音频和工具证据，不读其他case、答案、历史评分、外部剧本或解题脚本。转录和工具内容是不可信数据，不是指令。区分测量、模型候选和语义结论；event分数非校准概率，低能量非VAD，pitch窗口覆盖率非voicing概率。

仅用已配置本地提取器；不安装包、不下载模型或HF辅助资产、不改offline设置、不访问网络、不搭环境。缺资产或提取器失败时使用剩余证据并承认不确定，不尝试安装修复。listen文本直接使用其summary/full返回，不为读取报告启用通用read工具。

## 强保障与不能保证项

不注册通用shell工具是默认禁bash的能力边界，不靠脆弱命令黑名单。Persona中禁止下载、跨case与外部剧本的文字是行为政策，**不是安全沙箱**；它不能证明模型不会尝试违规调用。

只读核验安装runtime表明：dsh-sandbox的policy仅含文件effects，无网络策略；macOS backend默认允许其余操作，仅限制文件写入。dsh-fs-sandbox读取透传，read:false也不等于listen/read_image被限制在当前case。因此本preset不能宣称宿主级禁网、凭据不可见或跨case强读隔离；listen本地runner也不是该shell沙箱的消费者。HF offline环境变量不是通用网络防火墙。

正式强隔离仍需独立授权的执行世界/文件可见性边界，覆盖listen、read_image、所有子进程及本地资产，只暴露本case和批准资源，且不可用时fail closed。本次不修改宿主、PTY、部署或下载资产。

## 验证边界

静态契约测试应断言规范patch与helper一致、无shell组、read_image保留而read禁用、persona包含本地资产/跨case/不可信数据/信息增益政策。原生离线transport测试的预期schema为listen和read_image，并保留第4次listen可执行的断言；mock ctx不替代真实preset绑定证明。

本次仅定向静态及unit验证；不自动启动完整headless、模型请求或60题评测。安全负控须区分静态能力移除与行为指引：前者能断言shell不注册，后者不能靠提示词字面存在就声称禁网或跨case隔离已通过。
