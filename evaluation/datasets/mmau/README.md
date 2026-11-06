# MMAU数据准备

| 文件 | 用途 |
|---|---|
| [download-mmau.mjs](download-mmau.mjs) | 已授权媒体流式下载及长度/hash校验 |
| [inspect-parquet.mjs](inspect-parquet.mjs) | 已有Parquet元数据检查 |
| [audit-parquet.mjs](audit-parquet.mjs) | 缓存标注/媒体对应审计 |
| [prepare-mmau.mjs](prepare-mmau.mjs) | 分区准备；依赖既有隔离Parquet reader环境 |
| [prepare-mini-full.mjs](prepare-mini-full.mjs) | 解出test-mini全部1000题（媒体按LFS SHA256校验、题面用已核标注）；本地准备，不调模型不外发 |

[媒体准入](../../../docs/evaluation/dataset-admission.md)记录版本与许可；历史固定题单准备器归[legacy](../../legacy/README.md)，不是新run自动安装/准备步骤。不能按Parquet物理行序混用标注版本，970封存子集不是官方1000题榜。

## 官方评分依据

固定来源：[MMAU@110127f54c0dfba3faa5ec9feee4a7e4148679c5](https://github.com/Sakshi113/MMAU/tree/110127f54c0dfba3faa5ec9feee4a7e4148679c5)。官方README曾写model_prediction，但[可执行scorer](https://github.com/Sakshi113/MMAU/blob/110127f54c0dfba3faa5ec9feee4a7e4148679c5/evaluation.py#L55)使用`model_output`，要求answer/task/difficulty/choices，缺预测字段会跳题，因此导出包含全部预定题，失败空串。

[媒体数据集](https://huggingface.co/datasets/gamma-lab-umd/MMAU-test-mini)按id核对，question/choices采用已核GitHub标注。有限合成匹配对照不保证本地评分在全Unicode/tokenization/全量数据与官方完全等价；单独官方CLI输出与本地汇总必须区分。
