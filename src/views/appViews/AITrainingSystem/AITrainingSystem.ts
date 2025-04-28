// @unocss-include

import { saveAs } from 'file-saver';
import { h as vnd, defineComponent, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Panel from 'primevue/panel';
import ToolButton from '@components/shared/ToolButton';
import TrainingControlPanel from './TrainingControlPanel';
import QuestionCard from './QuestionCard';
import CurrentNotePanel from './CurrentNotePanel';
import NoteHistoryPanel from './NoteHistoryPanel';
import MemoBoard from './MemoBoard';
import AccuracyPanel from './components/AccuracyPanel';
import {
  SWOTOptions,
  // SWOTState,
  QuestionEntry,
  // QuestionTrainingState,
  // QuestionDisplay,
  // QuestionNote,
  TrainingState,
} from './types';

import {
  save,
  load,
} from "./swot-db-functions";

import renderMarkdown from '@utils/md';

import {
  // save as appSave,
  load as appLoad,
} from '@utils/functions';
type ModelDict = {name?: string, label?: string, id?: string|number};
import {
  suppliers,
  type SupplierDict,
} from 'llm-utils';

import {
  SWOT,
  // defaultOptions, defaultState,
} from './swot-trainer';
import { SpaCE2024_Demo_Data_Standardized } from '@data/SpaCE2024';



export default defineComponent({
  name: "AITrainingSystem",
  components: { TrainingControlPanel, QuestionCard, CurrentNotePanel, AccuracyPanel },
  setup() {
    const toast = useToast();



    const supplierForm = reactive({
      selectedSupplier: suppliers[0] as SupplierDict,
      apiKeyDict: {} as Record<string, string>,
      supplierModelsDict: {} as Record<string, ModelDict[]>,
      selectedModelDict: {} as Record<string, ModelDict>,
    });
    onMounted(async ()=>{
      const supplierForm_ = await appLoad("supplierForm");
      if (supplierForm_!=null) { Object.assign(supplierForm, supplierForm_); }
    });



    const appData = reactive<{
      trainer?: SWOT | null;
      questions: QuestionEntry[];
    }>({
      trainer: null,
      questions: [],
    });

    const 加载训练题集 = () => {
      appData.questions = SpaCE2024_Demo_Data_Standardized;
      // toast.add({ severity: "info", summary: "已加载", detail: `加载了 ${appData.questions.length} 题`, life: 1000 });
      // save("questions", appData.questions);
      // console.log("appData.questions", appData.questions);
    };

    const logAppData = () => {
      console.log("appData", appData);
    };
    const saveAppData = async () => {
      // save("questions", appData.questions);
      if (!appData?.trainer?.isSWOT) {return;}
      const json = appData.trainer.toJSON(false);
      await save("trainer", json);
      console.log("json", json);
      console.log("appData.trainer", appData.trainer);
    };
    const exportTrainerData = async () => {
      if (!appData?.trainer?.isSWOT) {return;}
      const json = appData.trainer.toJSON(false);
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const fileName = `SWOT_Trainer_${new Date().toISOString()}.json`;
      saveAs(blob, fileName);
      toast.add({ severity: "info", summary: "导出数据", detail: `已导出 ${fileName}`, life: 1000 });
    };
    const exportQuestions = async () => {
      const blob = new Blob([JSON.stringify(appData.questions)], { type: 'application/json' });
      const fileName = `SWOT_Questions_${new Date().toISOString()}.json`;
      saveAs(blob, fileName);
      toast.add({ severity: "info", summary: "导出数据", detail: `已导出 ${fileName}`, life: 1000 });
    };
    const loadAppData = async () => {
      appData.trainer = new SWOT();
      const trainerJson = await load("trainer");
      console.log("trainerJson", trainerJson);
      if (trainerJson) {
        appData.trainer.fromJSON(trainerJson);
        toast.add({ severity: "info", summary: "已加载", detail: `已加载训练器状态`, life: 1000 });
      }
      appData.trainer.signalFn = (msg: string, severity: string="info", life: number=1000) => {
        toast.add({ severity: severity??"info", summary: "SWOT", detail: msg, life: life??1000 });
      }
      appData.trainer.supplierForm = supplierForm;
      console.log("appData.trainer", appData.trainer);

      const questions = [] as any[];  //await load("questions");
      if (questions?.length) {
        appData.questions = questions;
        appData.trainer.loadQuEntries(questions, false);
        toast.add({ severity: "info", summary: "已加载", detail: `加载了 ${appData.questions.length} 题`, life: 1000 });
      } else {
        await 加载训练题集();
        appData.trainer.loadQuEntries(appData.questions, false);
        toast.add({ severity: "info", summary: "从头加载", detail: `加载了 ${appData.questions.length} 题`, life: 1000 });
      }
      console.log("appData.questions", appData.questions);
    };
    // /** lifecycle **/ //
    onMounted(async ()=>{
      await loadAppData();
    });
    onUnmounted(async ()=>{
      await saveAppData();
    });

    const quStateDict = computed(()=>appData?.trainer?.state?.quStateDict);
    const quDataDict = computed(()=>appData?.trainer?.state?.quDataDict);

    const updateOptions = (options: SWOTOptions) => {
      if (!appData.trainer) { return; }
      appData.trainer.assignOptions(options);
    }

    // 创建响应式的训练状态文本
    const trainingStateText = computed(() => {
      return appData.trainer?.getTrainingStateText() || "未开始";
    });

    const afterBatchFn = async () => { await saveAppData(); };
    const afterResetFn = async () => { await saveAppData(); };
    const afterCancelPauseFn = async () => { await saveAppData(); };
    const beforeStopFn = async () => { await saveAppData(); };
    const afterStopFn = async () => { await saveAppData(); };

    // 训练控制函数
    const startTraining = async () => {
      if (!appData.trainer) { return; }
      toast.add({ severity: "info", summary: "开始训练", detail: "已经开始训练", life: 1000 });
      await appData.trainer.start(afterBatchFn);
    };
    
    const resetTraining = () => {
      if (!appData.trainer) { return; }
      appData.trainer.reset(afterResetFn);
      toast.add({ severity: "info", summary: "重置训练", detail: "已经重置训练", life: 1000 });
    };
    
    const continueTraining = async () => {
      if (!appData.trainer) { return; }
      toast.add({ severity: "info", summary: "继续训练", detail: "从暂停状态恢复训练", life: 1000 });
      await appData.trainer.resume(afterBatchFn);
    };
    
    const pauseTraining = () => {
      if (!appData.trainer) { return; }
      if (appData.trainer.trainingState === TrainingState.RUNNING) {
        appData.trainer.requestPause({before: beforeStopFn, after: afterStopFn});
        toast.add({ severity: "info", summary: "准备暂停", detail: "等待当前批次完成后暂停", life: 1000 });
      }
    };
    
    const cancelPauseRequest = () => {
      if (!appData.trainer) { return; }
      if (appData.trainer.trainingState === TrainingState.PREPARING_PAUSE) {
        appData.trainer.cancelPauseRequest(afterCancelPauseFn);
        toast.add({ severity: "info", summary: "取消暂停", detail: "已取消暂停请求", life: 1000 });
      }
    };
    
    const stopTraining = () => {
      if (!appData.trainer) { return; }
      appData.trainer.requestAbort("用户手动停止训练", {before: beforeStopFn, after: afterStopFn});
      toast.add({ severity: "info", summary: "停止训练", detail: "正在停止训练...", life: 1000 });
    };

    const analyzeError = () => toast.add({ severity: "info", summary: "UI演示", detail: "错误分析点击", life: 1000 });










    return () =>
      vnd("div", { class: "container mx-auto px-4 py-6" }, [

        vnd(Panel, {
          header: "SWOT: self-prompt training",
          toggleable: true,
          collapsed: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => [
            vnd(MemoBoard),
          ],
        }),

        vnd(Panel, {
          header: "DEBUG",
          toggleable: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => [
            vnd("div", {class: "stack-v"}, [
              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "saveAppData", icon: "pi pi-play", onClick: saveAppData, }),
                vnd(ToolButton, { label: "loadAppData", icon: "pi pi-play", onClick: loadAppData, }),
                vnd(ToolButton, { label: "logAppData", icon: "pi pi-play", onClick: logAppData, }),
                vnd(ToolButton, { label: "exportTrainerData", icon: "pi pi-play", onClick: exportTrainerData, }),
                vnd(ToolButton, { label: "exportQuestions", icon: "pi pi-play", onClick: exportQuestions, }),
              ]),
            ]),
          ],
        }),

        vnd("div", { class: "my-1.5rem! grid grid-cols-1 md:grid-cols-2 gap-4" }, [
          vnd(Panel, {
            header: "题库配置",
            toggleable: true,
            class: ["col-span-1", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
          }, {
            default: () => vnd("div", {
              class: "stack-v",
            }, [
              vnd("div", { class: "markdown-body", innerHTML: renderMarkdown(`
暂不开发，数据写在代码里

- 训练集：用于训练
- 开发集：训练好之后用开发集测试性能
- 测试集：输出答案，用于提交
                `.trim()),
              }),
              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "加载训练题集", icon: "pi pi-play", class: "mr-0.5rem", onClick: 加载训练题集, }),
              ]),
            ]),
          }),

          vnd(Panel, {
            header: "提示词配置",
            toggleable: true,
            class: ["col-span-1", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
          }, {
            default: () => vnd("div", {
              class: "stack-v",
            }, [
              vnd("div", { class: "markdown-body", innerHTML: renderMarkdown(`
暂不开发，提示词写在代码里
                `.trim()),
              }),
            ]),
          }),
        ]),

        vnd("div", { class: "my-1.5rem! grid grid-cols-1 md:grid-cols-12 gap-4" }, [
          vnd("div", { class: "col-span-1 md:col-span-6 xl:col-span-5 grid grid-cols-1 gap-4" }, [
            vnd(Panel, {
              header: "训练控制",
              toggleable: true,
              class: ["bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
            }, {
              default: () => vnd(TrainingControlPanel, {
                options: appData.trainer?.options,
                state: appData.trainer?.state,
                isTraining: appData.trainer?.trainingState === TrainingState.RUNNING,
                isPaused: appData.trainer?.trainingState === TrainingState.PAUSED,
                isPreparingPause: appData.trainer?.trainingState === TrainingState.PREPARING_PAUSE,
                trainingStateText: trainingStateText.value,
                onStartTraining: startTraining,
                onContinueTraining: continueTraining,
                onPauseTraining: pauseTraining,
                onCancelPause: cancelPauseRequest,
                onStopTraining: stopTraining,
                onResetTraining: resetTraining,
                'onUpdate:options': updateOptions,
              })
            }),
            
            // 添加正确率统计面板
            vnd(AccuracyPanel, {
              state: appData.trainer?.state,
            })
          ]),
        
          vnd(Panel, {
            header: "题目笔记",
            toggleable: true,
            class: ["col-span-1 md:col-span-6 xl:col-span-7", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
          }, {
            default: () => vnd("div", {
              class: "stack-v",
            }, [
              vnd("div", { class: "markdown-body", innerHTML: renderMarkdown(`
- 查看最新版笔记
- 查看历史版本的笔记
                `.trim()),
              }),
              vnd(NoteHistoryPanel, {
                class: "w-100%",
                currentVersion: appData.trainer?.state?.notebookVersion,
                onSelectVersion: (backup: any) => {
                  if (!appData.trainer) return;
                  toast.add({ severity: "info", summary: "加载笔记版本", detail: `加载版本: ${backup.key}`, life: 1000 });
                  if (backup?.data?.notebook) {
                    appData.trainer.state.notebook = backup.data.notebook;
                    appData.trainer.state.notebookVersion = backup.key;
                  }
                },
              }),
              vnd(CurrentNotePanel, {
                class: "w-100%",
                note: appData.trainer?.state?.notebook??null,
                notebookEditPlan: appData.trainer?.state?.notebookEditPlan??null,
                version: appData.trainer?.state?.notebookVersion,
                onSaveNote: () => {
                  if (!appData.trainer?.state?.notebook) return;
                  import('./swot-db-functions').then(({ 记录版本笔记数据 }) => {
                    记录版本笔记数据({
                      notebook: appData.trainer?.state?.notebook,
                      notebookVersion: appData.trainer?.state?.notebookVersion,
                    }, appData.trainer?.state?.notebookVersion)
                    .then(() => {
                      toast.add({ severity: "success", summary: "笔记保存", detail: "笔记版本已保存", life: 1000 });
                    })
                    .catch((err) => {
                      console.error("保存笔记失败:", err);
                      toast.add({ severity: "error", summary: "笔记保存失败", detail: err.message || "未知错误", life: 3000 });
                    });
                  });
                },
              }),
            ]),
          }),
        ]),

        vnd(Panel, {
          header: "本次循环的答题情况",
          toggleable: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => vnd("div", {
            class: ["stack-h"],
          }, [
            (appData.trainer?.quEntries??[]).map((question, idx) =>
              vnd(QuestionCard, {
                idx,
                class: "w-100% md:max-w-48% xl:max-w-32%",
                key: question.nnid,
                question: question,
                judgeResponse: (quDataDict.value?.[question.nnid]?.judgeResponse),
                response: (quDataDict.value?.[question.nnid]?.response),
                errorReport: (quDataDict.value?.[question.nnid]?.errorReport),
                trainingState: (quStateDict.value?.[question.nnid]!),
                state: "未知",
                onAnalyzeError: analyzeError,
              })
            ),
          ]),
        }),

      ]);
  }
});