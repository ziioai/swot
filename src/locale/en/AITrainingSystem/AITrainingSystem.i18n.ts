export default {
  trainingSystem: "AI Training System",
  modelProviderForm: {
    title: "Model Provider Form",
    description: "Manage AI model suppliers, API keys, and selected model statuses.",
  },
  uiStateManagement: {
    title: "UI State Management - Persisted Across Sessions",
    description: "Manage user interface states, such as the currently active tab index.",
  },
  applicationData: {
    title: "Application Data",
    description: "Store trainer instances, question sets, and prompt templates.",
  },
  importDialog: {
    show: "Show/hide file upload dialog for importing trainer data.",
  },
  trainingState: {
    notStarted: "Not Started",
  },
  actions: {
    loadTrainingQuestions: "Load Training Questions",
    loadTrainingQuestionsSummary: "Loaded",
    loadTrainingQuestionsDetail: "Loaded {count} questions",
    printAppData: "Print App Data",
    printUiData: "Print UI Data",
    saveAppData: "Save App Data",
    saveUiData: "Save UI Data",
    uiStateSaved: "UI State Saved",
    uiStateSavedDetail: "Saved current tab index: {index}",
    savePromptTemplates: "Save Prompt Templates",
    promptTemplatesSaved: "Prompt Templates Saved",
    promptTemplatesSavedDetail: "Saved version: {version}",
    updatePromptTemplates: "Update Prompt Templates",
    exportTrainerData: "Export Trainer Data",
    exportData: "Export Data",
    exportedFile: "Exported {fileName}",
    exportQuestions: "Export Questions",
    toggleImportDialog: "Toggle Import Dialog",
    updateImportDialogVisibility: "Update Import Dialog Visibility",
    loadAppData: "Load App Data",
    loaded: "Loaded",
    loadedTrainerState: "Loaded trainer state",
    swot: "SWOT",
    loadedPromptTemplates: "Loaded prompt templates:",
    defaultTemplates: "Default Templates",
    loadedSavedQuestions: "Loaded {count} saved questions",
    loadFromScratch: "Load from Scratch",
    loadedBuiltInQuestions: "Loaded {count} built-in questions",
    updateOptions: "Update Options",
    analyzeError: "Analyze Error",
    uiDemo: "UI Demo",
    errorAnalysisClicked: "Error analysis clicked",
    handleFileUploaded: "Handle File Uploaded",
    importFailed: "Import Failed",
    invalidFileContent: "Invalid file content",
    cannotParseJson: "Cannot parse JSON data",
    importSuccessful: "Import Successful",
    importSuccessfulDetail: "Successfully imported trainer data from file: {fileName}",
    importDataFailed: "Import data failed:",
    importErrorOccurred: "An error occurred while importing trainer data",
    handleTabChange: "Handle Tab Change",
    handleCurrentNotePanelSave: "Handle Current Note Panel Save",
    noteSaved: "Note Saved",
    noteSavedDetail: "Note saved, new version ID: {versionId}",
    saveNoteFailed: "Save note failed:",
    handleNotebookEditorUpdate: "Handle Notebook Editor Update",
    noteUpdated: "Note Updated",
    noteUpdatedDetail: "New version ID: {versionId}",
    handleNotebookEditorSave: "Handle Notebook Editor Save",
    handleSelectNoteVersion: "Handle Select Note Version",
    loadingNoteVersion: "Loading note version",
    loadVersion: "Load version: {key}",
    versionNoContent: "Version has no content",
    versionNotLoaded: "Version not loaded: {key}",
    handleSelectChat: "Handle Select Chat",
    selectedChatRecord: "Selected chat record",
  },
  lifecycle: {
    onMounted: "Component Mounted",
    onMountedDescription: "Initialize loading settings, UI state, and application data.",
    onUnmounted: "Component Unmounted",
    onUnmountedDescription: "Save UI state and application data.",
  },
  tabs: {
    description: "Description",
    modelInterfaceConfig: "Model Interface Config",
    questionBankConfig: "Question Bank Config",
    promptConfig: "Prompt Config",
    trainingAndAnswering: "Training & Answering",
    noteHistory: "Note History",
    chatRecords: "Chat Records",
    storageManagement: "Storage Management",
  },
  panels: {
    debugPanel: {
      header: "DEBUG (Visible in Development Mode Only)",
      title: "Debug Tool Panel",
      description: "Provides various debugging and data operation buttons for saving/loading application state, exporting/importing trainer data, etc."
    },
    trainingControlPanel: {
      header: "Training Control",
      title: "Control AI Training Flow and Parameters",
      description: "Adjust training parameters, start/pause training, and monitor training progress in this panel."
    },
    accuracyPanel: {
      header: "Accuracy Statistics"
    },
    questionNotesPanel: {
      header: "Question Notes",
      title: "View and Edit Note Content for Training",
      description: "Notes are the core content for AI learning. Here you can view and edit notes, and track AI's suggestions for note modifications."
    },
    currentLoopAnsweringPanel: {
      header: "Current Loop's Answering Situation",
      title: "Display Questions and AI's Answers in the Current Training",
      description: "Here you can view each question processed by the AI in the current training round and its answer, including correct and incorrect cases."
    },
    modelInterfaceManagementPanel: {
      header: "Model Interface Management",
      title: "Manage Model Interfaces",
      description: "Manage model interfaces."
    },
    noteHistoryPanel: {
      header: "Note History Versions",
      title: "Manage and Restore Previous Note Versions",
      description: "All historical note versions are saved here. You can view the evolution of notes and restore to a previous version if needed."
    },
    promptTemplatesPanel: {
      header: "Prompt Template Management",
      title: "Configure Prompt Templates for Training",
      description: "Edit and manage prompt templates for various stages of the training process to optimize AI training effectiveness."
    },
    questionBankConfigPanel: {
      title: "Configure Question Bank",
      description: "Manage question bank data for training or testing, equipped with basic data format related functions."
    },
    memoBoardPanel: {
      header: "SWOT"
    },
    chatHistoryPanel: {
      header: "Chat History Records",
      title: "View and Manage Chat Records with AI Models",
      description: "Historical chat records with AI models are saved here. You can view and analyze previous interaction processes."
    },
    storageManagementPanel: {
      title: "Manage Local Storage Data",
      description: "View and manage various data stored locally by the system, including cleaning and backup functions."
    }
  },
  dialogs: {
    importTrainerData: "Import Trainer Data"
  }
};
