
export interface SWOTOptions {
  batchSize?: number;               // 每次并行的题目数量

  maxLoopCount?: number;            // 最大循环次数 : 循环已经进行了 xx 次，就结束吧
  maxVerifyCount?: number;          // 最大验证次数 : 每道题最多做多少次
  maxCertifyCount?: number;         // 最大确证次数 : 在版本中所有未跳过的非简单题都做对了 xx 次，就结束吧

  versionSimpleThreshold?: number;  // 版本简单阈值 : 某题在版本中每次都做对且达 xx 次，则标记为【版本简单题】
  totalSimpleThreshold?: number;    // 总体简单阈值 : 某题在全程中每次都做对且达 xx 次，则标记为【总体简单题】
  versionSkipThreshold?: number;    // 版本难题阈值 : 某题在版本中累计做错 xx 次，则标记为【版本跳过题】
  totalSkipThreshold?: number;      // 总体难题阈值 : 某题在全程中累计做出 xx 次，则标记为【总体跳过题】
};
export interface SWOTState {
  quCount?: number;              // 题目数量

  /** @TODO 下面这几个定义有误解 */
  totalCount?: number;           // 总体做题次数
  versionCount?: number;         // 版本做题次数
  versionCertifyCount?: number;  // 版本确证次数

  quStateDict: Record<QuestionTrainingState["nnid"], QuestionTrainingState>;  // 题目状态字典
  quDataDict: Record<QuestionTrainingState["nnid"], any>;  // 题目临时数据字典

  notebook: {entries: any[]};  // 笔记本
  notebookVersion: string;  // 笔记本版本

  ended?: boolean;     // 是否结束
  endReason?: string;  // 结束原因
  endTime?: string;    // 结束时间
  startTime?: string;  // 开始时间

  isProcessingBatch?: boolean;  // 是否正在处理批次
  lastBatchIndex?: number;      // 上一个批次的索引
};
export interface QuestionEntry {
  nnid: string;     // 题目的唯一标识符
  content: any;  // 题目的内容
  answer: string;   // 题目的答案
  explain?: any;  // 题目的解释
}
export interface QuestionTrainingState {
  nnid: string;            // 题目的唯一标识符
  trainedCountV?: number;  // 训练次数（版本）
  trainedCountT?: number;  // 训练次数（总体）
  correctCountV?: number;  // 正确次数（版本）
  correctCountT?: number;  // 正确次数（总体）
  errorCountV?: number;    // 错误次数（版本）
  errorCountT?: number;    // 错误次数（总体）
  isSimpleV?: boolean;     // 是否是简单题（版本）
  isSimpleT?: boolean;     // 是否是简单题（总体）
  isSkipV?: boolean;       // 是否是难题（版本）
  isSkipT?: boolean;       // 是否是难题（总体）
  stateText: QuStateText;  // 题目状态文本
}

/**
 * 训练状态枚举
 */
export enum TrainingState {
  IDLE,             // 空闲状态，未开始训练
  RUNNING,          // 正常运行中
  PREPARING_PAUSE,  // 准备暂停（用户已请求暂停，但当前批次仍在处理）
  PAUSED,           // 已暂停状态
  ABORTING,         // 中止中（用户主动中止或发生错误）
  ABORTED,          // 已经中止
  // ENDING,           // 正常结束中（完成所有训练目标）
  ENDED,            // 已经结束
}

export type TrainingStateText =
"未开始" |
"训练中" |
"准备暂停" |
"已暂停" |
"中止中" |
"已中止" |
// "结束中" |
"已结束" |
"未知状态";

export type QuStateText = 
"预备" |
"中断" |
"报错" |
"判断题型中" |
"做题中" |
"正确" |
"错误分析中" |
"错误已分析" |
"太简单已跳过" |
"太困难已跳过" |
"练够了已跳过" |
"验够了已跳过";
