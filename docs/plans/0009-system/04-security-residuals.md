# 工程验收安全残余审查

按用户“先工程、不扩量”执行，本轮无新增真实主模型请求。独立只读审查未运行攻击或测试；下列是条件性风险，不称已发生事故。

## 已修生命周期
原插件disable只注销工具，不abort在途任务。现createTaskLifecycle维护插件AbortController和pending集合，整个execute（caller/analysis/image save）合成signal，disable先注销再abort并await allSettled。纯lifecycle2项及plugin4项PASS，实际SDK Cordis成功/拒绝路径+plugin共6项PASS。真实宿主disable期间长任务仍需专项验证，不能只凭注册表清空当通过。

## 仍未关闭的两项
1. root包含/localExecution只证明静态准入与路径执行世界，source realpath/open父目录race仍依赖同权限并发参与者。需宿主强制sandbox或稳定文件身份读取闭环；不以快照/fstat声称完全关闭。
2. runProcess在直接子exit后不再向历史PGID发信号，避免误杀复用ID，但同组忽略TERM的后代可能残留。当前支持受信非daemonizing FFmpeg/Python脚本，不保证任意进程树；需要受控后代fixture/有效监管证明或更严格后端准入。不能靠取消exit0宣布完整回收。

## 验收判定
工程A权限/取消清理门槛尚不能整体PASS，效果B也未通过且用户暂停扩量。继续明确修复或向用户报告残余，不降低冻结标准、也不因goal轮数接近上限而宣布完成。
