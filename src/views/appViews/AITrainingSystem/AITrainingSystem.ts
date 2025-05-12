// @unocss-include

import { saveAs } from 'file-saver';
import { nanoid } from 'nanoid';
import { h as vnd, defineComponent, reactive, computed, onMounted, onUnmounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Panel from 'primevue/panel';
import ToolButton from '@components/shared/ToolButton';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import TrainingControlPanel from './TrainingControlPanel';
import QuestionCard from './QuestionCard';
import CurrentNotePanel from './CurrentNotePanel';
import NoteHistoryPanel from './NoteHistoryPanel';
import StorageInfoPanel from './StorageInfoPanel';
import ChatRecordsPanel from './ChatRecordsPanel';
import MemoBoard from './MemoBoard';
import AccuracyPanel from './components/AccuracyPanel';
import NotebookEditor from './NotebookEditor';
import FileUploadDialog from './components/FileUploadDialog';
import PromptTemplatesPanel from './PromptTemplatesPanel';
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
  记录版本笔记数据,
} from "./swot-db-functions";

import renderMarkdown from '@utils/md';
import { sleep } from '@utils/functions';

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
  stage0_判断题型_prompt,
  stage1_根据笔记做题_prompt,
  stage2_根据错题修改笔记_prompt,
  stage4_合并对笔记的修改_prompt,
  笔记介绍,
  笔记操作介绍,
  promptVersion,
  DEFAULT_NOTE_DESC_TOKEN,
  DEFAULT_NOTE_OPS_TOKEN
} from './solver';

import {
  SWOT,
  // defaultOptions, defaultState,
} from './swot-trainer';
// import { SpaCE2024_Demo_Data_Standardized } from '@data/SpaCE2024';
import { FIE2025_Training_Data_Standardized } from '@data/FIE2025';



export default defineComponent({
  name: "AITrainingSystem",
  components: { TrainingControlPanel, QuestionCard, CurrentNotePanel, NoteHistoryPanel, ChatRecordsPanel, AccuracyPanel },
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

    // UI state management - persistent across sessions
    const uiData = reactive({
      activeTabIndex: 0, // Default to first tab (training)
    });



    const appData = reactive<{
      trainer?: SWOT | null;
      questions: QuestionEntry[];
      promptTemplates: any;
    }>({
      trainer: null,
      questions: [],
      promptTemplates: null,
    });

    const 加载训练题集 = () => {
      appData.questions = FIE2025_Training_Data_Standardized;
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

    // Save UI state to localStorage
    const saveUiData = async () => {
      await save("uiData", uiData);
      // toast.add({ 
      //   severity: "success", 
      //   summary: "UI状态已保存", 
      //   detail: `已保存当前标签页索引: ${uiData.activeTabIndex}`, 
      //   life: 1000 
      // });
      console.log("Saved UI data:", uiData);
    };
    
    // Save prompt templates to localStorage
    const savePromptTemplates = async () => {
      await save("promptTemplates", appData.promptTemplates);
      toast.add({ 
        severity: "success", 
        summary: "提示词模板已保存", 
        detail: `保存版本: ${appData.promptTemplates?.version || '未命名'}`, 
        life: 2000 
      });
    };
    
    // Update prompt templates
    const updatePromptTemplates = (templates: any) => {
      appData.promptTemplates = templates;
      
      // Update trainer's prompt templates if trainer exists
      if (appData.trainer) {
        appData.trainer.updatePromptTemplates(templates);
      }
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

      // Load prompt templates
      const promptTemplates = await load("promptTemplates");
      if (promptTemplates) {
        appData.promptTemplates = promptTemplates;
        // Apply loaded templates to trainer
        if (appData.trainer) {
          appData.trainer.updatePromptTemplates(promptTemplates);
        }
        console.log("Loaded prompt templates:", promptTemplates);
      } else {
        // Initialize with default templates from solver.ts
        appData.promptTemplates = {
          version: promptVersion || "默认模板",
          stage0_判断题型: stage0_判断题型_prompt,
          stage1_根据笔记做题: stage1_根据笔记做题_prompt,
          stage2_根据错题修改笔记: stage2_根据错题修改笔记_prompt,
          stage4_合并对笔记的修改: stage4_合并对笔记的修改_prompt,
          笔记介绍: 笔记介绍,
          笔记操作介绍: 笔记操作介绍,
          笔记介绍标记: DEFAULT_NOTE_DESC_TOKEN,
          笔记操作介绍标记: DEFAULT_NOTE_OPS_TOKEN
        };
        // Apply default templates to trainer
        if (appData.trainer) {
          appData.trainer.updatePromptTemplates(appData.promptTemplates);
        }
      }

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
      const savedUiData = await load("uiData");
      if (savedUiData) {
        Object.assign(uiData, savedUiData);
        console.log("Loaded UI data:", uiData);
      }
      await sleep(1000);
      await loadAppData();
    });
    onUnmounted(async ()=>{
      // Save UI data before unmounting
      await saveUiData();
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

    // Callback functions have been moved to TrainingControlPanel.ts

    // Training control functions have been moved to TrainingControlPanel.ts

    const analyzeError = () => toast.add({ severity: "info", summary: "UI演示", detail: "错误分析点击", life: 1000 });

    // Function removed - replaced by handleFileUploaded
    // Show/hide file upload dialog for importing trainer data
    const showImportDialog = ref(false);
    
    // Handle importing trainer data from a JSON file
    const handleFileUploaded = async (fileData: { name: string, content: string | ArrayBuffer | null, file: File }) => {
      try {
        if (!fileData.content || typeof fileData.content !== 'string') {
          toast.add({ severity: "error", summary: "导入失败", detail: "文件内容无效", life: 3000 });
          return;
        }

        const jsonData = JSON.parse(fileData.content);
        if (!jsonData) {
          toast.add({ severity: "error", summary: "导入失败", detail: "无法解析 JSON 数据", life: 3000 });
          return;
        }

        if (!appData.trainer) {
          appData.trainer = new SWOT();
        }
        
        appData.trainer.fromJSON(jsonData);
        await save("trainer", appData.trainer.toJSON(false));

        /** @TODO 要结合读取题库数据的操作来控制 */
        appData.trainer.loadQuEntries(appData.questions, false);
        
        // Generate a new version ID for the notebook if present
        if (appData.trainer?.state?.notebook) {
          const newVersionId = nanoid(6);
          appData.trainer.state.notebookVersion = newVersionId;
          await 记录版本笔记数据(appData.trainer.state.notebook, newVersionId);
        }
        
        toast.add({ 
          severity: "success", 
          summary: "导入成功", 
          detail: `成功导入训练器数据，来自文件: ${fileData.name}`, 
          life: 3000 
        });
      } catch (error: any) {
        console.error("导入数据失败:", error);
        toast.add({ 
          severity: "error", 
          summary: "导入失败", 
          detail: error.message || "导入训练器数据时发生错误", 
          life: 3000 
        });
      }
    };










    return () =>
      vnd("div", { class: "container mx-auto px-4 py-6" }, [
        vnd(Tabs, {
          // 使用PrimeVue Tabs组件
          value: uiData.activeTabIndex,
          'onUpdate:value': (index: number) => {
            uiData.activeTabIndex = index; // Update the reactive state
            saveUiData(); // Save UI state when switching tabs
          },
        }, {
          default: () => [
            vnd(TabList, { class: "mb-3" }, {
              default: () => [
                vnd(Tab, { value: 4, pt: { root: { class: 'font-bold' } } }, { default: () => "说明与调试" }),
                vnd(Tab, { value: 3, pt: { root: { class: 'font-bold' } } }, { default: () => "题库配置" }),
                vnd(Tab, { value: 2, pt: { root: { class: 'font-bold' } } }, { default: () => "提示词配置" }),
                vnd(Tab, { value: 0, pt: { root: { class: 'font-bold' } } }, { default: () => "训练与答题" }),
                vnd(Tab, { value: 1, pt: { root: { class: 'font-bold' } } }, { default: () => "笔记历史" }),
                vnd(Tab, { value: 6, pt: { root: { class: 'font-bold' } } }, { default: () => "聊天记录" }),
                vnd(Tab, { value: 5, pt: { root: { class: 'font-bold' } } }, { default: () => "存储管理" }),
              ]
            }),
            
            vnd(TabPanels, {}, {
              default: () => [
                // 标签页1: 训练和做题功能
                vnd(TabPanel, { value: 0 }, {
                  default: () => [

                    // DEBUG
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
                            vnd(ToolButton, { label: "logUiData", icon: "pi pi-info", onClick: () => console.log("UI State:", uiData) }),
                            vnd(ToolButton, { label: "saveUiData", icon: "pi pi-save", onClick: saveUiData }),
                            vnd(ToolButton, { label: "exportTrainerData", icon: "pi pi-download", onClick: exportTrainerData, }),
                            vnd(ToolButton, { label: "importTrainerData", icon: "pi pi-upload", onClick: () => showImportDialog.value = true }),
                            vnd(ToolButton, { label: "exportQuestions", icon: "pi pi-play", onClick: exportQuestions, }),
                          ]),
                        ]),
                      ],
                    }),

                    // 训练控制和正确率统计
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
                            trainer: appData.trainer,
                            'onUpdate:options': updateOptions,
                            'onSaveData': saveAppData,
                            'onSave-data': saveAppData,
                          })
                        }),
                        
                        // 添加正确率统计面板
                        vnd(AccuracyPanel, {
                          state: appData.trainer?.state,
                        })
                      ]),

                      // 当前笔记
                      vnd(Panel, {
                        header: "题目笔记",
                        toggleable: true,
                        class: ["col-span-1 md:col-span-6 xl:col-span-7", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                      }, {
                        default: () => vnd("div", {
                          class: "stack-v",
                        }, [
                          vnd(CurrentNotePanel, {
                            class: "w-100%",
                            note: appData.trainer?.state?.notebook??null,
                            notebookEditPlan: appData.trainer?.state?.notebookEditPlan??null,
                            version: appData.trainer?.state?.notebookVersion,
                            onSaveNote: async () => {
                              if (!appData.trainer?.state?.notebook) return;
                              try {
                                const newVersionId = nanoid(6);
                                appData.trainer.state.notebookVersion = newVersionId;
                                
                                await 记录版本笔记数据(appData.trainer?.state?.notebook, newVersionId);
                                toast.add({ 
                                  severity: "success", 
                                  summary: "笔记保存", 
                                  detail: `笔记已保存，新版本标识: ${newVersionId}`, 
                                  life: 2000 
                                });
                              } catch (err: any) {
                                console.error("保存笔记失败:", err);
                                toast.add({ severity: "error", summary: "笔记保存失败", detail: err.message || "未知错误", life: 3000 });
                              }
                            },
                          }),
                          vnd(NotebookEditor, {
                            class: "w-100% mb-4",
                            notebook: appData.trainer?.state?.notebook??null,
                            version: appData.trainer?.state?.notebookVersion,
                            "onUpdate:notebook": (newNotebook: any) => {
                              if (appData.trainer) {
                                appData.trainer.state.notebook = newNotebook;
                                const newVersionId = nanoid(6);
                                appData.trainer.state.notebookVersion = newVersionId;
                                toast.add({ 
                                  severity: "info", 
                                  summary: "笔记已更新", 
                                  detail: `新版本标识: ${newVersionId}`, 
                                  life: 2000 
                                });
                              }
                            },
                            onSave: async () => {
                              if (!appData.trainer?.state?.notebook) return;
                              try {
                                const newVersionId = nanoid(6);
                                appData.trainer.state.notebookVersion = newVersionId;
                                
                                await 记录版本笔记数据(appData.trainer?.state?.notebook, newVersionId);
                                toast.add({ 
                                  severity: "success", 
                                  summary: "笔记保存", 
                                  detail: `笔记已保存，新版本标识: ${newVersionId}`, 
                                  life: 2000 
                                });
                              } catch (err: any) {
                                console.error("保存笔记失败:", err);
                                toast.add({ severity: "error", summary: "笔记保存失败", detail: err.message || "未知错误", life: 3000 });
                              }
                            },
                          }),
                        ]),
                      }),
                    ]),
                    
                    // 本次循环的答题情况
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
                  ],
                }),

                // 标签页2: 笔记历史版本
                vnd(TabPanel, { value: 1 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "笔记历史版本",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => vnd(NoteHistoryPanel, {
                        class: "w-100%",
                        currentVersion: appData.trainer?.state?.notebookVersion,
                        onSelectVersion: (backup: any) => {
                          if (!appData.trainer) return;
                          console.log("准备加载笔记版本", backup);
                          if (backup?.data?.entries?.length) {
                            toast.add({ severity: "info", summary: "加载笔记版本", detail: `加载版本: ${backup.key}`, life: 1000 });
                            appData.trainer.state.notebook = backup.data;
                            appData.trainer.state.notebookVersion = backup.key;
                          } else {
                            toast.add({ severity: "error", summary: "版本无内容", detail: `版本无内容，未加载: ${backup.key}`, life: 3000 });
                          }
                        },
                      }),
                    }),
                  ],
                }),

                // 标签页3: 提示词配置
                vnd(TabPanel, { value: 2 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "提示词模板管理",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => vnd(PromptTemplatesPanel, {
                        savedTemplates: appData.promptTemplates,
                        'onUpdate:templates': updatePromptTemplates,
                        onSave: savePromptTemplates
                      }),
                    }),
                  ],
                }),

                // 标签页4: 题库配置
                vnd(TabPanel, { value: 3 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "题库配置",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
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
                  ],
                }),

                // 标签页5: 说明和调试
                vnd(TabPanel, { value: 4 }, {
                  default: () => [
                    // MemoBoard
                    vnd(Panel, {
                      header: "SWOT: self-prompt training",
                      toggleable: true,
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        vnd(MemoBoard),
                      ],
                    }),
                  ],
                }),

                // 标签页6: 聊天记录
                vnd(TabPanel, { value: 6 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "聊天历史记录",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => vnd(ChatRecordsPanel, {
                        class: "w-100%",
                        currentChatId: null,
                        onSelectChat: (chat: any) => {
                          console.log("选择聊天记录", chat);
                          // 后续可以添加处理选中聊天记录的逻辑
                        },
                      }),
                    }),
                  ],
                }),

                // 标签页7: 存储管理
                vnd(TabPanel, { value: 5 }, {
                  default: () => [
                    vnd(StorageInfoPanel, {
                      class: "w-100%",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // FileUploadDialog remains outside the tabs as it's a modal dialog
        vnd(FileUploadDialog, {
          visible: showImportDialog.value,
          'onUpdate:visible': (value: boolean) => showImportDialog.value = value,
          title: "导入训练器数据",
          acceptedFileTypes: "application/json",
          onFileUploaded: handleFileUploaded,
        }),
      ]);
  }
});