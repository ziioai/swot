// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, PropType, ref, watch } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';

export interface NotebookEntry {
  name: string;
  desc?: string;
  clue?: string;
  steps?: any[];
  tips?: any[];
  tools?: any[];
  datums?: any[];
  deleted?: boolean;
}

export interface Notebook {
  entries: NotebookEntry[];
}

export default defineComponent({
  name: "NotebookEditor",
  props: {
    notebook: {
      type: Object as PropType<Notebook | null>,
      required: false
    },
    version: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['update:notebook', 'save'],
  setup(props, { emit }) {
    const toast = useToast();
    const editingJSON = ref<string>('');
    const isEditing = ref<boolean>(false);
    const isShowingConfirmDialog = ref<boolean>(false);
    const editingEntryIndex = ref<number>(-1);
    const editingEntryName = ref<string>('');
    const currentEntryJSON = ref<string>('');

    // When notebook prop changes, update the JSON string
    watch(() => props.notebook, (newVal) => {
      if (newVal) {
        editingJSON.value = formatJSON(newVal);
      } else {
        editingJSON.value = '';
      }
    }, { immediate: true });

    // Format JSON with proper indentation
    const formatJSON = (json: any): string => {
      try {
        return JSON.stringify(json, null, 2);
      } catch (e) {
        console.error('Error formatting JSON:', e);
        return JSON.stringify(json);
      }
    };
    
    // Start editing the entire notebook
    const startEditing = () => {
      if (props.notebook) {
        editingJSON.value = formatJSON(props.notebook);
        isEditing.value = true;
      } else {
        toast.add({ severity: 'error', summary: '无法编辑', detail: '没有有效的笔记数据', life: 3000 });
      }
    };

    // Save the edited notebook
    const saveEditing = () => {
      try {
        const parsedJSON = JSON.parse(editingJSON.value);
        
        // Validate the structure
        if (!Array.isArray(parsedJSON.entries)) {
          throw new Error('笔记格式无效，必须包含entries数组');
        }
        
        emit('update:notebook', parsedJSON);
        isEditing.value = false;
        toast.add({ severity: 'success', summary: '保存成功', detail: '笔记已更新', life: 2000 });
      } catch (error) {
        toast.add({ 
          severity: 'error', 
          summary: '保存失败', 
          detail: `JSON解析错误: ${error instanceof Error ? error.message : '未知错误'}`, 
          life: 5000 
        });
      }
    };

    // Cancel editing
    const cancelEditing = () => {
      isShowingConfirmDialog.value = true;
    };

    // Confirm cancel editing
    const confirmCancelEditing = () => {
      isEditing.value = false;
      isShowingConfirmDialog.value = false;
      if (props.notebook) {
        editingJSON.value = formatJSON(props.notebook);
      }
      editingEntryIndex.value = -1;
      toast.add({ severity: 'info', summary: '已取消', detail: '取消编辑笔记', life: 2000 });
    };

    // Start editing a specific entry
    const editEntry = (index: number) => {
      if (props.notebook && props.notebook.entries && props.notebook.entries[index]) {
        const entry = props.notebook.entries[index];
        editingEntryIndex.value = index;
        editingEntryName.value = entry.name;
        currentEntryJSON.value = formatJSON(entry);
      }
    };

    // Save the edited entry
    const saveEntry = () => {
      try {
        const parsedEntry = JSON.parse(currentEntryJSON.value);
        
        if (!parsedEntry.name) {
          throw new Error('条目名称是必需的');
        }
        
        if (props.notebook && props.notebook.entries) {
          const updatedNotebook = _.cloneDeep(props.notebook);
          updatedNotebook.entries[editingEntryIndex.value] = parsedEntry;
          emit('update:notebook', updatedNotebook);
          editingEntryIndex.value = -1;
          toast.add({ severity: 'success', summary: '保存成功', detail: `条目 "${parsedEntry.name}" 已更新`, life: 2000 });
        }
      } catch (error) {
        toast.add({ 
          severity: 'error', 
          summary: '保存失败', 
          detail: `JSON解析错误: ${error instanceof Error ? error.message : '未知错误'}`, 
          life: 5000 
        });
      }
    };

    // Cancel editing entry
    const cancelEditEntry = () => {
      editingEntryIndex.value = -1;
      editingEntryName.value = '';
      currentEntryJSON.value = '';
    };

    // Save the notebook
    const saveNotebook = () => {
      emit('save');
      toast.add({ severity: 'success', summary: '保存版本', detail: '笔记版本已保存', life: 2000 });
    };

    // Add a new empty entry
    const addNewEntry = () => {
      if (props.notebook) {
        const updatedNotebook = _.cloneDeep(props.notebook);
        const newEntry: NotebookEntry = {
          name: `新条目_${Date.now()}`,
          desc: '',
          steps: [],
          tips: [],
          tools: [],
          datums: []
        };
        updatedNotebook.entries.push(newEntry);
        emit('update:notebook', updatedNotebook);
        toast.add({ severity: 'success', summary: '添加成功', detail: '已添加新条目', life: 2000 });
      }
    };

    // Delete an entry
    const deleteEntry = (index: number) => {
      if (props.notebook && props.notebook.entries) {
        const updatedNotebook = _.cloneDeep(props.notebook);
        const deletedName = updatedNotebook.entries[index].name;
        updatedNotebook.entries.splice(index, 1);
        emit('update:notebook', updatedNotebook);
        toast.add({ severity: 'info', summary: '删除成功', detail: `已删除条目 "${deletedName}"`, life: 2000 });
      }
    };

    // 标记条目为已删除
    const markAsDeleted = (index: number) => {
      if (props.notebook && props.notebook.entries) {
        const updatedNotebook = _.cloneDeep(props.notebook);
        const entryName = updatedNotebook.entries[index].name;
        updatedNotebook.entries[index].deleted = true;
        emit('update:notebook', updatedNotebook);
        toast.add({ severity: 'info', summary: '标记成功', detail: `已将条目 "${entryName}" 标记为已删除`, life: 2000 });
      }
    };

    // 恢复已删除的条目
    const unmarkAsDeleted = (index: number) => {
      if (props.notebook && props.notebook.entries) {
        const updatedNotebook = _.cloneDeep(props.notebook);
        const entryName = updatedNotebook.entries[index].name;
        updatedNotebook.entries[index].deleted = false;
        emit('update:notebook', updatedNotebook);
        toast.add({ severity: 'success', summary: '恢复成功', detail: `已恢复条目 "${entryName}"`, life: 2000 });
      }
    };

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: true,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, ["笔记编辑器"]),
          vnd("span", { class: "text-sm text-gray-500 ml-2" }, [props.version ? `(版本: ${props.version})` : '']),
        ]),
        default: () => vnd("div", { class: [] }, [
          // Top buttons
          vnd("div", { class: "mb-4 flex justify-between" }, [
            vnd("div", { class: "flex gap-2" }, [
              vnd(ToolButton, {
                label: "整体编辑",
                icon: "pi pi-pencil",
                onClick: startEditing
              }),
              vnd(ToolButton, {
                label: "添加条目",
                icon: "pi pi-plus",
                onClick: addNewEntry
              }),
              vnd(ToolButton, {
                label: "保存版本",
                icon: "pi pi-save",
                onClick: saveNotebook
              }),
            ]),
          ]),

          // Whole notebook edit mode
          isEditing.value && vnd("div", { class: "mb-4" }, [
            vnd("div", { class: "font-bold mb-2" }, ["编辑整个笔记 (JSON 格式)"]),
            vnd(Textarea, {
              modelValue: editingJSON.value,
              "onUpdate:modelValue": (val: string) => editingJSON.value = val,
              // autoResize: true,
              // rows: 20,
              class: "w-full font-mono min-h-16rem max-h-90vh"
            }),
            vnd("div", { class: "mt-2 flex gap-2" }, [
              vnd(Button, {
                label: "保存",
                icon: "pi pi-check",
                onClick: saveEditing
              }),
              vnd(Button, {
                label: "取消",
                icon: "pi pi-times",
                class: "p-button-secondary",
                onClick: cancelEditing
              })
            ])
          ]),

          // Entry edit mode
          editingEntryIndex.value >= 0 && vnd("div", { class: "mb-4" }, [
            vnd("div", { class: "font-bold mb-2" }, [`编辑条目: ${editingEntryName.value}`]),
            vnd(Textarea, {
              modelValue: currentEntryJSON.value,
              "onUpdate:modelValue": (val: string) => currentEntryJSON.value = val,
              // autoResize: true,
              // rows: 15,
              class: "w-full font-mono min-h-16rem max-h-90vh"
            }),
            vnd("div", { class: "mt-2 flex gap-2" }, [
              vnd(Button, {
                label: "保存",
                icon: "pi pi-check",
                onClick: saveEntry
              }),
              vnd(Button, {
                label: "取消",
                icon: "pi pi-times",
                class: "p-button-secondary",
                onClick: cancelEditEntry
              })
            ])
          ]),

          // List of entries (only shown when not editing)
          !isEditing.value && editingEntryIndex.value < 0 && props.notebook?.entries && 
            vnd("div", { class: "mt-4" }, [
              vnd("div", { class: "font-bold mb-2" }, ["笔记条目列表"]),
              // 分类显示：首先显示未删除的条目，然后是已删除的条目
              ...props.notebook.entries
                .map((entry, index) => ({ entry, index }))
                .sort((a, b) => {
                  // 先按已删除状态排序，已删除的排后面
                  if (!!a.entry.deleted !== !!b.entry.deleted) {
                    return a.entry.deleted ? 1 : -1;
                  }
                  // 然后按索引排序
                  return a.index - b.index;
                })
                .map(({ entry, index }) => 
                  vnd("div", { 
                    key: `entry-${index}`, 
                    class: `p-3 border-b flex justify-between items-center hover:bg-gray-50 
                            ${entry.deleted ? 'bg-red-50 dark:bg-red-900/10' : ''}` 
                  }, [
                    vnd("div", { class: "flex-1 flex items-center" }, [
                      // 已删除条目的标记
                      entry.deleted && vnd("div", { 
                        class: "mr-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-600"
                      }, [
                        vnd("i", { class: "pi pi-trash text-xs" })
                      ]),
                      vnd("div", { class: "flex-1" }, [
                        vnd("span", { 
                          class: `font-bold ${entry.deleted ? 'line-through text-red-600 dark:text-red-400' : ''}`
                        }, [`${entry.name}`]),
                        entry.desc && vnd("span", { 
                          class: `ml-2 text-gray-500 ${entry.deleted ? 'line-through' : ''}`
                        }, [` - ${entry.desc}`])
                      ])
                    ]),
                    vnd("div", { class: "flex gap-2" }, [
                      // 对已删除的条目显示"恢复"按钮，对正常条目显示"编辑"和"标记删除"按钮
                      entry.deleted ? [
                        vnd(ToolButton, {
                          icon: "pi pi-refresh",
                          tip: "恢复此条目",
                          class: "p-button-success",
                          onClick: () => unmarkAsDeleted(index)
                        }),
                        vnd(ToolButton, {
                          icon: "pi pi-trash",
                          tip: "永久删除此条目",
                          class: "p-button-danger",
                          onClick: () => deleteEntry(index)
                        })
                      ] : [
                        vnd(ToolButton, {
                          icon: "pi pi-pencil",
                          tip: "编辑此条目",
                          onClick: () => editEntry(index)
                        }),
                        vnd(ToolButton, {
                          icon: "pi pi-ban",
                          tip: "标记为已删除",
                          class: "p-button-warning",
                          onClick: () => markAsDeleted(index)
                        })
                      ]
                    ])
                  ])
                )
            ]),

          // Confirm dialog
          vnd(Dialog, {
            header: "确认取消",
            visible: isShowingConfirmDialog.value,
            "onUpdate:visible": (val: boolean) => isShowingConfirmDialog.value = val,
            modal: true,
            style: { width: '30rem' },
            class: "p-fluid"
          }, {
            default: () => vnd("div", {}, [
              vnd("p", {}, ["您确定要取消编辑吗？所有未保存的更改都将丢失。"])
            ]),
            footer: () => vnd("div", { class: "flex justify-end gap-2" }, [
              vnd(Button, {
                label: "是的，取消编辑",
                icon: "pi pi-check",
                onClick: confirmCancelEditing,
                autofocus: true
              }),
              vnd(Button, {
                label: "返回编辑",
                icon: "pi pi-times",
                class: "p-button-secondary",
                onClick: () => isShowingConfirmDialog.value = false
              })
            ])
          })
        ])
      });
    };
  }
});
