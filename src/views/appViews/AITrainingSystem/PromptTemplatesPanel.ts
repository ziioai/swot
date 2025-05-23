// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, PropType, reactive, onMounted, watch } from 'vue';
import Panel from 'primevue/panel';
// import ToolButton from '@components/shared/ToolButton';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

// Import default prompt templates
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

export interface PromptTemplates {
  version: string;
  stage0_判断题型: string;
  stage1_根据笔记做题: string;
  stage2_根据错题修改笔记: string;
  stage4_合并对笔记的修改: string;
  笔记介绍: string;
  笔记操作介绍: string;
  笔记介绍标记: string;
  笔记操作介绍标记: string;
  [key: string]: string;
}

// Helper function to export for use in the SWOT trainer
export function getPromptTemplates(templates: PromptTemplates) {
  return {
    stage0_判断题型_prompt: templates.stage0_判断题型,
    stage1_根据笔记做题_prompt: templates.stage1_根据笔记做题,
    stage2_根据错题修改笔记_prompt: templates.stage2_根据错题修改笔记,
    stage4_合并对笔记的修改_prompt: templates.stage4_合并对笔记的修改,
    笔记介绍: templates.笔记介绍,
    笔记操作介绍: templates.笔记操作介绍,
    笔记介绍标记: templates.笔记介绍标记,
    笔记操作介绍标记: templates.笔记操作介绍标记,
    promptVersion: templates.version
  };
}

export default defineComponent({
  name: "PromptTemplatesPanel",
  props: {
    savedTemplates: {
      type: Object as PropType<PromptTemplates | null>,
      required: false
    }
  },
  emits: ['update:templates', 'save'],
  setup(props, { emit }) {
    const toast = useToast();
    
    // Initialize reactive prompt templates with defaults
    const promptTemplates = reactive<PromptTemplates>({
      version: promptVersion || "自定义模板",
      stage0_判断题型: stage0_判断题型_prompt || "",
      stage1_根据笔记做题: stage1_根据笔记做题_prompt || "",
      stage2_根据错题修改笔记: stage2_根据错题修改笔记_prompt || "",
      stage4_合并对笔记的修改: stage4_合并对笔记的修改_prompt || "",
      笔记介绍: 笔记介绍 || "",
      笔记操作介绍: 笔记操作介绍 || "",
      笔记介绍标记: DEFAULT_NOTE_DESC_TOKEN || "",
      笔记操作介绍标记: DEFAULT_NOTE_OPS_TOKEN || ""
    });
    
    // Load saved templates if available
    onMounted(() => {
      if (props.savedTemplates) {
        Object.assign(promptTemplates, props.savedTemplates);
      }
    });
    
    // Watch for changes from parent
    watch(
      () => props.savedTemplates,
      (newVal) => {
        if (newVal) {
          Object.assign(promptTemplates, newVal);
        }
      }
    );
    
    // Reset templates to defaults
    const resetTemplates = () => {
      promptTemplates.version = promptVersion;
      promptTemplates.stage0_判断题型 = stage0_判断题型_prompt;
      promptTemplates.stage1_根据笔记做题 = stage1_根据笔记做题_prompt;
      promptTemplates.stage2_根据错题修改笔记 = stage2_根据错题修改笔记_prompt;
      promptTemplates.stage4_合并对笔记的修改 = stage4_合并对笔记的修改_prompt;
      promptTemplates.笔记介绍 = 笔记介绍;
      promptTemplates.笔记操作介绍 = 笔记操作介绍;
      promptTemplates.笔记介绍标记 = DEFAULT_NOTE_DESC_TOKEN;
      promptTemplates.笔记操作介绍标记 = DEFAULT_NOTE_OPS_TOKEN;
      
      emit('update:templates', _.cloneDeep(promptTemplates));
      toast.add({ 
        severity: "info",
        summary: "重置模板",
        detail: "所有提示词模板已重置为默认值",
        life: 2000 
      });
    };
    
    // Save templates
    const saveTemplates = () => {
      emit('save', _.cloneDeep(promptTemplates));
      toast.add({
        severity: "success",
        summary: "保存成功",
        detail: "提示词模板已保存",
        life: 2000
      });
    };
    
    // Update template and emit change
    const updateTemplate = (key: keyof PromptTemplates, value: string) => {
      promptTemplates[key] = value;
      emit('update:templates', _.cloneDeep(promptTemplates));
    };

    return () => vnd("div", { class: "stack-v gap-4" }, [
      // Version info and action buttons panel
      vnd(Panel, { 
        header: "提示词模板版本",
        toggleable: true,
        class: ["w-full my-1.5rem!", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
      }, {
        default: () => vnd("div", { class: "stack-v gap-4" }, [
          // Version control area
          vnd("div", { class: "flex justify-between items-center" }, [
            vnd("div", { class: "flex items-center gap-2" }, [
              vnd("span", { class: "font-bold" }, "当前版本: "),
              vnd(InputText, {
                modelValue: promptTemplates.version,
                'onUpdate:modelValue': (v: string) => updateTemplate('version', v),
                placeholder: "版本标识",
                class: "w-40"
              })
            ]),
            vnd("div", { class: "stack-h gap-2" }, [
              vnd(Button, {
                label: "重置为默认值",
                icon: "pi pi-refresh",
                severity: "secondary",
                outlined: true,
                onClick: resetTemplates
              }),
              vnd(Button, {
                label: "保存配置",
                icon: "pi pi-save",
                onClick: saveTemplates
              })
            ])
          ])
        ])
      }),

      // Prompt templates section in a responsive grid
      vnd("div", { class: "w-full grid grid-cols-1 lg:grid-cols-2 gap-4" }, [

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "笔记介绍",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("div", { class: "flex items-center gap-2 mb-2" }, [
                vnd("span", { class: "text-sm text-gray-600 dark:text-gray-400" }, "笔记介绍标记:"),
                vnd(InputText, {
                  modelValue: promptTemplates.笔记介绍标记,
                  'onUpdate:modelValue': (v: string) => updateTemplate('笔记介绍标记', v),
                  placeholder: "替换标记",
                  class: "w-64 font-mono"
                })
              ]),
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "笔记介绍内容，在模板中可用上面定义的替换标记引用。这是笔记格式的定义说明。"),
              vnd(Textarea, {
                modelValue: promptTemplates.笔记介绍,
                'onUpdate:modelValue': (v: string) => updateTemplate('笔记介绍', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          }),
        ]),

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "笔记操作介绍",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("div", { class: "flex items-center gap-2 mb-2" }, [
                vnd("span", { class: "text-sm text-gray-600 dark:text-gray-400" }, "笔记操作介绍标记:"),
                vnd(InputText, {
                  modelValue: promptTemplates.笔记操作介绍标记,
                  'onUpdate:modelValue': (v: string) => updateTemplate('笔记操作介绍标记', v),
                  placeholder: "替换标记",
                  class: "w-64 font-mono"
                })
              ]),
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "笔记操作介绍内容，在模板中可用上面定义的替换标记引用。这是笔记操作方法的说明。"),
              vnd(Textarea, {
                modelValue: promptTemplates.笔记操作介绍,
                'onUpdate:modelValue': (v: string) => updateTemplate('笔记操作介绍', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          }),
        ]),

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "判断题型模板",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "用于判断当前题目是否属于现有题型中的某个题型。"),
              vnd(Textarea, {
                modelValue: promptTemplates.stage0_判断题型,
                'onUpdate:modelValue': (v: string) => updateTemplate('stage0_判断题型', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          }),
        ]),

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "根据笔记做题模板",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "用于结合现有笔记完成题目的提示词模板。"),
              vnd(Textarea, {
                modelValue: promptTemplates.stage1_根据笔记做题,
                'onUpdate:modelValue': (v: string) => updateTemplate('stage1_根据笔记做题', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          })
        ]),

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "根据错题修改笔记模板",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"]
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "用于根据错题和正确答案分析并规划笔记修改的模板。"),
              vnd(Textarea, {
                modelValue: promptTemplates.stage2_根据错题修改笔记,
                'onUpdate:modelValue': (v: string) => updateTemplate('stage2_根据错题修改笔记', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          }),
        ]),

        vnd("div", { class: "col-span-1 lg:col-span-1 stack-v gap-4" }, [
          vnd(Panel, { 
            header: "合并对笔记的修改模板",
            toggleable: true,
            class: ["w-full", "bg-zinc-100/75!", "dark:bg-zinc-800/75!"] 
          }, {
            default: () => vnd("div", { class: "stack-v gap-2" }, [
              vnd("p", { class: "text-sm text-gray-600 dark:text-gray-400" },
                "用于合并不同专家对笔记的修改计划的模板。"),
              vnd(Textarea, {
                modelValue: promptTemplates.stage4_合并对笔记的修改,
                'onUpdate:modelValue': (v: string) => updateTemplate('stage4_合并对笔记的修改', v),
                class: "w-full font-mono text-sm max-h-80vh min-h-10rem",
                autoResize: true
              })
            ])
          })
        ]),

      ]),
    ]);
  }
});
