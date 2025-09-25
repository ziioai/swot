# AITrainingSystem 功能与原理说明 + LangGraph.js 重构可行性评估（2025-09-25）

本文面向工程实现与架构演进，系统性梳理 `AITrainingSystem` 的功能、数据流与工作原理，并评估是否适合采用 LangGraph.js 重构/复现；若适合，给出分模块实施规划与里程碑。


## 一、结论先行
- 适配度：高。AITrainingSystem 的核心是一个“多阶段、可并行、可恢复、状态驱动”的 LLM 编排流程（题型判断 → 解题 → 错题分析 → 笔记修改计划合并 → 应用修改），与 LangGraph.js 的“节点-边-状态”“检查点/回放”“条件路由”“并发批处理”等能力天然契合。
- 价值判断：值得重构。LangGraph 可以带来更清晰的编排、统一的状态管理与可观测性（Tracing/Streaming/Checkpointer），降低复杂度与维护成本，便于扩展更多评测/回退/重试策略。
- 推荐路径：以“非侵入、逐步替换”为策略。先把单题流程（stage0+stage1+评判）封装为 Graph，再逐步纳入错题分析（stage2）、合并（stage4）与批处理循环，最终替换 `SWOT` 里的控制流；UI 不变，底层由 Graph 负责编排与持久化。


## 二、功能概览（按界面标签）
- 训练与做题（核心主界面，Tab=0）
  - 含“训练控制面板”和“正确率统计”，以及“当前循环答题情况”的卡片列表。
  - 支持批量并行答题、暂停、继续、结束；显示每题在本批次的 judge/response/errorReport 状态与数据。
- 模型接口管理（Tab=7）
  - 供应商与模型选择、API Key 管理、模型列表刷新、支持自定义供应商（`llm-utils`）。
- 题库配置（Tab=3）
  - 题目导入、预处理；可加载内置 Demo 题库（`@data/SpaCE2024`）。
- 提示词配置（Tab=2）
  - 管理 stage0/1/2/4 的系统提示词与“笔记介绍/操作介绍/标记替换”；可保存与应用到 `SWOT.customPrompts`。
- 笔记历史（Tab=1）
  - 查看历史笔记版本、选中回滚（基于 IndexedDB 的 `qtBookBackups`）。
- 对话记录（Tab=6）
  - 查看调用 LLM 过程中的记录（`chatRecords`）。
- 存储管理（Tab=5）
  - 展示 IndexedDB 占用、条目数与批量清理工具。
- 说明/备忘（Tab=4）
  - 使用说明、概念解释、操作路径。


## 三、核心数据与状态模型
- 题目与训练状态
  - `QuestionEntry`: { nnid, content, answer, explain? }
  - `QuestionTrainingState`（按题粒度统计）: 训练/正确/错误次数（版本/总体）、是否简题/跳过等，以及 `stateText`（如“做题中/错误分析中/已跳过”）。
- 训练器 `SWOT`（`swot-trainer.ts`）
  - Options：批大小、最大循环数、阈值（简单/跳过/确证）、是否仅做题模式等。
  - State：总体/版本计数；`quStateDict`、`quDataDict`（保存每题 judge/response/errorReport 的过程产物）；`notebook`（QTBook）；`notebookVersion`；`notebookEditPlan`（待应用的笔记修改计划）。
  - Methods：启动/继续/暂停/中止/结束；载入题库、重置状态与选项；版本化与回滚；对题/错题处理；核心循环。
- 笔记模型（QTBook）
  - 结构：`{ entries: QTEntry[] }`；每个条目含 name/desc/clue/steps/tools/datums/tips 等字段。
  - 修改算子：`CREATE_QT / MODIFY_QT / APPEND_STEP / ...` 等（详见 `solver.ts` 的“笔记操作介绍”与 `笔记操作函数`）。
- 持久化（`swot-db-functions.ts`）
  - Dexie 表：`kvs`（通用键值：trainer/questions/promptTemplates/uiData 等）、`chatRecords`、`qtBookBackups`（含标记字段 isMarked）。
  - 能力：版本快照、存储估算、批处理删除/清理、投影/懒加载/流式处理等；序列化采用 zipson。
- 模型接口设置 `supplierForm`
  - 选择供应商、API Key 字典、已拉取模型列表、当前选中模型；保存在 `kvs`（`appSave/appLoad`）。


## 四、主要工作流原理（从业务到实现）
1) 训练循环（`循环总流程` → `循环核心流程`）
- 从 `quStateDict` 选出“可训练集合”（非简题、未跳过、未达最大验证/确证次数）。
- 排序后按批 `batchSize` 处理：
  - 对每题执行单题流程（见下文），收集正误与错误题目ID列表。
  - 若存在错误且非仅做题模式：
    - 保存当前笔记版本；初始化新版本 ID；
    - 针对本批错题合并所有“笔记修改计划”（stage4）；
    - 应用修改算子到 QTBook（`笔记操作函数`）；保存新版本快照。
  - 处理暂停/中止请求、更新状态、递归至下一批或下一轮。

2) 单题流程（`试做单个题目`）
- stage0：题型判断（从 `qtBook.entries` 的 name/desc/clue 中匹配）；输出 JSON { matched, name, ... }。
- stage1：根据笔记解题（选择匹配题型的 note，结合 steps/tools/datums/tips 输出 { plan, analyzes[], answer, didFollow, ... }）。
- 评判：与标准答案比较（宽松：JSON.stringify 或直接字符串比较）。
  - 正确：更新题目统计；评估是否达到“简题阈值”。
  - 错误：进入错题处理（见下步）。

3) 错题处理（`处理单个错题`）
- 构造 `errorReportDataWrap`（包含题目与错误答案），并以“影子笔记”形式仅保留被判定题型的完整内容，其它条目降采样为 name/desc/clue（减少上下文长度）。
- stage2：根据错题修改笔记。输出 `operations` 数组（修改算子计划）。
- 批处理时会把多题的 `operations` 交给 stage4 进行合并。单题路径也可直接应用。

4) 合并与应用（`合并笔记修改计划并更新笔记` → `执行笔记的更新操作`）
- stage4：合并来自并行专家（实际为多道错题）的修改计划，去重并统一风格。
- `笔记操作函数`：对 QTBook 条目执行增删改、重排、去重与 reIndex（tools/datums idx）。
- 应用后更新 `notebook` 与版本号，写入 `qtBookBackups`。

5) 提示词模板（PromptTemplates）
- `solver.ts` 定义各 stage 的系统提示词与输入构造器；支持标记替换（`DEFAULT_NOTE_DESC_TOKEN / DEFAULT_NOTE_OPS_TOKEN`）。
- 通过 UI 的 PromptTemplatesPanel 保存模板到 `kvs` 并 `updatePromptTemplates()` 注入 `SWOT.customPrompts`，以覆盖默认提示。

6) 观测与反馈
- `signalFn` 统一吐司提示；`ChatRecords` 记录 LLM 调用侧信息（含 `thinkingSpans/outputSpans` 的精简版）。
- 声音提示与 UI 卡片/统计面板即时反馈训练过程。


## 五、为何适合用 LangGraph.js
- 多阶段有向流程：stage0→stage1→判断→(正确|错误→stage2)→(批/全局)stage4→应用修改，天然是状态机/图结构。
- 条件与分支：题目是否匹配/是否答对/是否仅做题模式/是否暂停等，均可用“条件边”表达。
- 并发批处理：`batchSize` 并行题目处理可映射为“并发子图”，LangGraph 支持并行与收敛节点。
- 检查点与可恢复：当前用 Dexie 手写存储逻辑；LangGraph 的 Checkpointer（可自定义 IndexedDB 适配）能更标准化地管理状态回放、断点续跑。
- 统一重试/超时/容错：对 LLM 节点设置统一的重试策略与 JSON 结构校验（Guardrails），比分散在业务代码里更清晰。
- 可观测性：借助 LangSmith/LangGraph 的 tracing 接口，天然获得链路日志、token/时延数据，对定位“哪一步坏了”更友好。


## 六、重构总体蓝图（LangGraph 架构草案）
- 图层次划分
  - 单题子图（QuestionGraph）：`Classify` → `Answer` → `Judge` → [if wrong] `AnalyzeWrong`（产出 ops）
  - 批处理子图（BatchGraph）：并行运行 N 个 QuestionGraph → 收敛 `CollectOps`
  - 合并/应用子图（NotebookGraph）：`MergeOps`（stage4）→ `ApplyOps`（笔记操作函数）→ `Snapshot`
  - 顶层循环（TrainLoopGraph）：`SelectQuestions` → `BatchGraph` → 条件判断（是否全对/是否达阈值/是否暂停或中止）→ 继续或结束
- 状态（Graph State Schema，示例要点）
  - 全局：options、supplierForm、promptTemplates（或其引用ID）、notebook、notebookVersion、quStateDict、quDataDict、counters
  - 批次：batchIds、batchOps[]、batchAllCorrect、batchAllBugs
  - 单题：judgeOutput、answerOutput、errorReport（ops）
- 通道与副作用
  - Storage 通道：IndexedDB Checkpointer + 侧写 `chatRecords/qtBookBackups`
  - Side-effects：声音提示、Toast、UI streaming（事件/观察者）
- LLM 节点抽象
  - `invokeLLM(stage, input, modelConfig)`：统一 vendor 选择、重试、超时、结构化输出校验（JSON schema 校验失败→自动重试/降级）


## 七、分模块实施规划（不写代码，陈述实施思路）
1) 单题流程最小闭环（MVP）
- 目标：图化 stage0+stage1+judge，输出“正确/错误”与最小统计更新。
- 实施要点：
  - 封装 `Classify`/`Answer` 两个 LLM 节点与 `Judge` 规则节点；
  - Graph State 内只读 `notebook.entries` 并按 name 匹配 note；
  - 将现有 `试做单个题目` 的副作用（写 `quDataDict`）改为节点结果回填到 Graph State，UI 通过订阅器同步。

2) 加入错题分析（stage2）并沉淀为 `errorReport.ops`
- 目标：错误题产出规范的 `operations`，但暂不合并。
- 要点：
  - 影子笔记构造逻辑可前置为 `BuildShadowNote` 节点；
  - LLM 输出做 JSON 结构校验（缺字段自动重试）。

3) 批处理与合并（stage4）
- 目标：`batchSize` 并行运行 `QuestionGraph`，把收集到的 `ops[]` 交给 `MergeOps`（LLM 节点），得到最终 `operations` 计划。
- 要点：
  - 并行子图 + 收敛节点；
  - 生成新版本号、快照前后置钩子保留到 Dexie。

4) 应用修改与版本化（ApplyOps + Snapshot）
- 目标：把合并后的 `operations` 透过纯函数（现有 `笔记操作函数`）作用到 `notebook`，产出新版本并保存快照。
- 要点：
  - `ApplyOps` 为纯业务节点；`Snapshot` 写 `qtBookBackups`；
  - 失败回滚策略（保留前版本并提供 UI 回退）。

5) 顶层循环接管（TrainLoopGraph）
- 目标：把 `SWOT` 里“选择可训练集合/批处理/终止条件/暂停点”的控制权迁移到 Graph 层，实现“可恢复/可回放”。
- 要点：
  - 以 `SelectQuestions` 节点输出 batch 队列；
  - `PauseGate`/`AbortGate` 条件节点在批间检查；
  - 结束条件（全对/阈值）集中在 `DecideNext` 节点。

6) 配置与提示词管理
- 目标：将 PromptTemplates 与 supplierForm 纳入 Graph State 或注入节点 runtime context，统一被 LLM 节点消费。
- 要点：
  - 保持 UI 面板不变，保存后触发 Graph State 更新（Checkpointer 同步）。

7) 观测与日志
- 目标：对每个 LLM 节点自动记录输入/输出摘要与 token 统计；错误重试链路可视化。
- 要点：
  - 接入 LangGraph/LangSmith Tracing（或自研简单事件总线与 Dexie 记录）。


## 八、与现状的接口与数据对齐
- Dexie 存储保留：
  - `trainer/questions/promptTemplates/uiData/supplierForm` 仍存 `kvs`；
  - `chatRecords`、`qtBookBackups` 继续沿用，Graph 侧在关键节点写入。
- UI 组件保持现状：
  - `TrainingControlPanel/AccuracyPanel/NoteHistoryPanel/NotebookEditor/QuestionCard` 通过一个统一的“Graph 状态读取器”获取数据；
  - 进度更新通过事件/可观察流（例如把 LangGraph 运行事件转为 RxJS 或自定义事件）映射到 Vue。
- 提示词与标记替换：
  - 在 LLM 节点进入前做 `replaceTemplateTokens`，支持自定义标记（保持与现有一致）。


## 九、风险与对策
- 浏览器环境的并发/速率限制：需要在 LLM 调用层做队列与节流，并为不同供应商设置 QPS/并发上限。
- JSON 结构化输出脆弱：引入模式校验 + 自愈重试；必要时采用“先自然语言→再结构化抽取”的两段式。
- 长上下文与成本：影子笔记策略继续保留；合并前可做局部去重/摘要。
- 状态一致性：Checkpointer 与 Dexie 双写要有幂等与事务边界（至少保证“可回放到一致点”）。
- 学习曲线：先小步落地（单题闭环→批→合并→顶层循环），控制影响面。


## 十、里程碑与验收
- M1（单题闭环）：
  - 完成 QuestionGraph；UI 可看到“判题→解题→评判”的实时过程；
  - 验收：10 题以内运行稳定，错误输出自动重试成功率>90%。
- M2（错题分析）：
  - 加入 stage2 节点并产出 ops；
  - 验收：至少 5 种错误场景能生成合理 ops；
- M3（批处理与合并）：
  - 并行批处理与 stage4 合并；
  - 验收：与当前实现对比，合并计划语义一致，重复率下降；
- M4（应用与版本化）：
  - 应用 ops 并快照；
  - 验收：版本回退可用，冲突可识别与提示；
- M5（顶层循环接管与暂停/恢复）：
  - TrainLoopGraph 接管，提供“断点-续跑”；
  - 验收：在任意批次暂停→恢复一致。


## 十一、投入评估（粗略）
- 研发：3–5 周（1 名熟悉当前代码的工程师 + 1 名熟悉 LangGraph 的工程师，交叉配合），视并发/观测/容错深度而定。
- 风险缓冲：预留 1–2 周用于 JSON 结构稳定性与供应商限流策略打磨。


## 十二、附：现有关键文件与职责映射

- `src/views/appViews/AITrainingSystem/AITrainingSystem.ts`: 组合 UI 容器，装配训练器、数据加载与各面板。
- `src/views/appViews/AITrainingSystem/swot-trainer.ts`: 训练核心控制流与统计、版本化与回滚、单题与批处理流程。
- `src/views/appViews/AITrainingSystem/solver.ts`: 各 stage 提示词与输入生成、笔记操作函数、标记替换与处理包装器。
- `src/views/appViews/AITrainingSystem/swot-db-functions.ts`: Dexie 存储、快照与记录、性能与批处理工具。
- `src/views/appViews/AITrainingSystem/types.ts`: 训练选项/状态/题目/枚举类型等。

## 十三、LangGraph 节点/边/状态 细颗粒度设计草案（完整项目）

下述设计覆盖完整项目（非仅 MVP），按“顶层循环 → 批 → 单题 → 笔记合并/应用”四层展开，并给出关键状态结构与条件边。

### 13.1 顶层循环子图（TrainLoopGraph）
- 节点
  - InitAndLoad: 载入 options、supplierForm、promptTemplates、notebook、quStateDict、quDataDict；恢复 Checkpoint。
  - SelectQuestions: 选择“可训练集合”（非简题、未跳过、未达最大验证/确证的题）。
  - CheckStop: 终止条件判断（达到 maxLoopCount、集合为空且 versionCertifyCount 达标等）。
  - PrepareBatchQueue: 基于 batchSize 生成批队列（ids[] 分批）。
  - ProcessNextBatch: 调用 BatchGraph 处理当前批；返回批结果（allCorrect, opsCollected, wrongIds 等）。
  - UpdateCounters: 根据批结果更新 versionCount/totalCount/versionCertifyCount 等计数器。
  - DecideNext: 若还有批则回到 ProcessNextBatch；若批处理完则进入下一轮或结束。
  - PauseGate: 若用户请求暂停（PREPARING_PAUSE），在批与批之间挂起并记录断点。
  - AbortGate: 若用户请求中止（ABORTING），记录断点并退出到 Abort。
  - Finish: 正常结束（ENDED），写入收尾快照与事件。
  - Abort: 异常/用户中止（ABORTED），写入收尾快照与事件。
  - SaveCheckpoint: 在关键边（选题完成、批结果回填、计数更新后）保存检查点，支持回放与断点续跑。
- 条件边
  - InitAndLoad → SelectQuestions（成功）/Abort（加载失败）。
  - SelectQuestions → CheckStop。
  - CheckStop → Finish（满足结束）/PrepareBatchQueue（继续）。
  - PrepareBatchQueue → ProcessNextBatch。
  - ProcessNextBatch → UpdateCounters。
  - UpdateCounters → PauseGate → AbortGate → DecideNext。
  - DecideNext → ProcessNextBatch（还有批）/SelectQuestions（下一轮）/Finish（全部完成）。

### 13.2 批处理子图（BatchGraph）
- 节点
  - BuildBatch: 从输入 ids[] 构建批上下文。
  - ParallelQuestionGraphs: 对每个 id 并行运行 QuestionGraph（并发受 RateLimiter 控制）。
  - CollectResults: 汇总 per-question 的 judge/answer/errorReport、正误统计、wrongIds。
  - ExtractOps: 从所有错误结果中提取 ops[] 列表（每题 errorReport.ops）。
  - DecideApply: 若 practiceOnlyMode 为 false 且存在错误，则输出 opsCollected；否则输出空。
  - SaveBatchTrace: 记录批级日志摘要（可写 chatRecords）。
- 条件边
  - BuildBatch → ParallelQuestionGraphs → CollectResults → ExtractOps → DecideApply → 返回上层。

### 13.3 单题子图（QuestionGraph）
- 节点
  - BuildJudgeInput: 由 qtBook.entries + question 构建 stage0 输入。
  - Classify(LLM): stage0，输出 { matched, name }。
  - ParseClassify: JSON 校验与兜底（失败重试 / 回退策略：若未匹配，则进入 AnswerWithoutNote）。
  - FetchNote: 从 notebook.entries 取 name 匹配的 note（无匹配则记警告）。
  - BuildAnswerInput: 由 note + question 构建 stage1 输入（若无 note 则降级为自解）。
  - Answer(LLM): stage1，输出 { plan, analyzes[], answer, didFollow, ... }。
  - ParseAnswer: JSON 校验与兜底（失败重试 / 自解降级）。
  - JudgeRule: 比较标准答案与输出（字符串 + JSON.stringify 双通道），产出 correct|wrong。
  - OnCorrect: 更新 per-question 计数（trained/correct），评估是否触发 isSimpleV/T。
  - BuildShadowNote: 构建影子笔记（该题型完整，其它降采样为 name/desc/clue）。
  - AnalyzeWrong(LLM): stage2，输出 { operations: [] } 笔记修改计划。
  - ParseOps: JSON 校验与去重、必要时重试。
- 条件边
  - BuildJudgeInput → Classify → ParseClassify → [matched?]
    - true → FetchNote → BuildAnswerInput → Answer → ParseAnswer → JudgeRule → [correct?]
      - true → OnCorrect → 返回（无 ops）
      - false → BuildShadowNote → AnalyzeWrong → ParseOps → 返回（含 ops）
    - false → BuildAnswerInput（无 note 模式）→ Answer → ParseAnswer → JudgeRule → 分支同上

### 13.4 笔记合并/应用子图（NotebookGraph）
- 节点
  - SnapshotBefore: 记录当前 notebook 版本快照（qtBookBackups）。
  - NewVersion: 生成新版本 ID，清理版本内计数（与现状一致）。
  - MergeOps(LLM): stage4，对多题 ops 做语义合并、去重与风格统一。
  - ParseMergedOps: JSON 校验与冲突探测（如 DELETE 与 MODIFY 冲突、索引错位等）。
  - ApplyOps(Pure): 通过笔记操作函数将 operations 应用到 notebook（纯函数，便于可测与回滚）。
  - SnapshotAfter: 记录新版本快照（qtBookBackups）。
  - EmitEvents: 发出成功/失败事件（Toast、声音）。
  - RollbackOnFailure: 任一失败时回滚到 SnapshotBefore，并记录失败原因。
- 条件边
  - SnapshotBefore → NewVersion → MergeOps → ParseMergedOps → ApplyOps → SnapshotAfter → EmitEvents
  - 任一点失败 → RollbackOnFailure → 返回错误状态

### 13.5 通用支撑节点
- InvokeLLM: 统一封装供应商/模型选择、重试策略、超时、速率限制、结构化输出校验（结合 JSON Schema）。
- CheckpointAdapter: 对接 IndexedDB（或 KV）作为 Checkpointer 存储，支持按图/批/题维度打点。
- RateLimiter: 按供应商/模型配置 QPS/并发（supplierForm 派生）。
- LogSink: 把简化数据写入 chatRecords（精简 spans），与现有 swot-db-functions 能力对齐。

### 13.6 Graph State 核心结构（建议）
- global（全局）
  - options, supplierForm, promptTemplates
  - notebook: QTBook, notebookVersion
  - quStateDict, quDataDict
  - counters: totalCount, versionCount, versionCertifyCount
  - control: trainingState, pauseRequested, abortRequested, lastBatchIndex
- batch（批级上下文）
  - batchIds: string[]
  - perQuestion: { [id]: { judgeOutput, answerOutput, isCorrect, errorReport?: { operations: [] } } }
  - opsCollected: operations[]
  - stats: { allCorrect, allBugs }
- question（题级临时）
  - inputs/outputs：各 stage 的输入/输出摘要（便于追踪与复用）
- checkpoint
  - markers: 在“选题完成”、“批结果回填”、“新版本生成与应用后”等关键点保存

### 13.7 失败与恢复策略（要点）
- LLM 超时/结构化失败：自动重试（指数退避，限最大次数），失败则降级为更保守策略（如无 note 自解）。
- 合并冲突：保守拒绝并回滚，提示人工介入。
- 中止/暂停：只在批间响应，保证幂等；恢复时从最近检查点继续。

## 十四、“现有 UI 不变、底层替换为 Graph 执行器”的集成点清单

以下按主要界面与模块罗列替换点，尽量保持 UI/props/事件不变，仅更换数据来源与动作落点。

### 14.1 顶层容器（AITrainingSystem.ts）
- Trainer 实例替换：
  - 保留 `appData.trainer` 外观接口（start/pause/resume/abort/getTrainingStateText/updatePromptTemplates 等），内部由 GraphRuntime 代理到 Graph。
  - `signalFn` 与声音提示：Graph 事件总线 → Toast/音效；确保事件语义与现有一致。
- 本地存储：
  - `kvs` 键（trainer/questions/promptTemplates/uiData/supplierForm）继续沿用；Graph 的 Checkpointer 采用独立命名空间，避免冲突。
- 生命周期：
  - onMounted：从 kvs 恢复 supplierForm/uiData/promptTemplates；初始化 GraphRuntime；装载题库并触发一次 SelectQuestions。
  - onUnmounted：触发 SaveCheckpoint 与 kvs 保存（与现状一致）。

### 14.2 TrainingControlPanel
- 读：`trainer.options`、`trainer.state`、`trainingStateText`。
- 写：`onUpdate:options` 映射到 Graph 的 options 更新；start/pause/resume/abort → GraphRuntime 控制 API；
- 进度：Graph 事件（batch 开始/结束、pause-ready）转为 UI 可观察数据。

### 14.3 AccuracyPanel
- 读：Graph State 的 counters 与 quStateDict 聚合统计；
- 保持现有 props 结构，底层由选择器从 Graph State 派生。

### 14.4 QuestionCard 列表
- 读：`quEntries`（从既有题库）与 `quDataDict/quStateDict`（Graph State 映射）；
- 写：错误分析触发（UI Demo）可映射到 QuestionGraph 单次运行（可选）。

### 14.5 NotebookEditor / CurrentNotePanel / NoteHistoryPanel
- 读写：
  - 编辑器更新：写入 Graph State 的 notebook，触发 NewVersion/快照仍由 NotebookGraph 负责；
  - 历史版本：继续读 `qtBookBackups`，但版本生成/保存由 NotebookGraph 统一触发；
  - 保存动作：触发 NotebookGraph 的 Snapshot（手动保存场景）。

### 14.6 PromptTemplatesPanel
- 读写：保持现状保存到 kvs；同时调用 GraphRuntime 的 `updatePromptTemplates` 将模板注入各 LLM 节点上下文。

### 14.7 AIModelConfigPanel
- 读写：supplierForm 仍存 kvs；GraphRuntime 订阅 supplierForm 变化，更新 RateLimiter 与模型路由。

### 14.8 ChatRecordsPanel / StorageInfoPanel
- ChatRecords：LogSink 继续写 `chatRecords`（精简 spans），UI 无需变更。
- Storage：StorageInfoPanel 无需变更；可选新增 Checkpointer 存储估算展示。

### 14.9 导入/导出与兼容
- 导出：保留 `exportTrainerData/exportQuestions`；Graph 侧提供 `exportGraphState` 以便并行使用或合并到同一文件。
- 导入：解析旧版 `trainer` JSON → 迁移为 Graph State；确保 `quStateDict/quDataDict/notebook` 与版本号一致。

### 14.10 错误处理与用户反馈
- 统一事件：GraphRuntime → 事件总线（toast/sound）；
- 失败回滚：NotebookGraph 失败 → UI 弹窗提示，并提供“回滚至前版本”操作（调用 RollbackOnFailure 结果）。

### 14.11 测试与调试
- 提供“单题运行/单批运行/整图 Dry-run”开关，用于演示与回归测试；
- 集成 Tracing 视图链接（LangSmith 或自研 logs）到 Debug 面板。


---

完成度与校对说明：本报告基于对上述文件的通读与行为路径梳理而成，聚焦于自然语言描述与架构规划，不包含代码实现。若需要，我可以进一步输出一版“节点/边/状态”的更细粒度设计草案，或在现有 UI 基础上接入一个最小可运行的 LangGraph 单题闭环。