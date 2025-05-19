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
import QuestionBankConfigPanel from './QuestionBankConfigPanel';
import AppConfigView from '../AppConfigView';
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

// import renderMarkdown from '@utils/md';
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

/**
 * AI训练系统组件
 * 
 * 这是一个AI训练系统的主组件，用于自我提示训练（Self-Prompt Training）。
 * 该系统允许用户通过笔记和问题训练AI模型，跟踪训练进度和性能，
 * 并提供各种工具来管理训练过程、笔记版本以及提示词模板等。
 */
export default defineComponent({
  name: "AITrainingSystem",
  components: { TrainingControlPanel, QuestionCard, CurrentNotePanel, NoteHistoryPanel, ChatRecordsPanel, AccuracyPanel },
  setup() {
    const toast = useToast();

    /**
     * 模型供应商表单数据
     * 
     * 管理AI模型供应商、API密钥和所选模型的状态
     */
    const supplierForm = reactive({
      selectedSupplier: suppliers[0] as SupplierDict,
      apiKeyDict: {} as Record<string, string>,
      supplierModelsDict: {} as Record<string, ModelDict[]>,
      selectedModelDict: {} as Record<string, ModelDict>,
    });

    /**
     * UI状态管理 - 在会话之间保持
     * 
     * 管理用户界面状态，如当前活动标签页索引
     */
    const uiData = reactive({
      activeTabIndex: 0, // Default to first tab (training)
    });

    /**
     * 应用程序数据
     * 
     * 存储训练器实例、问题集和提示词模板
     */
    const appData = reactive<{
      trainer?: SWOT | null;
      questions: QuestionEntry[];
      promptTemplates: any;
    }>({
      trainer: null,
      questions: [],
      promptTemplates: null,
    });      // 显示/隐藏文件上传对话框，用于导入训练器数据
    const showImportDialog = ref(false);

    // -------------------------------
    // 状态和计算属性
    // -------------------------------

    const quStateDict = computed(()=>appData?.trainer?.state?.quStateDict);
    const quDataDict = computed(()=>appData?.trainer?.state?.quDataDict);

    // 创建响应式的训练状态文本
    const trainingStateText = computed(() => {
      return appData.trainer?.getTrainingStateText() || "未开始";
    });

    // -------------------------------
    // 事件处理器和函数
    // -------------------------------

    /**
     * 加载训练题集
     * 
     * 从预定义数据源加载训练问题
     */
    const 加载训练题集 = () => {
      appData.questions = FIE2025_Training_Data_Standardized;
      // toast.add({ severity: "info", summary: "已加载", detail: `加载了 ${appData.questions.length} 题`, life: 1000 });
      // save("questions", appData.questions);
      // console.log("appData.questions", appData.questions);
    };

    const onProcessedDataImported = (qus: any[]) => {
      appData.questions = qus;
    };

    /**
     * 打印应用数据
     * 
     * 用于调试目的，将appData记录到控制台
     */
    const logAppData = () => {
      console.log("appData", appData);
    };

    /**
     * 打印UI数据
     * 
     * 用于调试目的，将uiData记录到控制台
     */
    const handleLogUiData = () => {
      console.log("UI State:", uiData);
    };

    /**
     * 保存应用数据
     * 
     * 将训练器状态保存到本地存储
     */
    const saveAppData = async () => {
      // 保存问题数据
      if (appData.questions && appData.questions.length) {
        await save("questions", appData.questions);
      }
      
      // 保存训练器状态
      if (!appData?.trainer?.isSWOT) {return;}
      const json = appData.trainer.toJSON(false);
      await save("trainer", json);
      console.log("json", json);
      console.log("appData.trainer", appData.trainer);
    };

    /**
     * 保存UI状态
     * 
     * 将UI状态保存到本地存储
     */
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
    
    /**
     * 保存提示词模板
     * 
     * 将提示词模板保存到本地存储
     */
    const savePromptTemplates = async () => {
      await save("promptTemplates", appData.promptTemplates);
      toast.add({ 
        severity: "success", 
        summary: "提示词模板已保存", 
        detail: `保存版本: ${appData.promptTemplates?.version || '未命名'}`, 
        life: 2000 
      });
    };
    
    /**
     * 更新提示词模板
     * 
     * 更新应用中的提示词模板，并在训练器中应用它们
     */
    const updatePromptTemplates = (templates: any) => {
      appData.promptTemplates = templates;
      
      // Update trainer's prompt templates if trainer exists
      if (appData.trainer) {
        appData.trainer.updatePromptTemplates(templates);
      }
    };

    /**
     * 导出训练器数据
     * 
     * 将训练器状态导出为JSON文件
     */
    const exportTrainerData = async () => {
      if (!appData?.trainer?.isSWOT) {return;}
      const json = appData.trainer.toJSON(false);
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const fileName = `SWOT_Trainer_${new Date().toISOString()}.json`;
      saveAs(blob, fileName);
      toast.add({ severity: "info", summary: "导出数据", detail: `已导出 ${fileName}`, life: 1000 });
    };

    /**
     * 导出问题
     * 
     * 将问题集导出为JSON文件
     */
    const exportQuestions = async () => {
      const blob = new Blob([JSON.stringify(appData.questions)], { type: 'application/json' });
      const fileName = `SWOT_Questions_${new Date().toISOString()}.json`;
      saveAs(blob, fileName);
      toast.add({ severity: "info", summary: "导出数据", detail: `已导出 ${fileName}`, life: 1000 });
    };

    /**
     * 切换导入对话框可见性
     * 
     * 显示用于导入训练器数据的文件上传对话框
     */
    const handleToggleImportDialog = () => {
      showImportDialog.value = true;
    };

    /**
     * 更新导入对话框可见性
     * 
     * 处理导入对话框可见性的更改
     */
    const handleUpdateImportDialogVisibility = (value: boolean) => {
      showImportDialog.value = value;
    };

    /**
     * 加载应用数据
     * 
     * 从本地存储中加载训练器状态、提示词模板和问题
     */
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

      const savedQuestions = await load("questions") as any[];
      if (savedQuestions?.length) {
        appData.questions = savedQuestions;
        appData.trainer.loadQuEntries(savedQuestions, false);
        toast.add({ severity: "info", summary: "已加载", detail: `加载了 ${appData.questions.length} 条已保存的题目`, life: 1000 });
      } else {
        await 加载训练题集();
        appData.trainer.loadQuEntries(appData.questions, false);
        toast.add({ severity: "info", summary: "从头加载", detail: `加载了 ${appData.questions.length} 条内置题目`, life: 1000 });
      }
      console.log("appData.questions", appData.questions);
    };

    /**
     * 更新选项
     * 
     * 更新训练器的选项
     */
    const updateOptions = (options: SWOTOptions) => {
      if (!appData.trainer) { return; }
      appData.trainer.assignOptions(options);
    };

    /**
     * 分析错误
     * 
     * 分析问题答案中的错误（UI演示功能）
     */
    const analyzeError = () => {
      toast.add({ severity: "info", summary: "UI演示", detail: "错误分析点击", life: 1000 });
    };

    /**
     * 处理文件上传
     * 
     * 处理导入的训练器数据文件
     */
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

    /**
     * 处理标签页变更
     * 
     * 当用户切换标签页时更新UI状态并保存
     */
    const handleTabChange = (index: number) => {
      uiData.activeTabIndex = index; // Update the reactive state
      saveUiData(); // Save UI state when switching tabs
    };

    /**
     * 处理当前笔记面板保存
     * 
     * 保存当前笔记并生成新的版本ID
     */
    const handleCurrentNotePanelSave = async () => {
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
    };

    /**
     * 处理笔记编辑器更新
     * 
     * 当笔记编辑器内容更新时更新训练器状态
     */
    const handleNotebookEditorUpdate = (newNotebook: any) => {
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
    };

    /**
     * 处理笔记编辑器保存
     * 
     * 保存笔记编辑器的内容
     */
    const handleNotebookEditorSave = async () => {
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
    };

    /**
     * 处理笔记历史版本选择
     * 
     * 从历史版本中加载选定的笔记版本
     */
    const handleSelectNoteVersion = (backup: any) => {
      if (!appData.trainer) return;
      console.log("准备加载笔记版本", backup);
      if (backup?.data?.entries?.length) {
        toast.add({ severity: "info", summary: "加载笔记版本", detail: `加载版本: ${backup.key}`, life: 1000 });
        appData.trainer.state.notebook = backup.data;
        appData.trainer.state.notebookVersion = backup.key;
      } else {
        toast.add({ severity: "error", summary: "版本无内容", detail: `版本无内容，未加载: ${backup.key}`, life: 3000 });
      }
    };

    /**
     * 处理聊天记录选择
     * 
     * 处理用户选择的聊天记录
     */
    const handleSelectChat = (chat: any) => {
      console.log("选择聊天记录", chat);
      // 后续可以添加处理选中聊天记录的逻辑
    };

    // -------------------------------
    // 生命周期钩子
    // -------------------------------

    /**
     * 组件挂载
     * 
     * 初始化加载设置、UI状态和应用数据
     */
    onMounted(async () => {
      const supplierForm_ = await appLoad("supplierForm");
      if (supplierForm_!=null) { Object.assign(supplierForm, supplierForm_); }
      
      const savedUiData = await load("uiData");
      if (savedUiData) {
        Object.assign(uiData, savedUiData);
        console.log("Loaded UI data:", uiData);
      }
      await sleep(1000);
      await loadAppData();
    });

    /**
     * 组件卸载
     * 
     * 保存UI状态和应用数据
     */
    onUnmounted(async () => {
      // Save UI data before unmounting
      await saveUiData();
      await saveAppData();
    });

    // -------------------------------
    // 渲染函数
    // -------------------------------

    return () =>
      vnd("div", { class: "container mx-auto ==px-4 ==py-6" }, [
        // 标签页导航系统 - 用于在不同功能区域之间切换
        vnd(Tabs, {
          // 使用PrimeVue Tabs组件
          value: uiData.activeTabIndex,
          'onUpdate:value': handleTabChange,
        }, {
          default: () => [
            // 标签列表 - 定义了各个功能区的标签
            vnd(TabList, { class: "mb-3" }, {
              default: () => [
                vnd(Tab, { value: 4, pt: { root: { class: 'font-bold' } } }, { default: () => "说明" }),
                vnd(Tab, { value: 7, pt: { root: { class: 'font-bold' } } }, { default: () => "模型接口配置" }),
                vnd(Tab, { value: 3, pt: { root: { class: 'font-bold' } } }, { default: () => "题库配置" }),
                vnd(Tab, { value: 2, pt: { root: { class: 'font-bold' } } }, { default: () => "提示词配置" }),
                vnd(Tab, { value: 0, pt: { root: { class: 'font-bold' } } }, { default: () => "训练与答题" }),
                vnd(Tab, { value: 1, pt: { root: { class: 'font-bold' } } }, { default: () => "笔记历史" }),
                vnd(Tab, { value: 6, pt: { root: { class: 'font-bold' } } }, { default: () => "聊天记录" }),
                vnd(Tab, { value: 5, pt: { root: { class: 'font-bold' } } }, { default: () => "存储管理" }),
              ]
            }),
            
            // 标签内容面板 - 每个标签对应的内容区
            vnd(TabPanels, {}, {
              default: () => [
                // 标签页1: 训练和做题功能 - 系统的主要操作界面
                vnd(TabPanel, { value: 0 }, {
                  default: () => [

                    // 调试工具面板 - 提供各种调试和数据操作按钮
                    vnd(Panel, {
                      header: "DEBUG",
                      toggleable: true,
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "调试工具面板"),
                          vnd("div", { class: "text-sm opacity-80" }, "这里提供各种调试和数据操作按钮，用于保存/加载应用状态、导出/导入训练器数据等")
                        ]),
                        vnd("div", {class: "stack-v"}, [
                          vnd("div", {class: "stack-h"}, [
                            vnd(ToolButton, { label: "saveAppData", icon: "pi pi-play", onClick: saveAppData, }),
                            vnd(ToolButton, { label: "loadAppData", icon: "pi pi-play", onClick: loadAppData, }),
                            vnd(ToolButton, { label: "logAppData", icon: "pi pi-play", onClick: logAppData, }),
                            vnd(ToolButton, { label: "logUiData", icon: "pi pi-info", onClick: handleLogUiData }),
                            vnd(ToolButton, { label: "saveUiData", icon: "pi pi-save", onClick: saveUiData }),
                            vnd(ToolButton, { label: "exportTrainerData", icon: "pi pi-download", onClick: exportTrainerData, }),
                            vnd(ToolButton, { label: "importTrainerData", icon: "pi pi-upload", onClick: handleToggleImportDialog }),
                            vnd(ToolButton, { label: "exportQuestions", icon: "pi pi-play", onClick: exportQuestions, }),
                          ]),
                        ]),
                      ],
                    }),

                    // 训练控制和正确率统计区域 - 包含训练控制面板和正确率统计
                    vnd("div", { class: "my-1.5rem! grid grid-cols-1 md:grid-cols-12 gap-4" }, [
                      vnd("div", { class: "col-span-1 md:col-span-6 xl:col-span-5 grid grid-cols-1 gap-4" }, [
                        // 训练控制面板 - 提供训练过程控制功能
                        vnd(Panel, {
                          header: "训练控制",
                          toggleable: true,
                          class: ["bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                        }, {
                          default: () => [
                            // 添加的解释卡片
                            vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                              vnd("div", { class: "font-medium" }, "控制AI训练流程和参数"),
                              vnd("div", { class: "text-sm opacity-80" }, "在此面板可调整训练参数、启动/暂停训练，并监控训练进度")
                            ]),
                            vnd(TrainingControlPanel, {
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
                            }),
                          ]
                        }),
                        
                        // 正确率统计面板 - 显示训练性能指标
                        vnd(AccuracyPanel, {
                          state: appData.trainer?.state,
                        })
                      ]),

                      // 题目笔记面板 - 显示和编辑当前笔记
                      vnd(Panel, {
                        header: "题目笔记",
                        toggleable: true,
                        class: ["col-span-1 md:col-span-6 xl:col-span-7", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                      }, {
                        default: () => [
                          // 添加的解释卡片
                          vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                            vnd("div", { class: "font-medium" }, "查看和编辑用于训练的笔记内容"),
                            vnd("div", { class: "text-sm opacity-80" }, "笔记是AI学习的核心内容，在这里可以查看和编辑笔记，追踪AI对笔记的修改建议")
                          ]),
                          vnd("div", {
                            class: "stack-v",
                          }, [
                            // 当前笔记面板 - 显示当前正在使用的笔记
                            vnd(CurrentNotePanel, {
                              class: "w-100%",
                              note: appData.trainer?.state?.notebook??null,
                              notebookEditPlan: appData.trainer?.state?.notebookEditPlan??null,
                              version: appData.trainer?.state?.notebookVersion,
                              onSaveNote: handleCurrentNotePanelSave,
                            }),
                            // 笔记编辑器 - 提供对笔记的编辑功能
                            vnd(NotebookEditor, {
                              class: "w-100% mb-4",
                              notebook: appData.trainer?.state?.notebook??null,
                              version: appData.trainer?.state?.notebookVersion,
                              "onUpdate:notebook": handleNotebookEditorUpdate,
                              onSave: handleNotebookEditorSave,
                            }),
                          ]),
                        ]
                      }),
                    ]),
                    
                    // 本次循环的答题情况 - 显示当前训练循环中的问题和回答
                    vnd(Panel, {
                      header: "本次循环的答题情况",
                      toggleable: true,
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "展示当前训练中的问题及AI的回答"),
                          vnd("div", { class: "text-sm opacity-80" }, "在这里可以查看本轮训练中AI处理的每个问题及其回答，包括正确与错误的情况")
                        ]),
                        vnd("div", {
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
                      ]
                    }),
                  ],
                }),

                // 标签页7: 模型接口管理
                vnd(TabPanel, { value: 7 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "模型接口管理",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "对模型接口进行管理"),
                          vnd("div", { class: "text-sm opacity-80" }, "管理模型接口")
                        ]),
                        vnd(AppConfigView, {}),
                      ]
                    }),
                  ],
                }),

                // 标签页2: 笔记历史版本 - 查看和管理历史笔记
                vnd(TabPanel, { value: 1 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "笔记历史版本",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "管理和恢复之前的笔记版本"),
                          vnd("div", { class: "text-sm opacity-80" }, "这里保存了所有历史笔记版本，可以查看笔记的演变过程，并在需要时恢复到之前的版本")
                        ]),
                        vnd(NoteHistoryPanel, {
                          class: "w-100%",
                          currentVersion: appData.trainer?.state?.notebookVersion,
                          onSelectVersion: handleSelectNoteVersion,
                        }),
                      ]
                    }),
                  ],
                }),

                // 标签页3: 提示词配置 - 管理和编辑提示词模板
                vnd(TabPanel, { value: 2 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "提示词模板管理",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "配置用于训练的提示词模板"),
                          vnd("div", { class: "text-sm opacity-80" }, "在这里可以编辑和管理用于训练过程中各个阶段的提示词模板，以优化AI的训练效果")
                        ]),
                        vnd(PromptTemplatesPanel, {
                          savedTemplates: appData.promptTemplates,
                          'onUpdate:templates': updatePromptTemplates,
                          onSave: savePromptTemplates
                        }),
                      ]
                    }),
                  ],
                }),

                // 标签页4: 题库配置 - 管理训练用的题目集
                vnd(TabPanel, { value: 3 }, {
                  default: () => [
                    // 添加的解释卡片
                    vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                      vnd("div", { class: "font-medium" }, "对题库进行配置"),
                      vnd("div", { class: "text-sm opacity-80" }, "在这里可以管理用于训练或测试的题库数据，配备了基础的数据格式相关功能")
                    ]),
                    vnd(QuestionBankConfigPanel, {
                      onProcessedDataImported: onProcessedDataImported,
                    }),
                    vnd(Panel, {
                      header: "内置题库快速加载",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",],
                      toggleable: true,
                      collapsed: false,
                    }, {
                      default: () => [
                        vnd("div", {
                          class: "stack-v",
                        }, [
                          vnd("div", { class: "stack-h"}, [
                            vnd(ToolButton, { 
                              label: "加载SpaCE2024训练题集",
                              icon: "pi pi-play",
                              class: "mr-0.5rem",
                            }),
                            vnd(ToolButton, { 
                              label: "加载FIE2025训练题集",
                              icon: "pi pi-play",
                              class: "mr-0.5rem",
                            }),
                          ]),
                        ]),
                      ]
                    }),
                  ],
                }),

                // 标签页5: 说明 - 系统的说明文档和备忘录
                vnd(TabPanel, { value: 4 }, {
                  default: () => [
                    // MemoBoard - 显示系统说明和使用指南
                    vnd(Panel, {
                      header: "SWOT: self-prompt training",
                      toggleable: true,
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "系统介绍和使用指南"),
                          vnd("div", { class: "text-sm opacity-80" }, "这里提供了系统的整体介绍、操作说明和背景知识，帮助用户了解和使用SWOT训练系统")
                        ]),
                        vnd(MemoBoard),
                      ],
                    }),
                  ],
                }),

                // 标签页6: 聊天记录 - 显示历史聊天记录
                vnd(TabPanel, { value: 6 }, {
                  default: () => [
                    vnd(Panel, {
                      header: "聊天历史记录",
                      class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
                    }, {
                      default: () => [
                        // 添加的解释卡片
                        vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                          vnd("div", { class: "font-medium" }, "查看和管理与AI模型的对话记录"),
                          vnd("div", { class: "text-sm opacity-80" }, "这里保存了与AI模型的历史对话记录，可以查看和分析之前的交互过程")
                        ]),
                        vnd(ChatRecordsPanel, {
                          class: "w-100%",
                          // currentChatId: null,
                          onSelectChat: handleSelectChat,
                        }),
                      ]
                    }),
                  ],
                }),

                // 标签页7: 存储管理 - 管理本地存储的数据
                vnd(TabPanel, { value: 5 }, {
                  default: () => [
                    // 添加的解释卡片
                    vnd("div", { class: "p-2 mb-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm border-l-4 border-blue-500" }, [
                      vnd("div", { class: "font-medium" }, "管理本地存储数据"),
                      vnd("div", { class: "text-sm opacity-80" }, "在这里可以查看和管理系统在本地存储的各种数据，包括清理和备份功能")
                    ]),
                    vnd(StorageInfoPanel, {
                      class: "w-100%",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // 文件上传对话框 - 用于导入训练器数据
        vnd(FileUploadDialog, {
          visible: showImportDialog.value,
          'onUpdate:visible': handleUpdateImportDialogVisibility,
          title: "导入训练器数据",
          acceptedFileTypes: "application/json",
          onFileUploaded: handleFileUploaded,
        }),
      ]);
  }
});
