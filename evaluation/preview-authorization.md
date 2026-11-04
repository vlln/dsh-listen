# 已批准的真实headless开发预检

用户明确批准：复用DSH既有模型配置、DSH自身读取既有凭据（Agent不read/export）；3个固定开发样本×baseline/聚合/拆分，共≤9任务，每任务≤3音频工具调用，主模型请求总计≤40。ASR/events保持本地，原音频不上传；题干/转写/图像证据可进入既有主模型服务。遇配额/付费错误停止，无自动扩量。

独立DSH_HOME/profile，真实profile不改；不将此批准扩大成1000题全量、公开音频再分发或任意凭据访问。需先实装请求硬计数guard再执行。3个工作区已生成，只有audio/task/AGENTS，keys在父项目不交Agent，工具guard拒绝bash/read/network等旁路。当前guard单元1/1 PASS，尚需真实headless负控验证。

当前主模型路由须从既有非秘密配置核对后复用，不再让用户重选；不得直接假设base默认等于当前会话。headless凭据服务路径可显式指既有store只用于请求，不拷贝/打印内容。
