# 安装体验修复

用户要求优先工程验收后，fix/0008-install-bundle增加dsh.bundle.patch，默认scratch由隔离DSH_HOME提供，localExecution/asr/events默认false。不因自动组合放宽运行权限/外发/下载。

实际重新pack、官方dsh plugin add tarball到全新项目DSH_HOME，3包安装成功且不再plain-dependency警告；profile package.json bundles实际包含dsh-listen，不需要手写insert。dump-config与schema成功，自动组合条目和安全默认可见。npm check包28120字节/依赖673215，远低批准预算；无SDK/模型运行时闭包。

仅改装配元数据，旧手工insert必须移除再升级，避免重复id；真实profile未动。未新增真实主模型请求。完整手动Plugins图标/配置体验、权限专项、预算/取消边界仍须收尾，不把schema成功当完整工程验收。
