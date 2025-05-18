// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, reactive, ref, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Panel from 'primevue/panel';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Tooltip from 'primevue/tooltip';
import Dialog from 'primevue/dialog';

import { save, load } from './swot-db-functions';
import FileUploadDialog from './components/FileUploadDialog';

// Import QuestionEntry type
import type { QuestionEntry } from './types';

// Define the question set type
type QuestionSetType = 'training' | 'validation' | 'test';

/**
 * Question Bank Configuration Panel Component
 * 
 * This component allows users to configure question banks by:
 * 1. Uploading question data files
 * 2. Configuring fields for nnid, content, and answer
 * 3. Adding additional fields to content
 * 4. Managing different question sets (training, validation, test)
 */
export default defineComponent({
  name: "QuestionBankConfigPanel",
  directives: {
    tooltip: Tooltip
  },
  props: {
    onQuestionsImported: {
      type: Function,
      required: false
    }
  },
  emits: ['questionsImported'],
  setup(props, { emit }) {
    const toast = useToast();
    
    // Show/hide file upload dialog
    const showImportDialog = ref(false);
    
    // Configuration for the question bank
    const configData = reactive({
      // Configuration for nnid generation
      nnidConfig: {
        sourceField: 'id',
        prefix: 'Demo'
      },
      // Fields to use for content and answer
      fieldMapping: {
        contentFields: ['instruction', 'text'],
        answerField: 'answer'
      },
      // Additional fields to include in content
      additionalFields: [] as string[],
      // Available fields (populated after file upload)
      availableFields: [] as string[],
      // Original data from the imported file
      originalData: [] as any[],
      // Processed data after applying configuration
      processedData: [] as QuestionEntry[],
      // Sample data for preview
      sampleData: null as any,
      // Question set type
      questionSetType: 'training' as QuestionSetType,
      // Question sets
      questionSets: {
        training: [] as QuestionEntry[],
        validation: [] as QuestionEntry[],
        test: [] as QuestionEntry[]
      }
    });
    
    // Dialog to preview the processed data
    const previewDialogVisible = ref(false);
    
    /**
     * Handle file upload
     */
    const handleFileUploaded = (fileData: { name: string, content: string | ArrayBuffer | null, file: File }) => {
      try {
        if (!fileData.content || typeof fileData.content !== 'string') {
          toast.add({ severity: "error", summary: "导入失败", detail: "文件内容无效", life: 3000 });
          return;
        }

        let jsonData: any[] = [];

        // Handle JSONL format (each line is a JSON object)
        if (fileData.name.endsWith('.jsonl')) {
          const lines = fileData.content.split('\n').filter(line => line.trim());
          jsonData = lines.map(line => JSON.parse(line));
        } else {
          // Regular JSON format
          jsonData = JSON.parse(fileData.content);
          if (!Array.isArray(jsonData)) {
            // Handle case where the file contains a single object with an array property
            // Find the first property that is an array
            const keys = Object.keys(jsonData);
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              if (Array.isArray(jsonData[key])) {
                jsonData = jsonData[key];
                break;
              }
            }
          }
        }
        
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          toast.add({ severity: "error", summary: "导入失败", detail: "未找到有效的数据数组", life: 3000 });
          return;
        }

        // Get all available fields from the first item
        const firstItem = jsonData[0];
        configData.availableFields = Object.keys(firstItem);
        
        // Set default field mappings based on available fields
        if (configData.availableFields.includes('id')) {
          configData.nnidConfig.sourceField = 'id';
        }
        
        // Try to determine content fields automatically
        configData.fieldMapping.contentFields = [];
        if (configData.availableFields.includes('instruction')) {
          configData.fieldMapping.contentFields.push('instruction');
        }
        if (configData.availableFields.includes('text')) {
          configData.fieldMapping.contentFields.push('text');
        }
        
        // Try to determine answer field automatically
        if (configData.availableFields.includes('answer')) {
          configData.fieldMapping.answerField = 'answer';
        }
        
        // Save the original data
        configData.originalData = jsonData;
        
        // Create a sample of the data
        configData.sampleData = jsonData[0];
        
        // Process the data
        processData();
        
        toast.add({
          severity: "success",
          summary: "导入成功",
          detail: `已成功导入 ${configData.originalData.length} 条数据`,
          life: 3000
        });
        
        // Save the configuration
        saveConfiguration();
        
      } catch (error: any) {
        console.error("导入文件失败:", error);
        toast.add({
          severity: "error",
          summary: "导入失败",
          detail: error.message || "无法解析文件内容",
          life: 3000
        });
      }
    };
    
    /**
     * Process the data based on the current configuration
     */
    const processData = () => {
      if (!configData.originalData.length) {
        return;
      }
      
      const { nnidConfig, fieldMapping, additionalFields, questionSetType } = configData;
      
      configData.processedData = configData.originalData.map(item => {
        // Create the nnid
        const sourceValue = item[nnidConfig.sourceField];
        const nnid = `${nnidConfig.prefix}[${sourceValue}]`;
        
        // Create the content
        const content: Record<string, any> = {};
        
        // Add primary content fields
        for (const field of fieldMapping.contentFields) {
          if (item[field] !== undefined) {
            content[field] = item[field];
          }
        }
        
        // Add additional fields
        for (const field of additionalFields) {
          if (item[field] !== undefined) {
            content[field] = item[field];
          }
        }
        
        // Add set type as metadata to help with identification
        content.setType = questionSetType;
        
        // Get the answer
        const answer = item[fieldMapping.answerField];
        
        return {
          nnid,
          content,
          answer,
        };
      });
    };
    
    /**
     * Handle import dialog visibility changes
     */
    const handleUpdateImportDialogVisibility = (value: boolean) => {
      showImportDialog.value = value;
    };
    
    /**
     * Open the import dialog
     */
    const openImportDialog = () => {
      showImportDialog.value = true;
    };
    
    /**
     * Save the current configuration and question sets
     */
    const saveConfiguration = async () => {
      await save("questionBankConfig", {
        nnidConfig: configData.nnidConfig,
        fieldMapping: configData.fieldMapping,
        additionalFields: configData.additionalFields,
        questionSets: configData.questionSets
      });
      
      toast.add({
        severity: "success",
        summary: "配置已保存",
        detail: "题库配置已保存到本地存储",
        life: 2000
      });
    };
    
    /**
     * Load the saved configuration and question sets
     */
    const loadConfiguration = async () => {
      const savedConfig = await load("questionBankConfig");
      if (savedConfig) {
        if (savedConfig.nnidConfig) {
          configData.nnidConfig = savedConfig.nnidConfig;
        }
        if (savedConfig.fieldMapping) {
          configData.fieldMapping = savedConfig.fieldMapping;
        }
        if (savedConfig.additionalFields) {
          configData.additionalFields = savedConfig.additionalFields;
        }
        if (savedConfig.questionSets) {
          configData.questionSets = savedConfig.questionSets;
        }
      }
    };
    
    /**
     * Apply the configuration and update the processed data
     */
    const applyConfiguration = () => {
      processData();
      
      // Update question sets based on selected type
      if (configData.processedData.length > 0 && isValidQuestionSetType(configData.questionSetType)) {
        configData.questionSets[configData.questionSetType] = configData.processedData;
      }
      
      saveConfiguration();
      
      toast.add({
        severity: "success",
        summary: "配置已应用",
        detail: `已处理 ${configData.processedData.length} 条数据并分配到${getQuestionSetTypeName(configData.questionSetType)}`,
        life: 2000
      });
    };
    
    /**
     * Get human-readable name for question set type
     */
    const getQuestionSetTypeName = (type: string): string => {
      const names: Record<string, string> = {
        training: '训练集',
        validation: '验证集',
        test: '测试集'
      };
      return names[type] || type;
    };
    
    /**
     * Handle importing data to a specific question set
     */
    const handleImportToSet = (setType: QuestionSetType) => {
      configData.questionSetType = setType;
      processData();
      configData.questionSets[setType] = configData.processedData;
      saveConfiguration();
      
      toast.add({
        severity: "success", 
        summary: `已添加到${getQuestionSetTypeName(setType)}`, 
        detail: `已将 ${configData.processedData.length} 条数据添加到${getQuestionSetTypeName(setType)}`, 
        life: 2000
      });
    };
    
    /**
     * Handle the final import of processed data from a specific set or all sets
     */
    const handleImportProcessedData = (setType?: QuestionSetType) => {
      let dataToImport: QuestionEntry[] = [];
      
      if (setType) {
        // Import specific set
        dataToImport = configData.questionSets[setType];
        if (!dataToImport.length) {
          toast.add({
            severity: "error",
            summary: "导入失败",
            detail: `${getQuestionSetTypeName(setType)}中没有可用的数据`,
            life: 3000
          });
          return;
        }
      } else {
        // Import all sets combined
        dataToImport = [
          ...configData.questionSets.training,
          ...configData.questionSets.validation,
          ...configData.questionSets.test
        ];
        
        if (!dataToImport.length) {
          toast.add({
            severity: "error",
            summary: "导入失败",
            detail: "没有可用的处理数据",
            life: 3000
          });
          return;
        }
      }
      
      // Emit the processed data
      emit('questionsImported', dataToImport);
      
      // Call the callback if it exists
      if (props.onQuestionsImported) {
        props.onQuestionsImported(dataToImport);
      }
      
      const setMessage = setType ? `${getQuestionSetTypeName(setType)}` : "所有题集";
      
      toast.add({
        severity: "success", 
        summary: "导入成功", 
        detail: `已导入 ${dataToImport.length} 条${setMessage}题目数据`, 
        life: 2000
      });
    };
    
    /**
     * Show the processed data preview
     */
    const showPreview = () => {
      if (!configData.processedData.length) {
        toast.add({
          severity: "error",
          summary: "预览失败",
          detail: "没有可用的处理数据",
          life: 3000
        });
        return;
      }
      
      previewDialogVisible.value = true;
    };

    /**
     * Get the total count of questions in all sets
     */
    const getTotalQuestionCount = (): number => {
      return configData.questionSets.training.length + 
             configData.questionSets.validation.length + 
             configData.questionSets.test.length;
    };
    
    // Type guard for questionSetType
    const isValidQuestionSetType = (type: string): type is QuestionSetType => {
      return ['training', 'validation', 'test'].includes(type);
    };
    
    // Load saved configuration on mount
    onMounted(async () => {
      await loadConfiguration();
    });
    
    // Watch for changes in configuration and reprocess data
    watch([
      () => configData.nnidConfig.sourceField,
      () => configData.nnidConfig.prefix,
      () => configData.fieldMapping.contentFields,
      () => configData.fieldMapping.answerField,
      () => configData.additionalFields
    ], () => {
      if (configData.originalData.length) {
        processData();
      }
    });
    
    return () => vnd("div", { class: "stack-v gap-4" }, [
      // Main configuration panel
      vnd(Panel, {
        header: "题库文件导入",
        toggleable: true,
        class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
      }, {
        default: () => vnd("div", { class: "stack-v gap-4" }, [
          // Action buttons for importing files
          vnd("div", { class: "flex justify-between items-center mb-4" }, [
            vnd("div", { class: "text-sm text-gray-600 dark:text-gray-400" }, "导入题库文件（支持JSON和JSONL格式）"),
            vnd("div", { class: "stack-h gap-2" }, [
              vnd(Button, {
                label: "导入题库文件",
                icon: "pi pi-upload",
                onClick: openImportDialog
              })
            ])
          ]),
          
          // Question set type selection
          vnd("div", { class: "mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md" }, [
            vnd("div", { class: "font-medium mb-2" }, "题库集类型选择:"),
            vnd("div", { class: "flex flex-wrap gap-4" }, [
              vnd("div", { class: "flex items-center" }, [
                vnd("input", {
                  type: "radio",
                  id: "training-set",
                  name: "question-set-type",
                  value: "training",
                  class: "mr-2",
                  checked: configData.questionSetType === "training",
                  onChange: () => {
                    configData.questionSetType = "training";
                  }
                }),
                vnd("label", { for: "training-set", class: "cursor-pointer" }, [
                  "训练集 ",
                  vnd("span", { class: "text-sm text-gray-500" }, 
                    `(${configData.questionSets.training.length} 题)`)
                ])
              ]),
              vnd("div", { class: "flex items-center" }, [
                vnd("input", {
                  type: "radio",
                  id: "validation-set",
                  name: "question-set-type",
                  value: "validation",
                  class: "mr-2",
                  checked: configData.questionSetType === "validation",
                  onChange: () => {
                    configData.questionSetType = "validation";
                  }
                }),
                vnd("label", { for: "validation-set", class: "cursor-pointer" }, [
                  "验证集 ",
                  vnd("span", { class: "text-sm text-gray-500" }, 
                    `(${configData.questionSets.validation.length} 题)`)
                ])
              ]),
              vnd("div", { class: "flex items-center" }, [
                vnd("input", {
                  type: "radio",
                  id: "test-set",
                  name: "question-set-type",
                  value: "test",
                  class: "mr-2",
                  checked: configData.questionSetType === "test",
                  onChange: () => {
                    configData.questionSetType = "test";
                  }
                }),
                vnd("label", { for: "test-set", class: "cursor-pointer" }, [
                  "测试集 ",
                  vnd("span", { class: "text-sm text-gray-500" }, 
                    `(${configData.questionSets.test.length} 题)`)
                ])
              ])
            ])
          ]),
          
          // NNID Configuration
          vnd("div", { class: "mb-4" }, [
            vnd("div", { class: "font-medium mb-2" }, "NNID 配置:"),
            vnd("div", { class: "grid grid-cols-2 gap-4" }, [
              vnd("div", {}, [
                vnd("label", { class: "block text-sm mb-1" }, "来源字段"),
                vnd(Dropdown, {
                  options: configData.availableFields,
                  modelValue: configData.nnidConfig.sourceField,
                  "onUpdate:modelValue": (v: string) => configData.nnidConfig.sourceField = v,
                  placeholder: "选择ID来源字段",
                  class: "w-full"
                })
              ]),
              vnd("div", {}, [
                vnd("label", { class: "block text-sm mb-1" }, "NNID前缀"),
                vnd(InputText, {
                  modelValue: configData.nnidConfig.prefix,
                  "onUpdate:modelValue": (v: string) => configData.nnidConfig.prefix = v,
                  placeholder: "输入NNID前缀",
                  class: "w-full"
                })
              ])
            ])
          ]),
          
          // Content and answer field mapping
          vnd("div", { class: "mb-4" }, [
            vnd("div", { class: "font-medium mb-2" }, "字段映射:"),
            vnd("div", { class: "grid grid-cols-2 gap-4" }, [
              vnd("div", {}, [
                vnd("label", { class: "block text-sm mb-1" }, "内容字段"),
                vnd(MultiSelect, {
                  options: configData.availableFields,
                  modelValue: configData.fieldMapping.contentFields,
                  "onUpdate:modelValue": (v: string[]) => configData.fieldMapping.contentFields = v,
                  placeholder: "选择内容字段",
                  class: "w-full"
                })
              ]),
              vnd("div", {}, [
                vnd("label", { class: "block text-sm mb-1" }, "答案字段"),
                vnd(Dropdown, {
                  options: configData.availableFields,
                  modelValue: configData.fieldMapping.answerField,
                  "onUpdate:modelValue": (v: string) => configData.fieldMapping.answerField = v,
                  placeholder: "选择答案字段",
                  class: "w-full"
                })
              ])
            ])
          ]),
          
          // Additional fields to include
          vnd("div", { class: "mb-4" }, [
            vnd("div", { class: "font-medium mb-2" }, "额外字段:"),
            vnd(MultiSelect, {
              options: configData.availableFields.filter(field => 
                !configData.fieldMapping.contentFields.includes(field) && 
                field !== configData.fieldMapping.answerField
              ),
              modelValue: configData.additionalFields,
              "onUpdate:modelValue": (v: string[]) => configData.additionalFields = v,
              placeholder: "选择要包含的额外字段",
              class: "w-full"
            })
          ]),
          
          // Action buttons for configuration
          vnd("div", { class: "flex justify-end gap-2" }, [
            vnd(Button, {
              label: "应用配置",
              icon: "pi pi-cog",
              class: "mr-2",
              onClick: applyConfiguration,
            }),
            vnd(Button, {
              label: "预览数据",
              icon: "pi pi-eye",
              class: "",
              onClick: showPreview,
              disabled: configData.processedData.length === 0
            })
          ]),
          
          // Quick import buttons
          vnd("div", { class: "mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md" }, [
            vnd("div", { class: "font-medium mb-2" }, "快速导入到题库:"),
            vnd("div", { class: "flex flex-wrap gap-2" }, [
              vnd(Button, {
                label: "快速导入到训练集",
                icon: "pi pi-bolt",
                severity: "success",
                outlined: true,
                onClick: () => {
                  configData.questionSetType = "training";
                  saveConfiguration();
                  handleImportToSet("training");
                  toast.add({
                    severity: "success",
                    summary: `已添加到${getQuestionSetTypeName(configData.questionSetType)}`,
                    detail: `已将 ${configData.processedData.length} 条数据添加到训练集`,
                    life: 2000
                  });
                }
              }),
              vnd(Button, {
                label: "快速导入到验证集",
                icon: "pi pi-bolt",
                severity: "info",
                outlined: true,
                onClick: () => {
                  configData.questionSetType = "validation";
                  saveConfiguration();
                  handleImportToSet("validation");
                  toast.add({
                    severity: "success",
                    summary: `已添加到${getQuestionSetTypeName(configData.questionSetType)}`,
                    detail: `已将 ${configData.processedData.length} 条数据添加到验证集`,
                    life: 2000
                  });
                }
              }),
              vnd(Button, {
                label: "快速导入到测试集",
                icon: "pi pi-bolt",
                severity: "warning",
                outlined: true,
                onClick: () => {
                  configData.questionSetType = "test";
                  saveConfiguration();
                  handleImportToSet("test");
                  toast.add({
                    severity: "success",
                    summary: `已添加到${getQuestionSetTypeName(configData.questionSetType)}`,
                    detail: `已将 ${configData.processedData.length} 条数据添加到测试集`,
                    life: 2000
                  });
                }
              })
            ])
          ])
        ])
      }),
      
      // Question sets management panel
      getTotalQuestionCount() > 0 ? vnd(Panel, {
        header: "题库集管理",
        toggleable: true,
        class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
      }, {
        default: () => vnd("div", { class: "stack-v gap-4" }, [
          // Training set
          vnd("div", { class: "p-3 bg-gray-50 dark:bg-gray-800 rounded-md" }, [
            vnd("div", { class: "font-medium mb-2" }, `训练集 (${configData.questionSets.training.length} 题)`),
            vnd("div", { class: "flex justify-between items-center" }, [
              vnd("div", { class: "text-sm opacity-80" }, `共 ${configData.questionSets.training.length} 条数据`),
              configData.questionSets.training.length > 0 ? vnd(Button, {
                label: "导入训练集",
                icon: "pi pi-download",
                size: "small",
                class: "mt-2",
                onClick: () => handleImportProcessedData('training')
              }) : null
            ])
          ]),
          
          // Validation set
          vnd("div", { class: "p-3 bg-gray-50 dark:bg-gray-800 rounded-md" }, [
            vnd("div", { class: "font-medium mb-2" }, `验证集 (${configData.questionSets.validation.length} 题)`),
            vnd("div", { class: "flex justify-between items-center" }, [
              vnd("div", { class: "text-sm opacity-80" }, `共 ${configData.questionSets.validation.length} 条数据`),
              configData.questionSets.validation.length > 0 ? vnd(Button, {
                label: "导入验证集",
                icon: "pi pi-download",
                size: "small",
                class: "mt-2",
                onClick: () => handleImportProcessedData('validation')
              }) : null
            ])
          ]),
          
          // Test set
          vnd("div", { class: "p-3 bg-gray-50 dark:bg-gray-800 rounded-md" }, [
            vnd("div", { class: "font-medium mb-2" }, `测试集 (${configData.questionSets.test.length} 题)`),
            vnd("div", { class: "flex justify-between items-center" }, [
              vnd("div", { class: "text-sm opacity-80" }, `共 ${configData.questionSets.test.length} 条数据`),
              configData.questionSets.test.length > 0 ? vnd(Button, {
                label: "导入测试集",
                icon: "pi pi-download",
                size: "small",
                class: "mt-2",
                onClick: () => handleImportProcessedData('test')
              }) : null
            ])
          ]),
          
          // Import all data
          vnd("div", { class: "flex justify-end" }, [
            vnd(Button, {
              label: "导入全部题目",
              icon: "pi pi-download",
              onClick: () => handleImportProcessedData(),
              severity: "info",
              disabled: getTotalQuestionCount() === 0
            })
          ])
        ])
      }) : null,
      
      // File upload dialog
      vnd(FileUploadDialog, {
        title: "导入题库文件",
        visible: showImportDialog.value,
        acceptedFileTypes: ".json,.jsonl,application/json",
        onFileUploaded: handleFileUploaded,
        onUpdateVisibility: handleUpdateImportDialogVisibility
      }),
      
      // Preview dialog
      vnd(Dialog, {
        header: "处理后的数据预览",
        visible: previewDialogVisible.value,
        onHide: () => previewDialogVisible.value = false,
        style: { width: '80vw' },
        maximizable: true,
        modal: true
      }, {
        default: () => vnd("div", { class: "preview-dialog-content" }, [
          // Preview of processed data (first item)
          configData.processedData.length > 0 ? [
            vnd("div", { class: "mb-4" }, [
              vnd("div", { class: "text-sm font-medium mb-2" }, `预览（共 ${configData.processedData.length} 条数据）：`),
              vnd("div", { class: "bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto" }, [
                vnd("pre", { class: "text-sm" }, JSON.stringify(configData.processedData[0], null, 2))
              ])
            ])
          ] : vnd("div", { class: "text-center p-4" }, "没有可用的处理数据")
        ])
      })
    ]);
  }
});
