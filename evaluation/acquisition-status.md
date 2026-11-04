# 媒体获取执行记录

用户批准额外≤1.3GB本地非商业评测下载，固定revision/长度/hash见dataset-admission。
本轮开始stream download到忽略的.work/mmau-media/test_mini.parquet.partial，使用wx避免覆盖、逐块上限/最终SHA256核验；后台job bash-e5ec7d5818824c09已收集exit0，实际1213407227字节及SHA256 54b76f440db843546f9ad49a1518cc22371f63a266f034ba6bd4343b7b6fde86完全匹配。文件保留.partial后缀但已验证完整，不重复下载。

现有Python没有pyarrow/polars/duckdb/pandas，避免为解析数据安装大框架。公开registry核实候选hyparquet1.32.0（303374解包字节、无依赖、MIT）、hyparquet-compressors1.1.3（161206字节、两个小依赖、MIT），现已隔离安装到.work/evaluation-reader（ignore-scripts，固定版本，共4包），仅评测工具，不加入生产npm依赖。已读README/API说明并真实导入检查asyncBufferFromFile/metadata/schema/readObjects与六种compressor export；媒体哈希通过后已读footer及仅other_attributes：1000行/10row groups，context/instruction/choices/answer/other_attributes列；属性字段id/dataset/task/split/category/sub-category/difficulty，sound333/speech333/music334、唯一id1000，与官方GitHub标注id集合完全一致。未将题干/答案显示给Agent；同id还需检查文本/音频版本映射，不按物理行序混合。
