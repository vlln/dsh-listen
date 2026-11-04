# 可选事件运行时准入研究

2026-11-03公开元数据GET，无wheel/权重下载、无安装。仅作为可选额外能力，不改变默认5MiB npm闭包。

## 已核公开PyPI元数据
- ai-edge-litert2.3.0提供macOS12 arm64 cp310..cp314 wheel；cp314压缩12826304字节，cp31112821669字节。分类器标Apache Software License（license字段null，仍需包内license核查），依赖numpy/flatbuffers/protobuf/ml_dtypes/tqdm等，实际闭包未测。
- tflite-runtime2.14.0没有本轮metadata中的macOS arm64 wheel，不能建议直接pip安装本机。
- mediapipe1.2.2提供macOS11 arm64 wheel39597352字节，但依赖opencv/matplotlib等，不优先引入。

## 模型许可仍未闭合
官方MediaPipe文档和固定YAMNet TFLite HEAD已核（4126810字节）；Kaggle Google/yamnet页面GET200但HTML只壳，未找到权重license。尝试公开api路径404，不能猜接口结果或据第三方转述定许可。网页示例代码Apache不等于该权重许可。后续可在用户允许下载制品后检查嵌入metadata/配套许可，若仍未知不再分发模型。

## 建议下一步
仅将ai-edge-litert作为可选验证候选，不默认装TF/ONNX。需明确允许约4.13MB官方模型+约12.83MB运行时wheel及依赖（先给不超过50MB下载预算）到项目隔离环境，禁止修改既有ASR环境；许可需验证后才用于分发。未批准前不执行下载，模型能力仍missing。
