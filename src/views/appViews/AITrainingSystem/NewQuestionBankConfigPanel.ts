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
const mockDb = new Map<string, any>();
const save = async (key: string, data: any) => { mockDb.set(key, data); };
const load = async (key: string) => { return mockDb.get(key); };
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
  name: "NewQuestionBankConfigPanel",
  directives: {
    tooltip: Tooltip
  },
  emits: ['processedDataImported'],
  setup(_props, { emit }) {
    const toast = useToast();
    const showImportDialog = ref(false);

    const configData = reactive({
      nnidConfig: {
        sourceField: '',
        prefix: 'NNID-'
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

    // const previewDialogVisible = ref(false);

    const handleFileUploaded = (fileData: { name: string, content: string | ArrayBuffer | null, file: File }) => {
      try {
        if (!fileData.content || typeof fileData.content !== 'string') {
          toast.add({ severity: "error", summary: "Import Failed", detail: "Invalid file content.", life: 3000 });
          return;
        }

        let jsonData: any[];
        if (fileData.name.endsWith('.jsonl')) {
          const lines = fileData.content.split('\n').filter(line => line.trim());
          jsonData = lines.map(line => JSON.parse(line));
        } else if (fileData.name.endsWith('.json')) {
          jsonData = JSON.parse(fileData.content);
        } else {
          toast.add({ severity: "error", summary: "Import Failed", detail: "Unsupported file type. Please use JSON or JSONL.", life: 3000 });
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
                 toast.add({ severity: "error", summary: "Import Failed", detail: "Could not find a valid data array in the JSON.", life: 3000 });
                 return;
            }
        }

        if (jsonData.length === 0) {
          toast.add({ severity: "error", summary: "Import Failed", detail: "No data found in the file.", life: 3000 });
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
        saveCurrentConfig();

        toast.add({
          severity: "success",
          summary: "Import Successful",
          detail: `Successfully imported ${jsonData.length} records.`,
          life: 3000
        });
        showImportDialog.value = false;
      } catch (error: any) {
        console.error("File import failed:", error);
        toast.add({
          severity: "error",
          summary: "Import Failed",
          detail: error.message || "Could not parse file content.",
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

    const saveCurrentConfig = async () => {
      try {
        await save("newQuestionBankConfig", {
          nnidConfig: configData.nnidConfig,
          fieldMapping: configData.fieldMapping,
          additionalContentFields: configData.additionalContentFields
        });
        toast.add({ severity: 'success', summary: 'Configuration Saved', detail: 'Preprocessing configuration has been saved.', life: 2000 });
      } catch (_error) {
        toast.add({ severity: 'error', summary: 'Save Failed', detail: 'Could not save configuration.', life: 3000 });
      }
    };

    const loadSavedConfig = async () => {
      try {
        const saved = await load("newQuestionBankConfig");
        if (saved) {
          configData.nnidConfig = saved.nnidConfig || configData.nnidConfig;
          configData.fieldMapping = saved.fieldMapping || configData.fieldMapping;
          configData.additionalContentFields = saved.additionalContentFields || configData.additionalContentFields;
          toast.add({ severity: 'info', summary: 'Configuration Loaded', detail: 'Previously saved configuration has been loaded.', life: 2000 });
        }
      } catch (_error) {
         toast.add({ severity: 'warn', summary: 'Load Failed', detail: 'Could not load saved configuration.', life: 3000 });
      }
    };
    
    const emitProcessedData = () => {
      if (!configData.processedData.length) {
        toast.add({ severity: 'warn', summary: 'No Data', detail: 'No processed data to import.', life: 3000 });
        return;
      }
      emit('processedDataImported', _.cloneDeep(configData.processedData));
      toast.add({ severity: 'success', summary: 'Data Emitted', detail: `Emitted ${configData.processedData.length} processed records.`, life: 3000 });
    };

    onMounted(() => {
      loadSavedConfig();
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
        header: "New Question Bank Importer & Preprocessor",
        toggleable: true,
        class:"w-full bg-zinc-100/75! dark:bg-zinc-800/75!",
      }, {
        default: () => vnd("div", { class: "stack-v gap-6" }, [
          // 1. File Upload
          vnd("div", { class: "flex justify-between items-center gap-2" }, [
            vnd("span", {}, "Import question data (JSON or JSONL):"),
            vnd(Button, { label: "Upload File", icon: "pi pi-upload", onClick: () => showImportDialog.value = true })
          ]),

          // Replaced Accordion with a series of Panels
          ...(configData.originalData.length > 0
            ? [
                vnd(Panel, { header: "Preprocessing Configuration", toggleable: true, class: "mt-4" }, {
                  default: () => vnd("div", { class: "stack-v gap-4 p-fluid" }, [
                    // 2. NNID Configuration
                    vnd(Fieldset, { legend: "NNID Configuration", toggleable: true }, {
                      default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, [
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "nnidSource" }, "NNID Source Field"),
                          vnd(Select, {
                            inputId: "nnidSource",
                            options: availableFieldsOptions.value,
                            modelValue: configData.nnidConfig.sourceField,
                            "onUpdate:modelValue": (v: string) => configData.nnidConfig.sourceField = v,
                            placeholder: "Select NNID source",
                            optionLabel: "label",
                            optionValue: "value",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "nnidPrefix" }, "NNID Prefix"),
                          vnd(InputText, {
                            id: "nnidPrefix",
                            modelValue: configData.nnidConfig.prefix,
                            "onUpdate:modelValue": (v: string) => configData.nnidConfig.prefix = v,
                            placeholder: "Enter NNID prefix"
                          })
                        ])
                      ])
                    }),

                    // 3. Field Mapping
                    vnd(Fieldset, { legend: "Field Mapping", toggleable: true }, {
                       default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "contentFields" }, "Content Fields"),
                          vnd(MultiSelect, {
                            inputId: "contentFields",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.contentFields,
                            "onUpdate:modelValue": (v: string[]) => configData.fieldMapping.contentFields = v,
                            placeholder: "Select content fields",
                            optionLabel: "label",
                            optionValue: "value",
                            display: "chip",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "explainFields" }, "Explain Fields (Optional)"),
                          vnd(MultiSelect, {
                            inputId: "explainFields",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.explainFields,
                            "onUpdate:modelValue": (v: string[]) => configData.fieldMapping.explainFields = v,
                            placeholder: "Select explain fields",
                            optionLabel: "label",
                            optionValue: "value",
                            display: "chip",
                            class: "w-full"
                          })
                        ]),
                        vnd("div", { class: "flex flex-col gap-2" }, [
                          vnd("label", { for: "answerField" }, "Answer Field"),
                          vnd(Select, {
                            inputId: "answerField",
                            options: availableFieldsOptions.value,
                            modelValue: configData.fieldMapping.answerField,
                            "onUpdate:modelValue": (v: string) => configData.fieldMapping.answerField = v,
                            placeholder: "Select answer field",
                            optionLabel: "label",
                            optionValue: "value",
                            class: "w-full"
                          })
                        ])
                      ])
                    }),

                    // 4. Additional Content Fields
                    vnd(Fieldset, { legend: "Additional Content Fields", toggleable: true }, {
                      default: () => vnd("div", { class: "stack-v gap-3" }, [
                        ...configData.additionalContentFields.map((field, index) =>
                          vnd("div", { key: index, class: "grid grid-cols-[1fr_1fr_auto] gap-2 items-center" }, [
                            vnd(InputText, { placeholder: "Key", modelValue: field.key, "onUpdate:modelValue": (v: string) => field.key = v }),
                            vnd(InputText, { placeholder: "Value", modelValue: field.value, "onUpdate:modelValue": (v: string) => field.value = v }),
                            vnd(Button, { icon: "pi pi-times", severity: "danger", text: true, rounded: true, onClick: () => removeAdditionalField(index) })
                          ])
                        ),
                        vnd(Button, { label: "Add Field to Content", icon: "pi pi-plus", outlined: true, size:"small", onClick: addAdditionalField, class:"self-start" })
                      ])
                    }),
                    vnd(Button, { label: "Save Configuration", icon: "pi pi-save", class:"mt-4", onClick: saveCurrentConfig })
                  ])
                }),
                
                // 5. Data Preview Panel
                (configData.previewSamples.original.length > 0 ? 
                  vnd(Panel, { header: `Data Preview (Showing ${configData.previewSamples.original.length} Samples)`, toggleable: true, class: "mt-4" }, {
                    default: () => vnd("div", { class: "stack-v gap-4" }, [
                      ...configData.previewSamples.original.map((origItem, index) =>
                        vnd(Fieldset, { key: index, legend: `Sample ${index + 1}`, toggleable: true, collapsed: index > 0 }, {
                          default: () => vnd("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, [
                            vnd("div", {}, [
                              vnd("h4", {class:"font-semibold mb-2"}, "Original:"),
                              vnd("pre", { class: "bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto max-h-60" }, JSON.stringify(origItem, null, 2))
                            ]),
                            vnd("div", {}, [
                              vnd("h4", {class:"font-semibold mb-2"}, "Processed:"),
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
                vnd("div", {class:"text-center text-gray-500 dark:text-gray-400 py-4"}, "Upload a file to configure preprocessing and see a preview.")
              ]
          ),

          // 6. Emit Processed Data
          configData.processedData.length > 0 ? vnd(Button, {
            label: `Emit ${configData.processedData.length} Processed Records`,
            icon: "pi pi-upload",
            severity: "success",
            class: "mt-6 w-full md:w-auto self-end",
            onClick: emitProcessedData
          }) : null
        ])
      }),

      // File Upload Dialog
      vnd(FileUploadDialog, {
        title: "Import Question File",
        visible: showImportDialog.value,
        acceptedFileTypes: ".json,.jsonl,application/json",
        onFileUploaded: handleFileUploaded,
        'onUpdate:visible': (v: boolean) => {showImportDialog.value = v},
      }),
      
      // General Preview Dialog (can be repurposed or removed if accordion preview is sufficient)
      // vnd(Dialog, { ... }) 
    ]);
  }
})