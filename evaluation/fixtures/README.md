# 本地验证fixture

[headless-fixture-server.mjs](headless-fixture-server.mjs)提供本地模拟模型传输，用于工具装配和图像/结果格式验证，不代表真实主模型能力。相关测试位于[test/system/preset.test.mjs](../../test/system/preset.test.mjs)。

测试临时站不替代主GUI，不安装模型、不读取真实凭据；运行需显式配置已有DSH运行时。
