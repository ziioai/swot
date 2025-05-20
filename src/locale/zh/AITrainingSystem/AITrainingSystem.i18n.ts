export default {
  trainingSystem: "AI训练系统",
  modelProviderForm: {
    title: "模型供应商表单",
    description: "管理AI模型供应商、API密钥和所选模型的状态。",
  },
  uiStateManagement: {
    title: "UI状态管理 - 在会话之间保持",
    description: "管理用户界面状态，如当前活动标签页索引。",
  },
  applicationData: {
    title: "应用程序数据",
    description: "存储训练器实例、问题集和提示词模板。",
  },
  importDialog: {
    show: "显示/隐藏文件上传对话框，用于导入训练器数据。",
  },
  trainingState: {
    notStarted: "未开始",
  },
  actions: {
    loadTrainingQuestions: "加载训练题集",
    loadTrainingQuestionsSummary: "已加载",
    loadTrainingQuestionsDetail: "加载了 {count} 题",
    printAppData: "打印应用数据",
    printUiData: "打印UI数据",
    saveAppData: "保存应用数据",
    saveUiData: "保存UI数据",
    uiStateSaved: "UI状态已保存",
    uiStateSavedDetail: "已保存当前标签页索引: {index}",
    savePromptTemplates: "保存提示词模板",
    promptTemplatesSaved: "提示词模板已保存",
    promptTemplatesSavedDetail: "保存版本: {version}",
    updatePromptTemplates: "更新提示词模板",
    exportTrainerData: "导出训练器数据",
    exportData: "导出数据",
    exportedFile: "已导出 {fileName}",
    exportQuestions: "导出问题",
    toggleImportDialog: "切换导入对话框可见性",
    updateImportDialogVisibility: "更新导入对话框可见性",
    loadAppData: "加载应用数据",
    loaded: "已加载",
    loadedTrainerState: "已加载训练器状态",
    swot: "SWOT",
    loadedPromptTemplates: "加载的提示词模板:",
    defaultTemplates: "默认模板",
    loadedSavedQuestions: "加载了 {count} 条已保存的题目",
    loadFromScratch: "从头加载",
    loadedBuiltInQuestions: "加载了 {count} 条内置题目",
    updateOptions: "更新选项",
    analyzeError: "分析错误",
    uiDemo: "UI演示",
    errorAnalysisClicked: "错误分析点击",
    handleFileUploaded: "处理文件上传",
    importFailed: "导入失败",
    invalidFileContent: "文件内容无效",
    cannotParseJson: "无法解析 JSON 数据",
    importSuccessful: "导入成功",
    importSuccessfulDetail: "成功导入训练器数据，来自文件: {fileName}",
    importDataFailed: "导入数据失败:",
    importErrorOccurred: "导入训练器数据时发生错误",
    handleTabChange: "处理标签页变更",
    handleCurrentNotePanelSave: "处理当前笔记面板保存",
    noteSaved: "笔记保存",
    noteSavedDetail: "笔记已保存，新版本标识: {versionId}",
    saveNoteFailed: "保存笔记失败:",
    handleNotebookEditorUpdate: "处理笔记编辑器更新",
    noteUpdated: "笔记已更新",
    noteUpdatedDetail: "新版本标识: {versionId}",
    handleNotebookEditorSave: "处理笔记编辑器保存",
    handleSelectNoteVersion: "处理笔记历史版本选择",
    loadingNoteVersion: "准备加载笔记版本",
    loadVersion: "加载版本: {key}",
    versionNoContent: "版本无内容",
    versionNotLoaded: "版本无内容，未加载: {key}",
    handleSelectChat: "处理对话记录选择",
    selectedChatRecord: "选择对话记录",
  },
  lifecycle: {
    onMounted: "组件挂载",
    onMountedDescription: "初始化加载设置、UI状态和应用数据。",
    onUnmounted: "组件卸载",
    onUnmountedDescription: "保存UI状态和应用数据。",
  },
  tabs: {
    description: "说明",
    modelInterfaceConfig: "模型接口配置",
    questionBankConfig: "题库配置",
    promptConfig: "提示词配置",
    trainingAndAnswering: "训练与答题",
    noteHistory: "笔记历史",
    chatRecords: "对话记录",
    storageManagement: "存储管理",
  },
  panels: {
    debugPanel: {
      header: "DEBUG（仅开发模式可见）",
      title: "调试工具面板",
      description: "这里提供各种调试和数据操作按钮，用于保存/加载应用状态、导出/导入训练器数据等"
    },
    trainingControlPanel: {
      header: "训练控制",
      title: "控制AI训练流程和参数",
      description: "在此面板可调整训练参数、启动/暂停训练，并监控训练进度"
    },
    accuracyPanel: {
      header: "正确率统计"
    },
    questionNotesPanel: {
      header: "题目笔记",
      title: "查看和编辑用于训练的笔记内容",
      description: "笔记是AI学习的核心内容，在这里可以查看和编辑笔记，追踪AI对笔记的修改建议"
    },
    currentLoopAnsweringPanel: {
      header: "本次循环的答题情况",
      title: "展示当前训练中的问题及AI的回答",
      description: "在这里可以查看本轮训练中AI处理的每个问题及其回答，包括正确与错误的情况"
    },
    modelInterfaceManagementPanel: {
      header: "模型接口管理",
      title: "对模型接口进行管理",
      description: "管理模型接口"
    },
    noteHistoryPanel: {
      header: "笔记历史版本",
      title: "管理和恢复之前的笔记版本",
      description: "这里保存了所有历史笔记版本，可以查看笔记的演变过程，并在需要时恢复到之前的版本"
    },
    promptTemplatesPanel: {
      header: "提示词模板管理",
      title: "配置用于训练的提示词模板",
      description: "在这里可以编辑和管理用于训练过程中各个阶段的提示词模板，以优化AI的训练效果"
    },
    questionBankConfigPanel: {
      title: "对题库进行配置",
      description: "在这里可以管理用于训练或测试的题库数据，配备了基础的数据格式相关功能"
    },
    memoBoardPanel: {
      header: "SWOT"
    },
    chatHistoryPanel: {
      header: "对话历史记录",
      title: "查看和管理与AI模型的对话记录",
      description: "这里保存了与AI模型的历史对话记录，可以查看和分析之前的交互过程"
    },
    storageManagementPanel: {
      title: "管理本地存储数据",
      description: "在这里可以查看和管理系统在本地存储的各种数据，包括清理和备份功能"
    }
  },
  dialogs: {
    importTrainerData: "导入训练器数据"
  }
};
