
import type {
  QuestionEntry,
  QuestionTrainingState,
  SWOTOptions,
  SWOTState,
} from "./types";

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
    // 这是一项既耗时间又耗资源的操作，且一旦中断便无法恢复

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
    // 这是一项既耗时间又耗资源的操作，且一旦中断便无法恢复

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

