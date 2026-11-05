---
title: 细粒度按需证据
description: 用户批准features必填、按选择计算返回并更新tool description
type: plan
status: done
created: 2026-11-05T12:00:13Z
---

1. 删除signal/dsp捆绑与默认大礼包，聚合features必填。
2. 提供transcript/events/signal_image/levels/energy/spectral_peaks/band_energy/chroma/pitch/pitch_frames/onsets/tempo。
3. 数值分支按选项执行，内部公共计算可复用；不返回未选特征和重复诊断。
4. tool description逐项说明产物、单位和参数适用范围，schema真实标记features必填。
5. 缓存以特征为粒度，保留调用鉴权/取消及单一短数字输出。
6. 更新测试文档，执行本地合成验证；不真实评测、不下载、不更新体验站。
