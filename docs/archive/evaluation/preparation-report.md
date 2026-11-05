# 测评输入准备结果

> **状态：历史记录。** 以下保留当时设计、授权或实测（不改分数）；“当前/本轮/下一轮”仅指原记录时点，不作为当前命令或新增任务授权。当前执行与默认配置见[评测入口](../../../evaluation/README.md)，各批次成绩与未评测边界见[评测结果](../../evaluation/results.md)。

媒体SHA256通过后，仅读metadata/文字列并程序匹配，不向Agent显示题干或答案。固定seed dsh-listen-v1，30开发/970封存，同audio_id问题不跨区。

## 版本差异
媒体Parquet的instruction与GitHub question全1000一致，choices/answer有(A)等前缀导致初次原字符串全不同；去前缀后仍4题choices/answer不同。正式使用已核GitHub标注blob作为题干/选项/答案权威，媒体仅按id取音频，不能按物理行混用版本。日志不输出这4题的内容或答案。

## 开发音频
每域固定一个dev id，只context列提取3文件，共2946692字节；Parquet读取必须utf8:false，否则BYTE_ARRAY默认变string会破坏音频。初次拒绝INVALID_AUDIO_BYTES后核type修正，不从坏字符串重构音频。
实际ffprobe：sound10秒/32k mono PCM16；speech11.261678秒/44.1k stereo PCM16；music10秒/16k mono PCM16。全部开发范围，未听封存音频/答案。

## 隔离约束
agent.json仅id/audio_id/question/choices，keys.json独立600权限；未将完整Parquet/keys交给headless Agent工作区。后续测试用独立运行目录，仅允许preview audio和题目文件，禁止bash/fs工具读全项目答案。准备成功不是模型成绩。
