# 特征设计审查与开工门禁

日期：2026-11-03。审查范围：[配方](spec/0002-feature-recipe.md)、[栈提案](adr/0002-extraction-stack.md)、[工具面](interface/0001-agent-tool-surface.md)。

## 静态独立审查
结果PASS（草案静态一致性，不冻结、不代表已验证可实施）。初审修正：
- 固定未归一rFFT/单边权重/eps尺度，mel相对参考后显示floor。
- 25ms测量支持与10ms统计拥有区分离，100ms桶按真实交叠时长功率加权，固定分位数方法。
- 完整配方包含ASR和固定标签，缺模型只给DSP时整体partial，不在接口声称complete。
- 明确PCM流式硬上限、工作区与总模型RSS预算范围、单并发及取消终止进程组。

两名独立研究者分别给DSP/专用模型候选；最终提案未直接照搬：本机ASR选择whisper.cpp而非MLX以减少Python模型运行时，首版不启VAD以免过滤唱歌/弱人声；固定标签列MVP以补环境语义锚点。取舍是设计判断，不是实测优胜。

## 尚待关闭，不得称“全部考虑清楚、可以直接动工”
1. 选择并核实轻量benchmark小集：文件/许可/标准评分/任务覆盖，锁开发与封存使用规则。
2. 恢复官方正文/源码核验：具体whisper.cpp版本flag/JSON，YAMNet权重/类表/窗支持与padding，FFmpeg允许协议；现仅官方索引，全文抓取失败。
3. 锁Python及NumPy/SciPy/librosa/Matplotlib/TensorFlow交集与版本、模型hash/许可；验证TF本机支持，不预装庞大依赖。
4. 实现前明确可执行的RSS/进程组限制、DSH真实图像结果/权限/jobs契约；拟定资源数字不冒充有效隔离。
5. 用户批量审阅范围/栈和风险后再推进；权重下载、安装/验证/实现另获授权。设计文档仍draft。

## 机械检查
本地Markdown链接和git diff --check通过；未写运行代码、未安装依赖、未下载权重、未运行音频/付费接口。文献研究抓取失败已披露，未捏造正文核验结果。
