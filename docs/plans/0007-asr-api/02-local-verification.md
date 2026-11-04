# 已有本地MLX ASR真实验证

用户直接指定large-v3-turbo缓存，允许先本地。只复用已有环境/权重，不安装/下载、不联网、不读其他应用代码或凭据。绝对路径仅本地覆盖保存，不写分发默认。

## 真实结果
项目生成英文短句：`The audio tool extracts evidence. The agent decides what to inspect next.`
macOS say→本机FFmpeg转16k mono fixture，时长4.781875秒。已有mlx-whisper0.4.3/mlx0.32.4，直接本地snapshot加载、HF_HUB_OFFLINE/TRANSFORMERS_OFFLINE/PYTHONDONTWRITEBYTECODE开启。
真实转写elapsed2.7250507501885295秒（单次环境结果，非通用性能承诺），归一化英文词序与原句完全一致，2个segment均在时长范围内。输入为合成自有音频，无私人录音/外发/费用。

## 可选适配
新增local-asr provider/独立Python runner，仅已有用户环境/模型路径；检查目录/权重存在，不自动fetch；用本工具编码WAV、runProcess超时取消、parseAsrResponse恢复源offset、finally清理临时输入。三项Node测试通过（配置/取消/运行时不存在清理），Python AST语法检查通过。
当前完整feature coverage尚需真实provider成功/失败样例纳入，不把直接Python成功等同Node provider已贯通。Python仅可选依赖，默认Node包不安装MLX或权重。

## 未完成
本地配置接插件、模型hash/许可、长音频/噪声/语言泛化/冷启动与内存、MMAU真实对照仍未验收。只有ASR真实样例，不代表音乐/环境理解。
