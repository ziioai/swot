
import _ from "lodash";
import { nanoid } from 'nanoid';
import { sleep } from "@utils/functions";
import {
  // saveChatRecord,
  // saveQtBookBackup,
  记录调模型时的数据,
  记录版本笔记数据,
  精简调模型的单纯数据,
} from './swot-db-functions';
import {
  播放叮咚声,
  播放咕嘟声,
  播放咔哒声,
  播放坠落声,
  播放报错声,
  播放哐当声,
  播放喇叭式胜利音效,
  播放随机曲谱,
  播放猫叫声,
  播放男人说话声,
  播放女人说话声,
  播放胜利音效,
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

import {
  stage0_判断题型_Process,
  stage1_根据笔记做题_Process,
  stage2_根据错题修改笔记_Process,
  stage4_合并对笔记的修改_Process,
  笔记操作函数,
  promptVersion,
} from "./solver";


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



export async function 循环总流程(swot: SWOT, afterBatchFn?: any) {
  console.log("循环总流程", swot?.state?.notebook?.entries?.length);

  const totalCount = swot.state.totalCount ?? 0;
  const maxLoopCount = swot.maxLoopCount;

  // 是否达到最大循环次数
  if (totalCount >= maxLoopCount) { swot.end("maxLoopCount reached"); 播放胜利音效(); return; }

  // 所有【未跳过、非简单、未达最大验证次数】的题
  const questionStates = [] as QuestionTrainingState[];
  Object.values(swot.state.quStateDict ?? {}).forEach(it => {
    if (it.isSimpleV || it.isSimpleT) { it.stateText = "太简单已跳过"; return false; }
    if (it.isSkipV || it.isSkipT) { it.stateText = "太困难已跳过"; return false; }
    if ((it.trainedCountT ?? 0) >= swot.maxVerifyCount) { it.stateText = "练够了已跳过"; return false; }
    if ((it.correctCountV ?? 0) >= swot.maxCertifyCount) { it.stateText = "验够了已跳过"; return false; }
    questionStates.push(it);
    return true;
  });

  // 是否都达到最大验证次数或最大确证次数
  if (!questionStates.length) {
    if (swot.state.versionCertifyCount??0 >= swot.maxCertifyCount) {
      swot.end("all questions reached max verify/certify count"); 播放喇叭式胜利音效(); return;
    }
    /** @TODO 否则要再做 但是怎么做 ? 这种情况应该不会发生吧 */
    if (swot.state.versionCertifyCount==null) { swot.state.versionCertifyCount = 0; }
    swot.state.versionCertifyCount += 1;  // ??? 这是干嘛 ???
  }

  // const restMaxTrainedCount = _.max(questionStates.map(it => it.trainedCountT ?? 0)) ?? 0;
  // const restMinTrainedCount = _.min(questionStates.map(it => it.trainedCountT ?? 0)) ?? 0;

  const quIds = questionStates.map(it => it.nnid);

  console.log(swot?.state?.notebook?.entries?.length);

  await 循环核心流程(
    swot,
    quIds,
    // {max: restMaxTrainedCount, min: restMinTrainedCount,},
    afterBatchFn,
  );
}

export async function 循环核心流程(
  swot: SWOT,
  quIds: QuestionTrainingState["nnid"][],
  // {max: restMaxTrainedCount, min: restMinTrainedCount}: { max: number, min: number, },
  afterBatchFn?: any,
) {

  swot.修正做题初始状态();

  /** @TODO 如果有还未更新的笔记 需要更新 */
  await 执行笔记的更新操作(swot);

  const quEntries = quIds.map(id => swot.getQuEntry(id));
  // let allBugs = true;
  // let allCorrect = true;
  // const errorQuIds = [] as QuestionTrainingState["nnid"][];

  // 按照 trainedCountT 从小到大排序
  quEntries.sort((aa, bb) => {
    const aState = swot.getQuState(aa.nnid);
    const bState = swot.getQuState(bb.nnid);
    const aCount = aState.trainedCountT ?? 0;
    const bCount = bState.trainedCountT ?? 0;
    return aCount - bCount;
  });
  quIds = quEntries.map(it => it.nnid);

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

  // // 从上次暂停的位置恢复或从头开始
  // const startBatchIndex = ([
  //   TrainingState.PAUSED,
  //   TrainingState.ABORTED,
  //   TrainingState.RUNNING,
  // ].includes(swot.trainingState))?(swot.state.lastBatchIndex??0):0;
  const startBatchIndex = 0;  /** @TODO 其实就是说这个参数没用了 */

  await swot?.signalFn?.(`循环核心流程 开始，\n有${quEntries.length}题，\n共${batches.length}个批次，\n从批次[${startBatchIndex}]开始`, "info", 10000);

  /** @TODO 代码模块化 */
  // Process questions in batches
  for (let batchIdx = startBatchIndex; batchIdx < batches.length; batchIdx++) {
    const batchErrorQuIds = [] as QuestionTrainingState["nnid"][];
    let batchAllBugs = true;
    let batchAllCorrect = true;

    // 记录当前批次索引，用于恢复
    swot.state.lastBatchIndex = batchIdx;
    // 在每个批次开始前检查是否需要中止
    // await swot?.signalFn?.(`目前状态是${swot.trainingState}`, "info", 2000);
    if (swot.shouldStop) {
      await swot?.signalFn?.(`程序应结束`, "error", 2000);
      swot.abortTraining();
      return;
    }
    // 设置正在处理批次标志
    swot.state.isProcessingBatch = true;
    // 批次处理开始前告知用户
    await swot?.signalFn?.(`批次 [${batchIdx+1} of ${batches.length}] 开始`, "info", 10000);
    const batch = batches[batchIdx];
    const batchEntries = batch.entries;
    const batchIds = batch.ids;

    const quResults = await Promise.all(batchEntries.map(async (it) => {
      const result = await 试做单个题目(swot, it.nnid);
      return result;
    }));
    // const hdResults = 
    await Promise.all(quResults.map(async (result, idx) => {
      const quId = batchIds[idx];
      if (result === 1) {
        allBugs = false;
        batchAllBugs = false;
        await 处理单个对题(swot, quId);
        return;
      } else if (result === 0) {
        allBugs = false;
        batchAllBugs = false;
        allCorrect = false;
        batchAllCorrect = false;
        await 处理单个错题(swot, quId);
        errorQuIds.push(quId);
        batchErrorQuIds.push(quId);
        return;
      } else if (result === -1) {
        allCorrect = false;
        batchAllCorrect = false;
        /** @TODO 可能要完善不知道什么 */
        return;
      } else if (result === -2) {
        // 比如中止了
        allCorrect = false;
        batchAllCorrect = false;
        /** @TODO 可能要完善不知道什么 */
        return;
      }
    }));

    console.log(JSON.parse(JSON.stringify(swot.state)));

    // // 正常情况下批次之间的延迟
    // if (batchIdx < batches.length && swot.trainingState === TrainingState.RUNNING) {
    //   await sleep(200);
    // }

    // 进行笔记的更新 //
    if (!batchAllCorrect && !swot.practiceOnlyMode) {
      try {
        // 保存先前的版本
        const notebook = swot.getNotebook();
        const version = swot.getNotebookVersion();
        await 记录版本笔记数据(notebook, version);
        // 创建新的版本
        const { version: newVersion } = swot.initNewNotebookVersion();

        // for await (const errorQuId of batchErrorQuIds) {
        //   console.log("errorQuId", errorQuId);
        //   await 为单个错题更新笔记(swot, errorQuId);
        // }
        await 合并笔记修改计划并更新笔记(swot, batchErrorQuIds);

        // 保存当前的版本
        await 记录版本笔记数据(swot.getNotebook(), newVersion);
      } catch (err) {
        swot?.signalFn?.(`笔记更新失败`, "error", 2000);
        console.error(err);
        播放报错声();
        swot.state.isProcessingBatch = false;
        swot.abortTraining();
        return;
      }
    } else if (!batchAllCorrect && swot.practiceOnlyMode) {
      await swot?.signalFn?.(`仅做题模式：跳过笔记更新`, "info", 2000);
    }

    await afterBatchFn?.();

    swot.state.isProcessingBatch = false;

    // 批次处理后检查是否需要暂停
    if (swot.trainingState === TrainingState.PREPARING_PAUSE) {
      swot.trainingState = TrainingState.PAUSED;
      swot.signalFn?.("训练已暂停，等待恢复");

      swot.state.lastBatchIndex = batchIdx + 1;

      swot.state.isProcessingBatch = false;

      // 返回，中断循环，等待resume()调用
      return;
    }

    if (swot.shouldStop) {
      await swot?.signalFn?.(`程序应结束`, "error", 2000);
      swot.state.isProcessingBatch = false;
      swot.abortTraining();
      return;
    }

    if (batchAllBugs) { swot.end("batchAllBugs"); 播放随机曲谱(8); 播放报错声(); return; }
  }  // end of batches

  if (allBugs) { swot.end("allBugs"); 播放随机曲谱(8); 播放报错声(); return; }

  // 是否全对
  if (allCorrect) { swot.state.versionCertifyCount = (swot.state.versionCertifyCount ?? 0) + 1; }

  swot.state.totalCount = (swot.state.totalCount ?? 0) + 1;
  swot.state.versionCount = (swot.state.versionCount ?? 0) + 1;
  播放猫叫声();
  await 循环总流程(swot, afterBatchFn);
}  // end of 循环核心流程

export async function 合并笔记修改计划并更新笔记(swot: SWOT, quIds: QuestionTrainingState["nnid"][]) {
  播放男人说话声();
  const opPlans = [] as any[];
  for (const quId of quIds) {
    const quData = swot.getQuData(quId);
    const plan = { operations: quData?.errorReport?.outputData?.operations };
    if (plan) { opPlans.push(plan); }
  }
  if (!opPlans.length) { return -1; }

  try {
    const dataWrap = {
      opPlans: opPlans,
      qtBook: _.cloneDeep(swot.getNotebook()),
    } as any;

    if (opPlans?.length>1) {
      // Use custom prompts if available
      const currentPromptVersion = swot.customPrompts?.promptVersion || promptVersion;
      
      await stage4_合并对笔记的修改_Process(
        dataWrap, 
        swot.supplierForm, 
        () => {
          swot.state.notebookEditPlan = _.pick(dataWrap, ["processing", "thinkingSpans", "outputSpans", "outputData"]);
        },
        swot.customPrompts?.stage4_合并对笔记的修改_prompt,
        swot.customPrompts?.笔记介绍,
        swot.customPrompts?.笔记操作介绍,
        swot.customPrompts?.笔记介绍标记,
        swot.customPrompts?.笔记操作介绍标记
      );
      swot.state.notebookEditPlan.outputData = dataWrap.outputData;
      播放坠落声();
      记录调模型时的数据({
        promptVersion: currentPromptVersion, 
        version: swot.getNotebookVersion(), 
        data: 精简调模型的单纯数据(dataWrap), 
        selectedSupplier: swot.supplierForm?.selectedSupplier, 
        type: "合并对笔记的修改", 
        time: Date.now(),
      });
      await sleep(200);
    } else {
      swot.state.notebookEditPlan = {
        outputData: opPlans[0],
      };
    }

    await 执行笔记的更新操作(swot);

    return 1;
  } catch (err) {
    播放报错声();
    console.error(err);
    return -1;
  }
}

export async function 执行笔记的更新操作(swot: SWOT) {
  if (swot.state.notebookEditPlan?.outputData?.operations==null) {return;}
  const dataWrap2 = {
    operations: swot.state.notebookEditPlan?.outputData?.operations,
    qtBook: _.cloneDeep(swot.getNotebook()),
  };
  笔记操作函数(dataWrap2);
  swot.setNotebook(dataWrap2.qtBook);
  await sleep(3_0);
  swot.state.notebookEditPlan = {};
  await sleep(1_00);
  播放女人说话声();
}

export async function 为单个错题更新笔记(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const quEntry = swot.getQuEntry(quId);
  if (!quEntry) { return -1; }
  const quState = swot.getQuState(quId);
  if (!quState) { return -1; }
  const quData = swot.getQuData(quId);
  if (!quData) { return -1; }
  try {
    const dataWrap = {
      operations: quData?.errorReport?.outputData?.operations,
      qtBook: _.cloneDeep(swot.getNotebook()),
    };
    笔记操作函数(dataWrap);
    swot.setNotebook(dataWrap.qtBook);

    return 1;
  } catch (err) {
    播放报错声();
    console.log({ quEntry, quState });
    console.error(err);
    return -1;
  }
}


export async function 试做单个题目(swot: SWOT, quId: QuestionTrainingState["nnid"]): Promise<-2|-1|0|1> {
  // await swot?.signalFn?.("试做单个题目");
  await sleep(200);

  const quEntry = swot.getQuEntry(quId);
  if (!quEntry) { return -1; }

  const quState = swot.getQuState(quId);
  quState.stateText = "预备";
  const quData = swot.getQuData(quId);
  const qtBook = swot.getNotebook();
  const noteEntries = qtBook.entries;

  quData.judgeResponse = {};
  quData.response = {};
  quData.errorReport = {};

  const judgeResponseDataWrap = { qtBook: qtBook, question: { content: quEntry.content, }, } as any;
  const responseDataWrap = { note: null, question: { content: quEntry.content, }, } as any;

  try {
    quState.stateText = "判断题型中";
    
    // Use custom prompts if available
    const currentPromptVersion = swot.customPrompts?.promptVersion || promptVersion;
    
    await stage0_判断题型_Process(
      judgeResponseDataWrap, 
      swot.supplierForm, 
      ()=>{
        quData.judgeResponse = _.pick(judgeResponseDataWrap, ["processing", "thinkingSpans", "outputSpans", "outputData"]);
      },
      swot.customPrompts?.stage0_判断题型_prompt // Pass custom prompt if available
    );
    记录调模型时的数据({
      promptVersion: currentPromptVersion, 
      version: swot.getNotebookVersion(), 
      data: 精简调模型的单纯数据(judgeResponseDataWrap), 
      selectedSupplier: swot.supplierForm?.selectedSupplier, 
      type: "judgeResponse", 
      time: Date.now(),
    });

    if (swot.shouldStop) {
      quState.stateText = "中断";
      await swot?.signalFn?.(`程序应结束`, "error", 2000);
      swot.abortTraining();
      return -2;
    }

    quData.judgeResponse.outputData = judgeResponseDataWrap.outputData;
    if (quData.judgeResponse?.outputData==null) {
      quState.stateText = "报错";
      throw new Error("判断题型 时没有输出正确格式的数据");
    }
    const qtName = quData.judgeResponse?.outputData?.name ?? quData.judgeResponse?.outputData?.qtName;
    const qtFound = noteEntries.find(it => it.name === qtName);
    if (qtFound==null) {
      await swot?.signalFn?.(`没有找到题型「${qtName}」的笔记`, "warn", 5000);
    }
    responseDataWrap.note = qtFound;

    播放咔哒声();

    quState.stateText = "做题中";
    
    // Use custom prompts if available
    const customPrompt1 = swot.customPrompts?.stage1_根据笔记做题_prompt;
    const customVersion = swot.customPrompts?.promptVersion || promptVersion;
    
    await stage1_根据笔记做题_Process(
      responseDataWrap, 
      swot.supplierForm, 
      ()=>{
        quData.response = _.pick(responseDataWrap, ["processing", "thinkingSpans", "outputSpans", "outputData"]);
      },
      customPrompt1 // Pass custom prompt if available
    );
    记录调模型时的数据({
      promptVersion: customVersion, 
      version: swot.getNotebookVersion(), 
      data: 精简调模型的单纯数据(responseDataWrap), 
      selectedSupplier: swot.supplierForm?.selectedSupplier, 
      type: "response", 
      time: Date.now(),
    });

    if (swot.shouldStop) {
      quState.stateText = "中断";
      await swot?.signalFn?.(`程序应结束`, "error", 2000);
      swot.abortTraining();
      return -2;
    }

    quData.response.outputData = responseDataWrap.outputData;
    if (quData.response?.outputData==null) {
      quState.stateText = "报错";
      throw new Error("根据笔记做题 时没有输出正确格式的数据");
    }

    const jsonA = JSON.stringify(quEntry?.answer);
    const jsonB = JSON.stringify(quData.response?.outputData?.answer);

    // (quEntry?.answer!=quData.response?.outputData?.answer)
    if ((jsonA!=jsonB)&&(quEntry?.answer!=quData.response?.outputData?.answer)) {
      quState.stateText = "错误待分析";
      播放咕嘟声();
      return 0;
    }

    quState.stateText = "正确";
    播放叮咚声();
    return 1;
  } catch (err) {
    quState.stateText = "报错";
    播放报错声();
    console.log({ quEntry, quState });
    console.error(err);
    return -1;
  }
}

export async function 处理单个错题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const quState = swot.getQuState(quId);
  if (!quState) return;
  quState.trainedCountV = (quState.trainedCountV ?? 0) + 1;
  quState.trainedCountT = (quState.trainedCountT ?? 0) + 1;
  quState.errorCountV = (quState.errorCountV ?? 0) + 1;
  quState.errorCountT = (quState.errorCountT ?? 0) + 1;
  if (quState.errorCountV >= swot.versionSkipThreshold) {
    quState.isSkipV = true;
  }
  if (quState.errorCountT >= swot.totalSkipThreshold) {
    quState.isSkipT = true;
  }
  if (quState.isSkipV||quState.isSkipT) {return;}

  if (swot.shouldStop) {
    await swot?.signalFn?.(`程序应结束`, "error", 2000);
    swot.abortTraining();
    return -2;
  }

  // 如果是仅做题模式，跳过错题分析
  if (swot.practiceOnlyMode) {
    quState.stateText = "错误（仅做题模式）";
    播放咕嘟声();
    return;
  }

  // 制定更新笔记的计划
  const quEntry = swot.getQuEntry(quId);
  const quData = swot.getQuData(quId);
  const qtBook = swot.getNotebook();
  const noteEntries = qtBook.entries;
  const qtName = quData.judgeResponse?.outputData?.qtName;
  // const qtFound = noteEntries.find(it => it.name === qtName);
  const shadow = [] as any;
  noteEntries.forEach(it=>{
    if (it.name === qtName) {
      shadow.push(it);
    } else {
      const that = _.pick(it, ["name", "desc", "clue"]);
      shadow.push(that);
    }
  });

  const errorReportDataWrap = {
    qtBook: {entries: shadow},
    errorCase: {
      question: quEntry,
      errorOutput: _.omit(quData.response?.outputData, ["didFollow", "reflection", "noteAdvice"]),
    },
  } as any;

  await swot?.signalFn?.(`错误分析中[${quEntry.nnid}]`, "warn", 3000);
  quData.errorReport = {};
  quState.stateText = "错误分析中";
  
  // Use custom prompts if available
  const currentPromptVersion = swot.customPrompts?.promptVersion || promptVersion;
  
  await stage2_根据错题修改笔记_Process(
    errorReportDataWrap, 
    swot.supplierForm, 
    ()=>{
      quData.errorReport = _.pick(errorReportDataWrap, ["processing", "thinkingSpans", "outputSpans", "outputData"]);
    },
    swot.customPrompts?.stage2_根据错题修改笔记_prompt,
    swot.customPrompts?.笔记介绍,
    swot.customPrompts?.笔记操作介绍,
    swot.customPrompts?.笔记介绍标记,
    swot.customPrompts?.笔记操作介绍标记
  );
  await swot?.signalFn?.(`错误已分析了吗[${quEntry.nnid}]`, "warn", 3000);
  记录调模型时的数据({
    promptVersion: currentPromptVersion, 
    version: swot.getNotebookVersion(), 
    data: 精简调模型的单纯数据(errorReportDataWrap), 
    selectedSupplier: swot.supplierForm?.selectedSupplier, 
    type: "errorReport", 
    time: Date.now(),
  });
  quState.stateText = "错误已分析";
  await swot?.signalFn?.(`错误已分析[${quEntry.nnid}]`, "warn", 3000);

  quData.errorReport.outputData = errorReportDataWrap.outputData;
  if (quData.errorReport?.outputData==null) {
    播放报错声();
    throw new Error("根据错题修改笔记 时没有输出正确格式的数据");
  }

  播放哐当声();
}

export async function 处理单个对题(swot: SWOT, quId: QuestionTrainingState["nnid"]) {
  const quState = swot.getQuState(quId);
  if (!quState) return;
  quState.trainedCountV = (quState.trainedCountV ?? 0) + 1;
  quState.trainedCountT = (quState.trainedCountT ?? 0) + 1;
  quState.correctCountV = (quState.correctCountV ?? 0) + 1;
  quState.correctCountT = (quState.correctCountT ?? 0) + 1;
  if (quState.trainedCountV === quState.correctCountV) {
    quState.isSimpleV = quState.trainedCountV >= swot.versionSimpleThreshold;
  }
  if (quState.trainedCountT === quState.correctCountT) {
    quState.isSimpleT = quState.trainedCountT >= swot.totalSimpleThreshold;
  }
}




export const defaultOptions: SWOTOptions = {
  batchSize: 5,               // 每次并行的题目数量
  maxLoopCount: 16,           // 最大循环次数
  maxVerifyCount: 20,         // 最大验证次数
  maxCertifyCount: 2,         // 最大确证次数
  versionSimpleThreshold: 2,  // 版本简单阈值
  totalSimpleThreshold: 4,    // 总体简单阈值
  versionSkipThreshold: 6,    // 版本难题阈值
  totalSkipThreshold: 12,     // 总体难题阈值
  practiceOnlyMode: false,    // 仅做题模式（不更新笔记）
};
export const defaultState: SWOTState = {
  quCount: 0,              // 题目数量

  totalCount: 0,            // 总体做题次数
  versionCount: 0,          // 版本做题次数
  versionCertifyCount: 0,   // 版本确证次数
  quStateDict: {},          // 题目状态字典
  quDataDict: {},           // 题目数据字典
  notebook: {entries: []},  // 笔记本
  notebookVersion: "",      // 笔记本版本
  notebookEditPlan: {},     // 笔记本编辑计划

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
  get shouldStop() {
    return [TrainingState.ABORTING, TrainingState.ABORTED, TrainingState.ENDED].includes(this.trainingState);
  }

  get batchSize() { return this._options.batchSize??5; }
  get maxLoopCount() { return this._options.maxLoopCount??30; }
  get maxVerifyCount() { return this._options.maxVerifyCount??20; }
  get maxCertifyCount() { return this._options.maxCertifyCount??2; }
  get versionSimpleThreshold() { return this._options.versionSimpleThreshold??2; }
  get totalSimpleThreshold() { return this._options.totalSimpleThreshold??4; }
  get versionSkipThreshold() { return this._options.versionSkipThreshold??5; }
  get totalSkipThreshold() { return this._options.totalSkipThreshold??10; }
  get practiceOnlyMode() { return this._options.practiceOnlyMode??false; }


  // Custom prompt templates
  customPrompts: {
    stage0_判断题型_prompt?: string;
    stage1_根据笔记做题_prompt?: string;
    stage2_根据错题修改笔记_prompt?: string;
    stage4_合并对笔记的修改_prompt?: string;
    笔记介绍?: string;
    笔记操作介绍?: string;
    笔记介绍标记?: string;
    笔记操作介绍标记?: string;
    promptVersion?: string;
  } = {};

  isSWOT: boolean = true;

  signalFn?: any;
  supplierForm?: any;

  state: SWOTState = {
    quStateDict: {},
    quDataDict: {},
    notebook: {entries: []},
    notebookVersion: "",
    notebookEditPlan: {},
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
    if (this.state.quStateDict?.[id]==null) { this.state.quStateDict[id] = { nnid: id, stateText: "预备" }; }
    return this.state.quStateDict[id];
  }
  getQuData(id: QuestionTrainingState["nnid"]) {
    if (this.state.quDataDict?.[id]==null) { this.state.quDataDict[id] = { nnid: id }; }
    return this.state.quDataDict[id];
  }
  getNotebook() {
    return this.state.notebook;
  }
  setNotebook(notebook: any) {
    this.state.notebook = notebook;
    return this.state.notebook;
  }
  getNotebookVersion() {
    return this.state.notebookVersion;
  }
  
  /**
   * 更新提示词模板
   * @param templates 新的提示词模板
   */
  updatePromptTemplates(templates: any): void {
    if (!templates) return;
    
    this.customPrompts = {
      stage0_判断题型_prompt: templates.stage0_判断题型 || undefined,
      stage1_根据笔记做题_prompt: templates.stage1_根据笔记做题 || undefined,
      stage2_根据错题修改笔记_prompt: templates.stage2_根据错题修改笔记 || undefined,
      stage4_合并对笔记的修改_prompt: templates.stage4_合并对笔记的修改 || undefined,
      笔记介绍: templates.笔记介绍 || undefined,
      笔记操作介绍: templates.笔记操作介绍 || undefined,
      笔记介绍标记: templates.笔记介绍标记 || undefined,
      笔记操作介绍标记: templates.笔记操作介绍标记 || undefined,
      promptVersion: templates.version || undefined
    };
  }
  initNewNotebookVersion() {
    this.state.notebookVersion = `${nanoid(6)}`;
    /** @TODO */
    this.state.versionCount = 0;
    this.state.versionCertifyCount = 0;
    Object.values(this.state.quStateDict).forEach(it => {
      it.trainedCountV = undefined;
      it.correctCountV = undefined;
      it.errorCountV = undefined;
      it.isSimpleV = undefined;
      it.isSkipV = undefined;
    });
    return {
      version: this.state.notebookVersion,
      notebook: this.state.notebook,
    };
  }



  修正做题初始状态() {
    Object.values(this.state.quStateDict).forEach(it => {
      if (it.stateText=="错误待分析") {it.stateText="错误未分析";}
      if (it.stateText=="错误分析中") {it.stateText="错误未分析";}
    });
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
    // console.log("resetState", this?.state?.notebook?.entries?.length);
    const lastEntries = this?.state?.notebook?.entries;
    const lastVersion = this?.state?.notebookVersion;

    this.state = _.cloneDeep(defaultState) ?? {};

    if (this?.options?.practiceOnlyMode) {
      this.state.notebook = { entries: lastEntries ?? [] };
      this.state.notebookVersion = lastVersion ?? "";
    }

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
    // this.state = _.cloneDeep(defaultState) ?? {};
    if (this.state.quStateDict==null) { this.state.quStateDict = {}; }
    if (this.state.quDataDict==null) { this.state.quDataDict = {}; }
    this.state.quCount = questions.length;
    for (const question of questions) {
      const quId = question.nnid;
      this.quDict[quId] = question;
      if (refreshState || this.state.quStateDict[quId] == null) {
        this.state.quStateDict[quId] = { nnid: quId, stateText: "预备", };
      }
      if (refreshState || this.state.quDataDict[quId] == null) {
        this.state.quDataDict[quId] = { nnid: quId, };
      }
    }

    if (refreshState) {
      // ???
      this.state.totalCount = 0;
      this.state.versionCount = 0;
      this.state.versionCertifyCount = 0;
      // this.state.quStateDict = {};
      // this.state.quDataDict = {};
      // ???
    }
  }
  toJSON(withQuEntries = false) {
    return {
      _options: this._options,
      quEntries: withQuEntries ? this.quEntries : [],
      state: this.state,
      trainingState: this.trainingState,
    };
  }
  fromJSON(json: any, forceRefreshState = false) {
    this.loadOptions(json._options);
    this.loadState(json.state);
    if ([
      TrainingState.RUNNING,
      TrainingState.PREPARING_PAUSE,
      TrainingState.ABORTING,
    ].includes(json.trainingState)) {
      this.trainingState = TrainingState.ABORTED;
    } else {
      this.trainingState = json.trainingState;
    }
    let refreshState = false;
    if (this.state.quStateDict == null) {
      this.state.quStateDict = {};
      refreshState = true;
    }
    if (this.state.quDataDict == null) {
      this.state.quDataDict = {};
      refreshState = true;
    }
    this.loadQuEntries(json.quEntries, forceRefreshState||refreshState);
  }



  async start(afterBatchFn?: any) {
    // console.log("start", this?.state?.notebook?.entries?.length);
    // 只有在空闲、已结束或已中止状态下才能开始训练
    if (this.trainingState === TrainingState.IDLE || this.trainingState === TrainingState.ENDED || this.trainingState === TrainingState.ABORTED) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("开始训练");
      await this.restart(afterBatchFn);
    }
  }

  async restart(afterBatchFn?: any) {
    // console.log("restart", this?.state?.notebook?.entries?.length);
    this.resetStateManually();
    this.state.startTime = new Date().toISOString();
    this.trainingState = TrainingState.RUNNING;
    await this.continue(afterBatchFn);
  }

  async resetStateManually() {
    // console.log("resetStateManually", this?.state?.notebook?.entries?.length);
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

  async continue(afterBatchFn?: any) {
    // console.log("continue", this?.state?.notebook?.entries?.length);
    if (this.trainingState === TrainingState.ENDED) {
      // this.signalFn?.("训练已结束，无法继续");
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("训练本已结束，现在重新继续");
      return;
    }

    // 如果从暂停状态恢复，使用保存的批次位置继续
    if (this.trainingState === TrainingState.PAUSED) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("从暂停状态恢复训练");
    }

    if (this.trainingState === TrainingState.ABORTED) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("从中止状态恢复训练");
    }

    await 循环总流程(this, afterBatchFn);
  }

  // 请求暂停训练
  async requestPause({before, after}: {before: any, after: any}) {
    await before?.();
    if (this.trainingState === TrainingState.RUNNING) {
      this.trainingState = TrainingState.PREPARING_PAUSE;
      this.signalFn?.("准备暂停训练，等待当前批次完成...");
      await after?.();
      return true;
    }
    return false;
  }

  // 取消暂停请求
  async cancelPauseRequest(afterCancelPauseFn: any) {
    if (this.trainingState === TrainingState.PREPARING_PAUSE) {
      this.trainingState = TrainingState.RUNNING;
      this.signalFn?.("已取消暂停请求，继续训练");
      await afterCancelPauseFn?.();
      return true;
    }
    return false;
  }

  // 恢复训练
  resume(afterBatchFn?: any) {
    if ([TrainingState.PAUSED, TrainingState.ABORTED, TrainingState.ENDED].includes(this.trainingState)) {
      this.signalFn?.("恢复训练");
      this.continue(afterBatchFn);
      return true;
    }
    return false;
  }

  // 请求中止训练
  async requestAbort(reason: string = "用户请求中止", {before, after}: {before: any, after: any}) {
    await before?.();
    if (this.trainingState === TrainingState.RUNNING || this.trainingState === TrainingState.PAUSED || this.trainingState === TrainingState.PREPARING_PAUSE) {
      this.trainingState = TrainingState.ABORTING;
      this.signalFn?.(`请求中止训练: ${reason}`);
      if (!this.state.isProcessingBatch) {
        // 如果当前不在处理批次中，直接完成中止
        this.abortTraining(undefined, after);
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
  abortTraining(reason?: string, afterEndFn?: any) {
    this.trainingState = TrainingState.ABORTED;
    this.end(reason || "训练中止", afterEndFn);
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

  async end(reason?: string, afterEndFn?: any) {
    if (this.trainingState === TrainingState.ABORTING) {
      // 如果是中止状态，记录为中止
      this.state.ended = true;
      this.state.endReason = reason || "训练中止";
      this.state.endTime = new Date().toISOString();
      this.signalFn?.(`训练已中止: ${this.state.endReason}`);
      this.trainingState = TrainingState.ABORTED;
      await afterEndFn?.();
    } else {
      // 否则记录为正常结束
      this.state.ended = true;
      this.state.endReason = reason;
      this.state.endTime = new Date().toISOString();
      this.signalFn?.(`训练已结束: ${this.state.endReason}`);
      this.trainingState = TrainingState.ENDED;
      await afterEndFn?.();
    }
  }

  async reset(afterResetFn?: any) {
    this.resetStateManually();
    this.trainingState = TrainingState.IDLE;
    await this.signalFn?.("训练已重置");
    await afterResetFn?.();
  }

};

