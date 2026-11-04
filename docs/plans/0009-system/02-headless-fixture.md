# 实际DSH headless应用链验证

使用项目独立DSH_HOME、已安装打包插件、headless profile和overlay配置的loopback OpenAI协议响应器；不是LLM，不计任何benchmark/理解分数。

## 实际执行
headless --json普通任务，真实app启动、工具registry/Agent循环/会话持久化完成。响应器第一轮发listen调用，后续看到tool结果才返回固定结束标记。进程exit0且逐事件校验：tool_call listen输入本项目合成语音0..1秒、features signal；tool_result completed且canonical report complete、16000样本；final HEADLESS_AUDIO_FIXTURE_COMPLETE。没有仅凭exit0宣称成功。
响应器记录3个请求（可能包含标题等辅助route），无外部服务/真实key/费用，fixture key只是非秘密占位。管理后台job结束时job_kill并收集，未留服务器。

## 多轮与图片真实投影
后续multi fixture在实际headless链发两次listen：0..1秒balanced、0.25..0.75秒transient。JSON事件断言两次complete，第二次coverage正确、effective FFT1024；响应器仅计数不保存图片正文，观察2次后续请求含image_url，说明图片确实进入模型协议请求而不只是tool结果里的路径。4个协议请求、exit0，fixture服务器job_kill收集完毕。仍是确定性协议驱动，不是Agent自主推理/效果分数。

## 边界
官方插件实际headless链已证实可用，不再只mock Context。当前独立home中安装包在附件修复前打包，只用于signal路径；后续正式系统全功能需重新pack并验证。
响应器并未推理，也未检查图像请求字节；本次不证明真实模型理解/多轮选择或效果门槛。下一步同headless装配用已有模型路由做受限预检，本地ASR和events保持本地。
