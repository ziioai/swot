
export const 思路 = `
- O 是否达到最大循环次数
  - 达到：结束训练
  - 未达到：
    - 所有【未跳过、非简单、未达最大验证次数】是否为空集合
      - 是：结束训练
      - 否：继续执行核心流程
    - 核心流程 并行做所有【未跳过、非简单、未达最大验证次数】的题
      - 是否全都故障了
        - 是：被迫结束训练
        - 否：继续
      - 对于每道做对的题
        - 此题版本练习次数+=1
        - 此题总练习次数+=1
        - 此题版本正确次数+=1
        - 此题总正确次数+=1
        - 如果「此题版本练习次数=此题版本正确次数 >= 版本简单阈值」则标记为【版本简单题】
        - 如果「此题总练习次数=此题总正确次数 >= 总简单阈值」则标记为【总简单题】
      - 对于每道做错的题
        - 此题版本错误次数+=1
          - 如果达到版本难题阈值，则标记为【版本跳过题】
        - 此题总错误次数+=1
          - 如果达到总体难题阈值，则标记为【总体跳过题】
      - 是否全对
        - 全对：版本确证次数+=1
        - 非全对：不增加确证次数
      - 对于每道做错的题
        - 更新笔记
      - 总循环次数+=1
      - 返回 O 继续下一轮循环
`.trim();

export async function 循环总流程(swot: SWOT) {
  const totalCount = swot.state.totalCount ?? 0;
  const maxLoopCount = swot.maxLoopCount;

  // 是否达到最大循环次数
  if (totalCount >= maxLoopCount) { swot.end("maxLoopCount reached"); return; }

  // 所有【未跳过、非简单、未达最大验证次数】的题
  const questionStates = Object.values(swot.state.quStateDict ?? {}).filter(it => {
    if (it.isSkipV || it.isSkipT || it.isSimpleV || it.isSimpleT) return false;
    if (it.trainedCountV ?? 0 >= swot.maxVerifyCount) return false;
    return true;
  });

  // 是否都达到最大验证次数或最大确证次数
  if (!questionStates.length) { swot.end("all questions reached max verify/certify count"); return; }

  const quIds = questionStates.map(it => it.nnid);

  循环核心流程(swot, quIds);
}

export async function 循环核心流程(swot: SWOT, quIds: QuestionTrainingState["nnid"][]) {
  const quEntries = quIds.map(id => swot.getQuEntry(id));
  let allBugs = true;
  let allCorrect = true;
  const errorQuIds = [] as QuestionTrainingState["nnid"][];
  await Promise.all(quEntries.map(it => {
    return 试做单个题目(swot, it.nnid);
  })).then(results => {
    // 处理结果
    results.forEach(async (result, idx) => {
      const quId = quIds[idx];
      if (result === 1) {
        allBugs = false;
        处理单个对题(swot, quId);
      } else if (result === 0) {
        allBugs = false;
        allCorrect = false;
        处理单个错题(swot, quId);
        errorQuIds.push(quId);
      }
    });
  }).catch(err => {
    allCorrect = false;
    console.error(err);
  });

  // 是否全都故障了
  if (allBugs) { swot.end("bugs"); return; }

  // 是否全对
  if (allCorrect) { swot.state.versionCertifyCount = (swot.state.versionCertifyCount ?? 0) + 1; }

  for (const errorQuId of errorQuIds) {
    await 为单个错题更新笔记(swot, errorQuId);
  }

  swot.state.totalCount = (swot.state.totalCount ?? 0) + 1;
}


export async function 为单个错题更新笔记(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const quEntry = swot.getQuEntry(quId);
  if (!quEntry) { return -1; }

  if (swot.state.quStateDict?.[quId]==null) { swot.state.quStateDict[quId] = { nnid: quId }; }
  const quState = swot.state.quStateDict[quId];

  try {

    /** @TODO 更新笔记 */

    return 1;
  } catch (err) {
    console.log({ quEntry, quState });
    console.error(err);
    return -1;
  }
}


export async function 试做单个题目(swot: SWOT, quId: QuestionTrainingState["nnid"]): Promise<-1|0|1> {
  const quEntry = swot.getQuEntry(quId);
  if (!quEntry) { return -1; }

  if (swot.state.quStateDict?.[quId]==null) { swot.state.quStateDict[quId] = { nnid: quId }; }
  const quState = swot.state.quStateDict[quId];

  try {

    /** @TODO 做题 */

    return 1;
  } catch (err) {
    console.log({ quEntry, quState });
    console.error(err);
    return -1;
  }
}


export function 处理单个对题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const found = swot.state.quStateDict?.[quId];
  if (!found) return;
  found.trainedCountV = (found.trainedCountV ?? 0) + 1;
  found.trainedCountT = (found.trainedCountT ?? 0) + 1;
  found.correctCountV = (found.correctCountV ?? 0) + 1;
  found.correctCountT = (found.correctCountT ?? 0) + 1;
  if (found.trainedCountV === found.correctCountV) {
    found.isSimpleV = found.trainedCountV >= swot.versionSimpleThreshold;
  }
  if (found.trainedCountT === found.correctCountT) {
    found.isSimpleT = found.trainedCountT >= swot.totalSimpleThreshold;
  }
}

export function 处理单个错题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const found = swot.state.quStateDict?.[quId];
  if (!found) return;
  found.errorCountV = (found.errorCountV ?? 0) + 1;
  found.errorCountT = (found.errorCountT ?? 0) + 1;
  if (found.errorCountV >= swot.versionSkipThreshold) {
    found.isSkipV = true;
  }
  if (found.errorCountT >= swot.totalSkipThreshold) {
    found.isSkipT = true;
  }
}







export interface SWOTOptions {
  maxLoopCount?: number;            // 最大循环次数：循环已经进行了 xx 次，就结束吧
  maxVerifyCount?: number;          // 最大验证次数：在版本中所有未跳过的非简单题都做了 xx 次，还没做对，就结束吧
  maxCertifyCount?: number;         // 最大确证次数：在版本中所有未跳过的非简单题都做对了 xx 次，就结束吧
  versionSimpleThreshold?: number;  // 版本简单阈值：某题在版本中每次都做对且达 xx 次，则标记为【版本简单题】
  totalSimpleThreshold?: number;    // 总体简单阈值：某题在全程中每次都做对且达 xx 次，则标记为【总体简单题】
  versionSkipThreshold?: number;    // 版本难题阈值：某题在版本中累计做错 xx 次，则标记为【版本跳过题】
  totalSkipThreshold?: number;      // 总体难题阈值：某题在全程中累计做出 xx 次，则标记为【总体跳过题】
};
export interface SWOTState {
  totalCount?: number;           // 总体循环次数
  versionCount?: number;         // 版本循环次数
  versionCertifyCount?: number;  // 版本确证次数
  quStateDict: Record<QuestionTrainingState["nnid"], QuestionTrainingState>;  // 题目状态字典

  ended?: boolean;  // 是否结束
  endReason?: string;  // 结束原因
  endTime?: string;  // 结束时间
  startTime?: string;  // 开始时间
};
export interface QuestionEntry {
  nnid: string;     // 题目的唯一标识符
  content: string;  // 题目的内容
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

export class SWOT {
  maxLoopCount: number = 30;           // 最大循环次数
  maxVerifyCount: number = 20;         // 最大验证次数
  maxCertifyCount: number = 2;         // 最大确证次数
  versionSimpleThreshold: number = 2;  // 版本简单阈值
  totalSimpleThreshold: number = 4;    // 总体简单阈值
  versionSkipThreshold: number = 5;    // 版本难题阈值
  totalSkipThreshold: number = 10;     // 总体难题阈值

  state: SWOTState = { quStateDict: {} };

  quDict: Record<QuestionTrainingState["nnid"], QuestionEntry> = {};
  get quEntries() {
    return Object.values(this.quDict);
  }
  getQuEntry(id: QuestionTrainingState["nnid"]) {
    return this.quDict[id];
  }
  getQu(id: QuestionTrainingState["nnid"]) {
    return this.getQuEntry(id);
  }
  getQuState(id: QuestionTrainingState["nnid"]) {
    return this.state.quStateDict?.[id];
  }

  constructor(options: SWOTOptions) {
    this.loadOptions(options);
  }
  loadOptions(options: SWOTOptions) {
    this.maxLoopCount = options?.maxLoopCount ?? this.maxLoopCount;
    this.maxVerifyCount = options?.maxVerifyCount ?? this.maxVerifyCount;
    this.maxCertifyCount = options?.maxCertifyCount ?? this.maxCertifyCount;
    this.versionSimpleThreshold = options?.versionSimpleThreshold ?? this.versionSimpleThreshold;
    this.totalSimpleThreshold = options?.totalSimpleThreshold ?? this.totalSimpleThreshold;
    this.versionSkipThreshold = options?.versionSkipThreshold ?? this.versionSkipThreshold;
    this.totalSkipThreshold = options?.totalSkipThreshold ?? this.totalSkipThreshold;
  }
  loadQuEntries(questions: QuestionEntry[]) {
    this.quDict = {};
    this.state.quStateDict = {};
    for (const question of questions) {
      const quId = question.nnid;
      this.quDict[quId] = question;
      this.state.quStateDict[quId] = {
        nnid: quId,
      };
    }
    this.state.ended = false;
    this.state.startTime = new Date().toISOString();
    this.state.totalCount = 0;
    this.state.versionCount = 0;
    this.state.versionCertifyCount = 0;
    this.state.quStateDict = {};
  }
  async start() {
    this.state.ended = false;
    this.state.startTime = new Date().toISOString();
    this.state.totalCount = 0;
    this.state.versionCount = 0;
    this.state.versionCertifyCount = 0;
    await this.continue();
  }
  async continue() {
    await 循环总流程(this);
  }
  end(reason?: string) {
    this.state.ended = true;
    this.state.endReason = reason;
    this.state.endTime = new Date().toISOString();
    //
  }
};

