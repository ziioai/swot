// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, reactive, ref, onMounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Panel from 'primevue/panel';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Tooltip from 'primevue/tooltip';
// import Dialog from 'primevue/dialog';
// Accordion and AccordionTab imports removed as they are replaced by Panel
import Fieldset from 'primevue/fieldset';

// Assuming swot-db-functions and FileUploadDialog are in the same directory or adjust path
// For now, we mock save/load. Replace with actual implementation if available.
// const mockDb = new Map<string, any>();
// const save = async (key: string, data: any) => { mockDb.set(key, data); };
// const load = async (key: string) => { return mockDb.get(key); };
// import { save, load } from './swot-db-functions';
import FileUploadDialog from './components/FileUploadDialog'; // Adjust path if necessary


// Define the processed entry structure
interface ProcessedEntry {
  nnid: string;
  content: Record<string, any>;
  explain?: Record<string, any>;
  answer: any;
}

export default defineComponent({
  name: "QuestionBankConfigPanel",
  directives: {
    tooltip: Tooltip
  },
  emits: ['processedDataImported'],
  setup(_props, { emit }) {
    const toast = useToast();
    const showImportDialog = ref(false);
    const newContentFieldOption = ref(''); // New ref for the custom option input
    const exportConfigFilename = ref('question-bank-config.json'); // New ref for export filename

    const configData = reactive({
      nnidConfig: {
        sourceField: '',
        prefix: '[NNID]'
      },
      fieldMapping: {
        contentFields: [] as string[],
        explainFields: [] as string[],
        answerField: ''
      },
      additionalContentFields: [] as { key: string, value: string }[],
      availableFields: [] as string[],
      originalData: [] as any[],
      processedData: [] as ProcessedEntry[],
      previewSamples: {
        original: [] as any[],
        processed: [] as ProcessedEntry[]
      }
    });

    const addCustomContentFieldOption = () => {
      const newValue = newContentFieldOption.value.trim();
      if (newValue) {
        if (!configData.availableFields.includes(newValue)) {
          configData.availableFields.push(newValue);
          // Optionally, automatically select the new field in contentFields:
          // if (!configData.fieldMapping.contentFields.includes(newValue)) {
          //   configData.fieldMapping.contentFields.push(newValue);
          // }
          toast.add({ severity: 'success', summary: '选项已添加', detail: `字段 "${newValue}" 已成功添加。`, life: 2000 });
          newContentFieldOption.value = ''; // Clear the input
        } else {
          toast.add({ severity: 'info', summary: '选项已存在', detail: `字段 "${newValue}" 已经存在。`, life: 2000 });
        }
      } else {
        toast.add({ severity: 'warn', summary: '输入无效', detail: '选项名称不能为空。', life: 2000 });
      }
    };

    // const previewDialogVisible = ref(false);

    const handleFileUploaded = (fileData: { name: string, content: string | ArrayBuffer | null, file: File }) => {
      try {
        if (!fileData.content || typeof fileData.content !== 'string') {
          toast.add({ severity: "error", summary: "导入失败", detail: "无效的文件内容。", life: 3000 });
          return;
        }

        let jsonData: any[];
        if (fileData.name.endsWith('.jsonl')) {
          const lines = fileData.content.split('\n').filter(line => line.trim());
          jsonData = lines.map(line => JSON.parse(line));
        } else if (fileData.name.endsWith('.json')) {
          jsonData = JSON.parse(fileData.content);
        } else {
          toast.add({ severity: "error", summary: "导入失败", detail: "不支持的文件类型。请使用 JSON 或 JSONL。", life: 3000 });
          return;
        }
        
        if (!Array.isArray(jsonData)) {
            // Handle case where the file contains a single object with an array property
            const keys = Object.keys(jsonData);
            let foundArray = false;
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              if (Array.isArray((jsonData as any)[key])) {
                jsonData = (jsonData as any)[key];
                foundArray = true;
                break;
              }
            }
            if (!foundArray || !Array.isArray(jsonData)) {
                 toast.add({ severity: "error", summary: "导入失败", detail: "在 JSON 中找不到有效的数据数组。", life: 3000 });
                 return;
            }
        }

        if (jsonData.length === 0) {
          toast.add({ severity: "error", summary: "导入失败", detail: "文件中未找到数据。", life: 3000 });
          return;
        }

        configData.originalData = jsonData;
        configData.availableFields = Object.keys(jsonData[0] || {});
        // Reset dependent fields if new file uploaded
        configData.nnidConfig.sourceField = configData.availableFields.includes('id') ? 'id' : (configData.availableFields[0] || '');
        configData.fieldMapping.contentFields = [];
        configData.fieldMapping.explainFields = [];
        configData.fieldMapping.answerField = configData.availableFields.includes('answer') ? 'answer' : (configData.availableFields[0] || '');
        
        processAndPreviewData();
        // saveCurrentConfig(); // Removed call to saveCurrentConfig

        toast.add({
          severity: "success",
          summary: "导入成功",
          detail: `成功导入 ${jsonData.length} 条记录。`,
          life: 3000
        });
        showImportDialog.value = false;
      } catch (error: any) {
        console.error("文件导入失败:", error);
        toast.add({
          severity: "error",
          summary: "导入失败",
          detail: error.message || "无法解析文件内容。",
          life: 3000
        });
      }
    };

    const processAndPreviewData = () => {
      if (!configData.originalData.length) {
        configData.processedData = [];
        configData.previewSamples.original = [];
        configData.previewSamples.processed = [];
        return;
      }

      const { nnidConfig, fieldMapping, additionalContentFields } = configData;
      
      configData.processedData = configData.originalData.map(item => {
        const nnid = `${nnidConfig.prefix}${item[nnidConfig.sourceField] || 'N/A'}`;
        
        const content: Record<string, any> = {};
        fieldMapping.contentFields.forEach(field => {
          if (item[field] !== undefined) content[field] = item[field];
        });
        additionalContentFields.forEach(pair => {
          if (pair.key.trim()) content[pair.key.trim()] = pair.value;
        });

        let explain: Record<string, any> | undefined = undefined;
        if (fieldMapping.explainFields.length > 0) {
          explain = {};
          fieldMapping.explainFields.forEach(field => {
            if (item[field] !== undefined) explain![field] = item[field];
          });
        }
        
        const answer = item[fieldMapping.answerField] !== undefined ? item[fieldMapping.answerField] : null;

        return { nnid, content, explain, answer };
      });

      // Update preview samples
      configData.previewSamples.original = configData.originalData.slice(0, 3);
      configData.previewSamples.processed = configData.processedData.slice(0, 3);
    };
    
    const addAdditionalField = () => {
      configData.additionalContentFields.push({ key: '', value: '' });
    };

    const removeAdditionalField = (index: number) => {
      configData.additionalContentFields.splice(index, 1);
      processAndPreviewData(); // Re-process on removal
    };

    // const saveCurrentConfig = async () => {
    //   try {
    //     await save("newQuestionBankConfig", {
    //       nnidConfig: configData.nnidConfig,
    //       fieldMapping: configData.fieldMapping,
    //       additionalContentFields: configData.additionalContentFields
    //     });
    //     toast.add({ severity: 'success', summary: '配置已保存', detail: '预处理配置已保存。', life: 2000 });
    //   } catch (_error) {
    //     toast.add({ severity: 'error', summary: '保存失败', detail: '无法保存配置。', life: 3000 });
    //   }
    // };

    // const loadSavedConfig = async () => {
    //   try {
    //     const saved = await load("newQuestionBankConfig");
    //     if (saved) {
    //       configData.nnidConfig = saved.nnidConfig || configData.nnidConfig;
    //       configData.fieldMapping = saved.fieldMapping || configData.fieldMapping;
    //       configData.additionalContentFields = saved.additionalContentFields || configData.additionalContentFields;
    //       toast.add({ severity: 'info', summary: '配置已加载', detail: '先前保存的配置已加载。', life: 2000 });
    //     }
    //   } catch (_error) {
    //      toast.add({ severity: 'warn', summary: '加载失败', detail: '无法加载保存的配置。', life: 3000 });
    //   }
    // };


    const exportConfig = () => {
      try {
        const configToExport = {
          nnidConfig: configData.nnidConfig,
          fieldMapping: configData.fieldMapping,
          additionalContentFields: configData.additionalContentFields
        };
        const jsonString = JSON.stringify(configToExport, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        // Use the value from the ref, ensuring it ends with .json
        let filename = exportConfigFilename.value.trim();
        if (!filename) {
          filename = "question-bank-config.json"; // Default if empty
        }
        if (!filename.toLowerCase().endsWith('.json')) {
          filename += '.json';
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: '配置已导出', detail: `预处理配置已导出为 ${filename}。`, life: 3000 });
      } catch (error) {
        console.error("导出配置失败:", error);
        toast.add({ severity: 'error', summary: '导出失败', detail: '无法导出配置。', life: 3000 });
      }
    };


    const emitProcessedData = () => {
      if (!configData.processedData.length) {
        toast.add({ severity: 'warn', summary: '无数据', detail: '没有可导入的处理数据。', life: 3000 });
        return;
      }
      emit('processedDataImported', _.cloneDeep(configData.processedData));
      toast.add({ severity: 'success', summary: '数据已发出', detail: `已发出 ${configData.processedData.length} 条处理记录。`, life: 3000 });
    };

    onMounted(() => {
      // loadSavedConfig(); // Removed call to loadSavedConfig
    });

    watch(
      () => [
        _.cloneDeep(configData.nnidConfig),
        _.cloneDeep(configData.fieldMapping),
        _.cloneDeep(configData.additionalContentFields)
      ],
      () => {
        processAndPreviewData();
      },
      { deep: true }
    );
    
    const availableFieldsOptions = computed(() => {
      return configData.availableFields.map(field => ({ label: field, value: field }));
    });

    return () => vnd("div", { class: "stack-v gap-4 my-1.5rem" }, [
      vnd(Panel, {
        header: "题库导入与预处理",
        toggleable: true,
        class:"w-full bg-zinc-100/75! dark:bg-zinc-800/75!",
      }, {
        default: () => vnd("div", { class: "stack-v gap-6" }, [
          // 1. File Upload
          vnd("div", { class: "flex justify-between items-center gap-2" }, [
            vnd("span", {}, "导入题目数据 (JSON 或 JSONL):"),
            vnd(Button, { label: "上传文件", icon: "pi pi-upload", onClick: () => showImportDialog.value = true })
          ]),

          // Replaced Accordion with a series of Panels
          ...(configData.originalData.length > 0
            ? [
                vnd(Panel, { header: "预处理配置", toggleable: true, class: "mt-4 w-full" }, {
                  default: () => vnd("div", { class: "stack-v gap-4 p-fluid" }, [
                    // 2. NNID Configuration
                    vnd(Fieldset, { legend: "NNID 配置", toggleable: true }, {
                      default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, [
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "nnidSource" }, "NNID 源字段"),
                          vnd(Select, {
                            inputId: "nnidSource",
                            options: availableFieldsOptions.value,
                            modelValue: configData.nnidConfig.sourceField,
                            "onUpdate:modelValue": (v: string) => configData.nnidConfig.sourceField = v,
                            placeholder: "选择 NNID 源",
                            optionLabel: "label",
                            optionValue: "value",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "nnidPrefix" }, "NNID 前缀"),
                          vnd(InputText, {
                            id: "nnidPrefix",
                            modelValue: configData.nnidConfig.prefix,
                            "onUpdate:modelValue": (v: string) => configData.nnidConfig.prefix = v,
                            placeholder: "输入 NNID 前缀"
                          })
                        ])
                      ])
                    }),

                    // 3. Field Mapping
                    vnd(Fieldset, { legend: "字段映射", toggleable: true }, {
                       default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "contentFields" }, "内容字段"),
                          vnd(MultiSelect, {
                            inputId: "contentFields",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.contentFields,
                            "onUpdate:modelValue": (v: string[]) => configData.fieldMapping.contentFields = v,
                            placeholder: "选择内容字段",
                            optionLabel: "label",
                            optionValue: "value",
                            display: "chip",
                            class: "w-full"
                          }),
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "explainFields" }, "解释字段 (可选)"),
                          vnd(MultiSelect, {
                            inputId: "explainFields",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.explainFields,
                            "onUpdate:modelValue": (v: string[]) => configData.fieldMapping.explainFields = v,
                            placeholder: "选择解释字段",
                            optionLabel: "label",
                            optionValue: "value",
                            display: "chip",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "answerField" }, "答案字段"),
                          vnd(Select, {
                            inputId: "answerField",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.answerField,
                            "onUpdate:modelValue": (v: string) => configData.fieldMapping.answerField = v,
                            placeholder: "选择答案字段",
                            optionLabel: "label",
                            optionValue: "value",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "answerField" }, "手动添加字段选项（如果字段未出现在选项中）"),
                          // Add input and button for new options here
                          vnd("div", { class: "flex gap-2 mt-2 items-center" }, [
                            vnd(InputText, {
                              modelValue: newContentFieldOption.value,
                              "onUpdate:modelValue": (v: string) => newContentFieldOption.value = v,
                              placeholder: "输入新选项名称",
                              class: "flex-grow p-inputtext-sm",
                              // Handle Enter key press to add option
                              onKeydown: (event: KeyboardEvent) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addCustomContentFieldOption();
                                }
                              }
                            }),
                            vnd(Button, {
                              icon: "pi pi-plus",
                              size: "small",
                              class:"p-button-sm",
                              onClick: addCustomContentFieldOption,
                              disabled: !newContentFieldOption.value.trim(),
                              ariaLabel: "添加新选项"
                            })
                          ]),
                        ]),
                      ])
                    }),

                    // 4. Additional Content Fields
                    vnd(Fieldset, { legend: "附加额外键值对（到content字段中）", toggleable: true }, {
                      default: () => vnd("div", { class: "stack-v gap-3" }, [
                        ...configData.additionalContentFields.map((field, index) =>
                          vnd("div", { key: index, class: "grid grid-cols-[1fr_1fr_auto] gap-2 items-center" }, [
                            vnd(InputText, { placeholder: "键", modelValue: field.key, "onUpdate:modelValue": (v: string) => field.key = v }),
                            vnd(InputText, { placeholder: "值", modelValue: field.value, "onUpdate:modelValue": (v: string) => field.value = v }),
                            vnd(Button, { icon: "pi pi-times", severity: "danger", text: true, rounded: true, onClick: () => removeAdditionalField(index) })
                          ])
                        ),
                        vnd(Button, { label: "新增", icon: "pi pi-plus", outlined: true, size:"small", onClick: addAdditionalField, class:"self-start" })
                      ])
                    }),
                    // Export Config Filename Input
                    vnd("div", { class: "flex flex-col gap-2 mt-4" }, [
                      vnd("label", { for: "exportFilename" }, "导出配置文件名"),
                      vnd(InputText, {
                        id: "exportFilename",
                        modelValue: exportConfigFilename.value,
                        "onUpdate:modelValue": (v: string) => exportConfigFilename.value = v,
                        placeholder: "例如: my-config.json"
                      })
                    ]),
                    vnd(Button, { label: "导出配置", icon: "pi pi-download", class:"mt-4", onClick: exportConfig }),
                  ])
                }),
                
                // 5. Data Preview Panel
                (configData.previewSamples.original.length > 0 ? 
                  vnd(Panel, { header: `数据预览 (显示 ${configData.previewSamples.original.length} 条样本)`, toggleable: true, class: "mt-4" }, {
                    default: () => vnd("div", { class: "stack-v gap-4" }, [
                      ...configData.previewSamples.original.map((origItem, index) =>
                        vnd(Fieldset, { key: index, legend: `样本 ${index + 1}`, toggleable: true, collapsed: false }, {
                          default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, [
                            vnd("div", {}, [
                              vnd("h4", {class:"font-semibold mb-2"}, "原始数据:"),
                              vnd("pre", { class: "bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto max-h-60" }, JSON.stringify(origItem, null, 2))
                            ]),
                            vnd("div", {}, [
                              vnd("h4", {class:"font-semibold mb-2"}, "处理后数据:"),
                              vnd("pre", { class: "bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto max-h-60" }, JSON.stringify(configData.previewSamples.processed[index] || {}, null, 2))
                            ])
                          ])
                        })
                      )
                    ])
                  })
                : null)
              ].filter(Boolean) // Filter out null if the preview panel is not rendered
            : [
                vnd("div", {class:"text-center text-gray-500 dark:text-gray-400 py-4"}, "请上传文件以配置预处理并查看预览。")
              ]
          ),

          // 6. Emit Processed Data
          configData.processedData.length > 0 ? vnd(Button, {
            label: `加载 ${configData.processedData.length} 条处理记录`,
            icon: "pi pi-upload",
            severity: "success",
            class: "mt-6 w-full md:w-auto self-end",
            onClick: emitProcessedData
          }) : null
        ])
      }),

      // File Upload Dialog
      vnd(FileUploadDialog, {
        title: "导入题目文件",
        visible: showImportDialog.value,
        acceptedFileTypes: ".json,.jsonl,application/json",
        onFileUploaded: handleFileUploaded,
        'onUpdate:visible': (v: boolean) => {showImportDialog.value = v},
      }),

    ]);
  }
})