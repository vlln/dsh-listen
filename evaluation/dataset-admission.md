# MMAU媒体准入（镜像元数据已读取，尚未下载媒体）

本轮直连hf-mirror.com成功，官方HF直连仍不可达。镜像是外部数据源，不是权威安全边界；实际媒体必须按公开LFS SHA256核验，不执行数据内容。

- 原始仓库：gamma-lab-umd/MMAU-test-mini。
- 镜像API revision：ccd9696c0111ea7060827598f310558df0b71b0a；private=false、gated=false。
- 同revision README一行摘录：`license: cc-by-nc-4.0`。
- 媒体文件test_mini.parquet，1213407227字节（1.21GB十进制），LFS SHA256 `54b76f440db843546f9ad49a1518cc22371f63a266f034ba6bd4343b7b6fde86`。
- 镜像入口：https://hf-mirror.com/api/datasets/gamma-lab-umd/MMAU-test-mini
- 固定卡片：https://hf-mirror.com/datasets/gamma-lab-umd/MMAU-test-mini/raw/ccd9696c0111ea7060827598f310558df0b71b0a/README.md

许可证只支持在其条款范围内的非商业评测，不把音频打入插件或再分发，不宣称原始源权利审计全部完成。若用户目的涉及商业训练/数据分发需另行处理。标注与媒体版本对应/样本内容长度需在解析时按id验证，不能仅靠同名当一致。

## 执行提案
用户批准≤1.3GB额外下载后，将媒体保存项目忽略目录、流式长度上限、SHA256核验；解析工具若需新增依赖先盘点，不用完整datasets/torch大栈默认安装。先抽固定开发样本检查音频/格式，不看封存答案。音频本地ASR/events，不上传原声；主DSH模型如需接收图像/转写仍属于数据外发与使用模型配额，真实测评预算要显式确认，不能被dataset下载批准隐含。
