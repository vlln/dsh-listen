# 已批准的隔离事件验证：安装和制品检查

本轮仅下载用户批准的≤50MB验证资源，不改既有ASR环境、默认npm闭包或真实profile。

## 预算与完整性
独立已有Python3.14创建项目event-venv，uv代理TLS失败后直连dry-run解析8包成功。根据PyPI每个wheel长度/SHA256先选本机兼容制品，再有界GET核验长度/hash，运行时wheel共19461246字节；模型4126810字节，总23588056字节（23.59MB，未超50MB）。metadata文本另为少量请求；无其他权重或解释器下载。

离线no-index/no-deps安装8固定wheel：ai-edge-litert2.3.0、numpy2.5.4、ml-dtypes0.6.0、flatbuffers25.12.19、protobuf7.36.2、tqdm4.70.1、typing-extensions4.16.0、backports-strenum1.3.1。导入Interpreter成功；不是默认依赖，安装解包体积另待量测。

## 官方模型实际检查
来源固定MediaPipe官方v1路径，长度4126810，SHA256 `4d8b4a53282dc83ef04e3e7dbc4fbc98082e34e44ed798e16c3a0cdd4c584faf`。
真实Interpreter allocate成功：输入waveform_binary shape[15600] float32；输出shape[1,521] float32，只有分类输出，不是完整TF模型三输出。
制品附带zip文件yamnet_label_list.txt，实际521行。扫描可读metadata发现一行：`Apache License. Version 2.0 http://www.apache.org/licenses/LICENSE-2.0.`。这是制品许可指示，尚需解析metadata对应范围/核对运行时license文件，未据字符串直接宣布再分发审计完成。

## 尚未完成
真实音频分类、窗口/模型15,600样本相对官方0.96秒支持与padding解释、16k重采样、权限/取消/内存、标签准确性和MMAU效果均未验收。events保持未启用，不把allocate成功当能听懂。
