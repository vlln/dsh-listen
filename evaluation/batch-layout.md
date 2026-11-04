# 批次存储与执行约定

用户指定：每个独立会话最多10分钟；运行产物保留在项目内。此约定用于新批次适配器，旧preview runner不是新批次执行入口。

## 目录

每批使用 `.work/evaluation/runs/<UTC时间>-<配置名>-<唯一后缀>/`，创建必须exclusive，不覆盖旧批次。正式代码/协议/报告进入Git；音频、会话和轨迹留在忽略的.work。不在/tmp保存需要续接的证据。不保存密钥/token/完整凭据文件或含密钥环境快照。

```text
.work/evaluation/
  datasets/mmau/<dataset-revision>/
    manifest.json             # 原始来源、题目ID与音频hash映射
    cases/<sample-id>/         # 全局共享输入；跨run不复制
      audio.wav               # 每个唯一音频仅存一份；重复音频题用相对引用
      task.txt                # 原问题/选项/最小回答要求
      AGENTS.md               # 通用隔离说明，无答案或题目线索
    scoring/keys.json         # 唯一外部标注，禁止Agent读取
  runs/<run-id>/
    run.json                  # 配置、commit、dirty、版本、协议、并发数、状态
    manifest.json             # 所选ID及共享数据版本/hash引用，不复制题面/音频
    config/                   # 无密钥profile/overlay快照及包hash
    # DSH_HOME引用已安装评测profile，普通run不重复建runtime或安装插件
    results/<sample-id>/
      events.jsonl            # 原始headless事件
      stderr.log              # 有界日志
      result.json             # 会话ID、时间、状态、原始回答、观测请求数
    scoring/
      predictions.json        # 全部预定ID的原始model_output，失败空串
      official-input.json     # 评分派生产物；标注来自共享keys
      official-report.txt
      summary.json
    report.md                 # 实验解读；自动指标表另存scoring/summary.md
```

现有下载包、标注和音频提取优先复用：准备器从已缓存媒体按ID/hash建立共享入口，不重新下载、不按run复制。当前旧缓存到此布局尚未迁移；引用或迁移须核对来源、hash及既有脚本引用，不能只复制出第二套完整资产。

共享cases目录作为会话cwd，所有运行只读复用，禁止向其中写日志、缓存、临时文件或生成结果。按固定数据版本创建一次，不原地更新；run记录数据版本、题面协议版本及输入hash，启动前核验。后续确需修改题面适配时生成显式新协议版本，不为每次run另建副本。MMAU题目/选项原文与顺序保留，不按不同实验条件重写。

标注只保存一份，scoring产物在模型执行后由外部评分器生成；无需每批复制keys。若同一音频对应多题，cases使用指向数据集内唯一媒体的相对链接/引用，禁止每题复制媒体。共享输入不等于共享模型上下文：各题/各run仍是独立会话，无跨run特征缓存，以免污染时延/成本对照。

runtime、results和scoring都在case cwd外。此布局仅实现数据分离，不等于OS读取隔离；minimal中的shell不拦截，能否访问上级答案取决于部署文件权限/执行世界，不能声称preset保证防泄漏。正式可信评测应让Agent执行环境不可见标注，而不是增加自定义工具拦截。域、难度等评分元数据不进入任务文本。主模型/ASR/事件提取器配置显式记录，凭据仅引用，代理不读取凭据正文。

## 运行与截止

- 新参考批次拟定10题、当前完整listen配置、开发集sound4/speech3/music3，优先排除既有3题；封存970不动。真实调用须另有批次授权，不能从剩余历史预算推导。
- 每题一个独立DSH headless进程/会话，使用原生audio-evaluation preset（安装版minimal+音频工具），无评测工具拦截、无音频调用次数上限。不限制模型请求次数，不再加载历史40/240次预算；请求数仅从会话事件观测统计。用户批准的后续语义替代历史3次限制，旧批次不重写。
- `session_timeout_ms=600000`。从启动本题headless进程前开始，用单调时钟计时；包含模型请求、提取、工具执行及模型等待，不因进度/重试重置。依赖安装和批次准备在会话计时外单独记录。
- 到期立即取消整个会话并发TERM，标记timeout；只允许有界终止宽限后KILL本题受管进程，宽限不再接受结果或追加推理。取消/回收失败则停止批次，避免失控后台任务；后代进程回收需先有实际测试，不能把只杀父进程当保证。
- 到期后出现final也不算成功；已发生请求的可测统计保留，预测写空串，计入预定分母。单题普通失败/timeout可继续下一题；认证/服务端配额错误或清理失败停止批次，剩余题记not_run并留在分母。
- result.json显式记录id/status/model_output以及可测的duration_ms/model_requests/tool_calls/usage；缺测字段省略或null，不填0。usage区分input_tokens/output_tokens/cache_read_tokens。manifest统一使用samples数组，run元数据引用共享数据版本。
- JSON状态原子写入，事件流随执行落盘；中断后默认不自动重试/续跑/覆盖。有意重跑必须新run-id，保留原失败和重跑关联。

## 准备状态

run-batch已实现600000ms截止、独立输入引用和结果留档；旧run-preview仅历史预检，不作为新批次入口。后续native preset替代拦截式装配，旧run缺少新preset配置不得直接复跑。本轮修复无真实模型调用、不升级3187实例。
