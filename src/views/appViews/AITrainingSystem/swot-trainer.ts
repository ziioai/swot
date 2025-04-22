import _ from "lodash";

// import { nextTick } from "vue";

import { sleep } from "@utils/functions";
import {
  播放叮咚声,
  // 播放咕嘟声,
  // 播放咔哒声,
  // 播放坠落声,
  播放报错声,
  // 播放哐当声,
  // 播放喇叭式胜利音效,
  // 播放随机曲谱,
  // 播放猫叫声,
  // 播放男人说话声,
  // 播放女人说Good声,
  // 播放胜利音效,
  // 播放小星星,
  // 播放电子舞曲,
} from '@utils/soundEffects';

import { TrainingState, TrainingStateText } from './types';
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

  await 循环核心流程(swot, quIds);
}

export async function 循环核心流程(swot: SWOT, quIds: QuestionTrainingState["nnid"][]) {

  const quEntries = quIds.map(id => swot.getQuEntry(id));
  // let allBugs = true;
  // let allCorrect = true;
  // const errorQuIds = [] as QuestionTrainingState["nnid"][];

  // Process questions in batches according to batchSize
  const batchSize = swot.batchSize;
  const errorQuIds = [] as QuestionTrainingState["nnid"][];
  let allBugs = true;
  let allCorrect = true;

  // 预先准备所有批次
  const batches = [] as Array<{
    batchIndex: number,
    entries: QuestionEntry[],
    ids: QuestionTrainingState["nnid"][]
  }>;
  
  for (let i = 0; i < quEntries.length; i += batchSize) {
    batches.push({
      batchIndex: i,
      entries: quEntries.slice(i, i + batchSize),
      ids: quIds.slice(i, i + batchSize)
    });
  }

  // 从上次暂停的位置恢复或从头开始
  const startBatchIndex = swot.trainingState === TrainingState.PAUSED ? (swot.state.lastBatchIndex??0) : 0;

  await swot?.signalFn?.(`循环核心流程 开始，\n有${quEntries.length}题，\n共${batches.length}个批次，\n从批次[${startBatchIndex}]开始`, "info", 2000);

  // Process questions in batches
  for (let batchIdx = startBatchIndex; batchIdx < batches.length; batchIdx++) {
    // 记录当前批次索引，用于恢复
    swot.state.lastBatchIndex = batchIdx;
    // 在每个批次开始前检查是否需要中止
    // await swot?.signalFn?.(`目前状态是${swot.trainingState}`, "info", 2000);
    if ([TrainingState.ABORTING, TrainingState.ABORTED, TrainingState.ENDED].includes(swot.trainingState)) {
      await swot?.signalFn?.(`程序应结束`, "error", 2000);
      swot.abortTraining();
      return;
    }
    // 设置正在处理批次标志
    swot.state.isProcessingBatch = true;
    // 批次处理开始前告知用户
    await swot?.signalFn?.(`批次 [${batchIdx+1} of ${batches.length}] 开始`, "info", 2000);
    const batch = batches[batchIdx];
    const batchEntries = batch.entries;
    const batchIds = batch.ids;

    await Promise.all(batchEntries.map(async (it) => {
      const result = await 试做单个题目(swot, it.nnid);
      return result;
    })).then(results => {
      // 处理结果
      results.forEach(async (result, idx) => {
        const quId = batchIds[idx];
        if (result === 1) {
          allBugs = false;
          await 处理单个对题(swot, quId);
        } else if (result === 0) {
          allBugs = false;
          allCorrect = false;
          await 处理单个错题(swot, quId);
          errorQuIds.push(quId);
        } else if (result === -1) {
          allCorrect = false;
          /** @TODO 可能要完善不知道什么 */
        } else if (result === -2) {
          // 比如中止了
          allCorrect = false;
          /** @TODO 可能要完善不知道什么 */
        }
      });
    }).catch(err => {
      allCorrect = false;
      console.error(err);
    });

    // 设置批次处理完成
    swot.state.isProcessingBatch = false;

    // 批次处理后检查是否需要暂停
    if (swot.trainingState === TrainingState.PREPARING_PAUSE) {
      swot.trainingState = TrainingState.PAUSED;
      swot.signalFn?.("训练已暂停，等待恢复");

      // 记录下一个要处理的批次索引
      swot.state.lastBatchIndex = batchIdx + batchSize;

      // 返回，中断循环，等待resume()调用
      return;
    }

    // 批次处理后检查是否需要中止
    if ((swot.trainingState as TrainingState) === TrainingState.ABORTING) {
      swot.abortTraining();
      return;
    }

    // 正常情况下批次之间的延迟
    if (batchIdx < batches.length && swot.trainingState === TrainingState.RUNNING) {
      await sleep(1000);
    }

  }


  // 是否全都故障了
  if (allBugs) { swot.end("bugs"); return; }

  // 是否全对
  if (allCorrect) { swot.state.versionCertifyCount = (swot.state.versionCertifyCount ?? 0) + 1; }

  for (const errorQuId of errorQuIds) {
    await 为单个错题更新笔记(swot, errorQuId);
  }

  swot.state.totalCount = (swot.state.totalCount ?? 0) + 1;

  // nextTick(async() => {
    await 循环总流程(swot);
  // });
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

  // await swot?.signalFn?.("试做单个题目");
  await sleep(200);

  const quEntry = swot.getQuEntry(quId);
  if (!quEntry) { return -1; }

  if (swot.state.quStateDict?.[quId]==null) { swot.state.quStateDict[quId] = { nnid: quId }; }
  const quState = swot.state.quStateDict[quId];

  try {

    /** @TODO 做题 */
    // 这是一项既耗时间又耗资源的操作，且一旦中断便无法恢复

    播放叮咚声();
    return 1;
  } catch (err) {
    播放报错声();
    console.log({ quEntry, quState });
    console.error(err);
    return -1;
  }
}


export async function 处理单个对题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  await swot?.signalFn?.(`处理单个对题 ${quId}`);
  await sleep(200);
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

export async function 处理单个错题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  await swot?.signalFn?.(`处理单个错题 ${quId}`);
  await sleep(200);

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






export const defaultOptions: SWOTOptions = {
  batchSize: 5,               // 每次并行的题目数量
  maxLoopCount: 30,           // 最大循环次数
  maxVerifyCount: 20,         // 最大验证次数
  maxCertifyCount: 2,         // 最大确证次数
  versionSimpleThreshold: 2,  // 版本简单阈值
  totalSimpleThreshold: 4,    // 总体简单阈值
  versionSkipThreshold: 5,    // 版本难题阈值
  totalSkipThreshold: 10,     // 总体难题阈值
};
export const defaultState: SWOTState = {
  quCount: 0,              // 题目数量

  totalCount: 0,           // 总体做题次数
  versionCount: 0,         // 版本做题次数
  versionCertifyCount: 0,  // 版本确证次数
  quStateDict: {},         // 题目状态字典
  notebook: {},            // 笔记本
  notebookVersion: "",     // 笔记本版本

  ended: false,   // 是否结束
  endReason: "",  // 结束原因
  endTime: "",    // 结束时间
  startTime: "",  // 开始时间

  isProcessingBatch: false,  // 是否正在处理批次
  lastBatchIndex: 0,         // 上一个批次的索引
};


export class SWOT {
  _options: SWOTOptions = _.cloneDeep(defaultOptions);
  get options() { return this._options; }

  // 训练状态相关属性
  trainingState: TrainingState = TrainingState.IDLE;  // 当前训练状态

  get batchSize() { return this._options.batchSize??5; }
  get maxLoopCount() { return this._options.maxLoopCount??30; }
  get maxVerifyCount() { return this._options.maxVerifyCount??20; }
  get maxCertifyCount() { return this._options.maxCertifyCount??2; }
  get versionSimpleThreshold() { return this._options.versionSimpleThreshold??2; }
  get totalSimpleThreshold() { return this._options.totalSimpleThreshold??4; }
  get versionSkipThreshold() { return this._options.versionSkipThreshold??5; }
  get totalSkipThreshold() { return this._options.totalSkipThreshold??10; }


  isSWOT: boolean = true;

  signalFn?: any;

  state: SWOTState = {
    quStateDict: {},
    notebook: {},
    notebookVersion: "",
  };

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





  constructor(options?: SWOTOptions) {
    this.loadOptions(options);
    this.resetState();
  }

  resetOptions() { this._options = _.cloneDeep(defaultOptions) ?? {}; }
  assignOptions(options?: SWOTOptions) { Object.assign(this._options, options??{}); }
  loadOptions(options?: SWOTOptions) {
    this.resetOptions();
    this.assignOptions(options);
  }

  resetState() {
    this.state = _.cloneDeep(defaultState) ?? {};
    this.state.quCount = this.quEntries.length;
    this.loadQuEntries(this.quEntries, true);
  }
  assignState(state?: SWOTState) { Object.assign(this.state, state??{}); }
  loadState(state: SWOTState) {
    this.resetState();
    this.assignState(state);
  }

  resetQuEntries() { this.quDict = {}; }
  loadQuEntries(questions: QuestionEntry[], refreshState = false) {
    this.resetQuEntries();
    this.state = _.cloneDeep(defaultState) ?? {};
    if (this.state.quStateDict==null) { this.state.quStateDict = {}; }
    this.state.quCount = questions.length;
    for (const question of questions) {
      const quId = question.nnid;
      this.quDict[quId] = question;
      if (refreshState || this.state.quStateDict[quId] == null) {
        this.state.quStateDict[quId] = { nnid: quId, };
      }
    }

    if (refreshState) {
      // ???
      this.state.totalCount = 0;
      this.state.versionCount = 0;
      this.state.versionCertifyCount = 0;
      // this.state.quStateDict = {};
      // ???
    }
  }
  toJSON(withQuEntries = false) {
    return {
      _options: this._options,
      quEntries: withQuEntries ? this.quEntries : [],
      state: this.state,
    };
  }
  fromJSON(json: any, falseRefreshState = false) {
    this.loadOptions(json._options);
    this.loadState(json.state);
    let refreshState = false;
    if (this.state.quStateDict == null) {
      this.state.quStateDict = {};
      refreshState = true;
    }
    this.loadQuEntries(json.quEntries, falseRefreshState||refreshState);
  }



  async start() {
    // 只有在空闲、已结束或已中止状态下才能开始训练
    if (this.trainingState === TrainingState.IDLE || this.trainingState === TrainingState.ENDED || this.trainingState === TrainingState.ABORTED) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("开始训练");
      await this.restart();
    }
  }

  async restart() {
    this.resetStateManually();
    this.state.startTime = new Date().toISOString();
    this.trainingState = TrainingState.RUNNING;
    await this.continue();
  }

  async resetStateManually() {
    this.resetState();
    this.state.quCount = this.quEntries.length;
    this.state.ended = false;
    this.state.lastBatchIndex = 0;
    this.state.startTime = "";
    this.state.totalCount = 0;
    this.state.versionCount = 0;
    this.state.versionCertifyCount = 0;
    this.state.isProcessingBatch = false;
  }

  async continue() {
    // 如果已经结束或中止则不再继续
    if (this.trainingState === TrainingState.ENDED || this.trainingState === TrainingState.ABORTED) {
      this.signalFn?.("训练已结束，无法继续");
      return;
    }
    
    // 如果从暂停状态恢复，使用保存的批次位置继续
    if (this.trainingState === TrainingState.PAUSED) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("从暂停状态恢复训练");
    }
    
    await 循环总流程(this);
  }

  // 请求暂停训练
  requestPause() {
    if (this.trainingState === TrainingState.RUNNING) {
      this.trainingState = TrainingState.PREPARING_PAUSE;
      this.signalFn?.("准备暂停训练，等待当前批次完成...");
      return true;
    }
    return false;
  }

  // 取消暂停请求
  cancelPauseRequest() {
    if (this.trainingState === TrainingState.PREPARING_PAUSE) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("已取消暂停请求，继续训练");
      return true;
    }
    return false;
  }

  // 恢复训练
  resume() {
    if (this.trainingState === TrainingState.PAUSED) {
      this.signalFn?.("恢复训练");
      this.continue();
      return true;
    }
    return false;
  }

  // 请求中止训练
  requestAbort(reason: string = "用户请求中止") {
    if (this.trainingState === TrainingState.RUNNING || this.trainingState === TrainingState.PAUSED || this.trainingState === TrainingState.PREPARING_PAUSE) {
      this.trainingState = TrainingState.ABORTING;
      this.signalFn?.(`请求中止训练: ${reason}`);
      if (!this.state.isProcessingBatch) {
        // 如果当前不在处理批次中，直接完成中止
        this.abortTraining();
      }
      return true;
    }
    return false;
  }

  // 完成训练（正常结束）
  finishTraining(reason?: string) {
    this.trainingState = TrainingState.ENDED;
    this.end(reason || "训练完成");
  }

  // 中止训练（异常结束）
  abortTraining(reason?: string) {
    this.trainingState = TrainingState.ABORTED;
    this.end(reason || "训练中止");
  }

  // 获取当前训练状态文本
  getTrainingStateText(): TrainingStateText {
    switch (this.trainingState) {
      case TrainingState.IDLE: return "未开始";
      case TrainingState.RUNNING: return "训练中";
      case TrainingState.PREPARING_PAUSE: return "准备暂停";
      case TrainingState.PAUSED: return "已暂停";
      // case TrainingState.ENDING: return "结束中";
      // case TrainingState.ABORTING: return "中止中";
      case TrainingState.ENDED: return "已结束";
      case TrainingState.ABORTED: return "已中止";
      default: return "未知状态";
    }
  }

  end(reason?: string) {
    if (this.trainingState === TrainingState.ABORTING) {
      // 如果是中止状态，记录为中止
      this.state.ended = true;
      this.state.endReason = reason || "训练中止";
      this.state.endTime = new Date().toISOString();
      this.signalFn?.(`训练已中止: ${this.state.endReason}`);
      this.trainingState = TrainingState.ABORTED;
    } else {
      // 否则记录为正常结束
      this.state.ended = true;
      this.state.endReason = reason;
      this.state.endTime = new Date().toISOString();
      this.signalFn?.(`训练已结束: ${this.state.endReason}`);
      this.trainingState = TrainingState.ENDED;
    }
  }

  async reset() {
    this.resetStateManually();
    this.trainingState = TrainingState.IDLE;
  }

};

