
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

  totalCount?: number;           // 总体做题次数
  versionCount?: number;         // 版本做题次数
  versionCertifyCount?: number;  // 版本确证次数
  quStateDict: Record<QuestionTrainingState["nnid"], QuestionTrainingState>;  // 题目状态字典

  ended?: boolean;     // 是否结束
  endReason?: string;  // 结束原因
  endTime?: string;    // 结束时间
  startTime?: string;  // 开始时间
};
export interface QuestionEntry {
  nnid: string;     // 题目的唯一标识符
  content: any;  // 题目的内容
  answer: string;   // 题目的答案
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
}

export interface NoteVersion {
  version: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionNote {
  nnid: string;
  content: string;
  history: NoteVersion[];
}

export interface QuestionDisplay extends QuestionEntry {
  status: 'processing' | 'simple' | 'active' | 'skipped';
  aiThinking: string;
  errorAnalysis?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  stats?: any;
}