# 官方来源入口与证据边界

2026-11-03 研究：检索子代理获得以下官方搜索索引，但全文抓取均网络失败。因此这里只记录后续核实入口；不是完整读过的规格，更不是调用实测。不得据此填写某模型当前限额、兼容性或质量排名。

| 来源 | 用途 | 尚待核实 |
|---|---|---|
| [Gemini audio](https://ai.google.dev/gemini-api/docs/audio) | 原始音频→文字问答路线 | 具体模型、限制、预处理、保留政策 |
| [OpenAI audio](https://developers.openai.com/api/docs/guides/audio-chat-completions) | 音频输入协议 | 模型/端点/格式；中转不自动兼容 |
| [Qwen Omni](https://qwenlm.github.io/blog/qwen2.5-omni/) | 开放权重音频语言模型路线 | 当前可用checkpoint、硬件和许可证 |
| [Qwen 模型卡](https://huggingface.co/Qwen/Qwen2.5-Omni-7B) | 本地模型部署候选 | 处理器、声道、资源、授权要求 |
| [YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet) | 事件分类与开放问答的区别 | 输入要求、词表和许可证 |
| [librosa.load](https://librosa.org/doc/0.11.0/generated/librosa.load.html) | 加载重采样/声道参数 | 选用版本的默认值；必须显式设置 |

使用时先读官方全文，记录核实日期、模型/依赖版本，再做实际端点验证。学术/模型卡宣称不能替代目标任务盲评。
