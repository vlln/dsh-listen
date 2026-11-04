# 媒体获取执行记录

用户批准额外≤1.3GB本地非商业评测下载，固定revision/长度/hash见dataset-admission。
本轮开始stream download到忽略的.work/mmau-media/test_mini.parquet.partial，使用wx避免覆盖、逐块上限/最终SHA256核验；后台job id bash-e5ec7d5818824c09，仍运行，已观察900046763字节。未完成前不能解析/宣称完整数据可用，下一轮先collect该job，不重复下载；无断点续传，若失败保留partial另行决定，不计算旧流作成功。

现有Python没有pyarrow/polars/duckdb/pandas，避免为解析数据安装大框架。公开registry核实候选hyparquet1.32.0（303374解包字节、无依赖、MIT）、hyparquet-compressors1.1.3（161206字节、两个小依赖、MIT），现已隔离安装到.work/evaluation-reader（ignore-scripts，固定版本，共4包），仅评测工具，不加入生产npm依赖。已读README/API说明并真实导入检查asyncBufferFromFile/metadata/schema/readObjects与六种compressor export；媒体未完整前不读取它。
