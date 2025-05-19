// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, ref, onMounted } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import Panel from 'primevue/panel';
import Paginator from 'primevue/paginator';
import ProgressBar from 'primevue/progressbar';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { 
  getQtBookBackups, 
  getQtBookBackupsCount, 
  deleteQtBookBackup, 
  updateQtBookBackupMark, 
  batchDeleteQtBookBackups, 
  deleteAllQtBookBackups 
} from './swot-db-functions';
import { sleep } from '@utils/functions';

export default defineComponent({
  name: "NoteHistoryPanel",
  props: {
    currentVersion: { type: String, required: false },
  },
  emits: ['select-version'],
  setup(_props, { emit }) {
    const backups = ref<any[]>([]);
    const loading = ref(false);
    const totalRecords = ref(0);
    const first = ref(0);
    const rows = ref(10);
    const initialLoaded = ref(false);
    
    // 批量操作相关
    const showConfirmDialog = ref(false);
    const confirmDialogTitle = ref('');
    const confirmDialogMessage = ref('');
    const confirmDialogCallback = ref<() => Promise<void>>(() => Promise.resolve());
    
    // 进度条相关
    const showProgress = ref(false);
    const progressValue = ref(0);
    const progressMessage = ref('');
    
    // 详情对话框相关
    const selectedBackup = ref<any>(null);
    const showDetailsDialog = ref(false);
    
    // Load notebook backups with pagination
    // 优化后的加载函数，使用 requestIdleCallback
    const loadBackups = async (updateTotalCount = true) => {
      if (loading.value) {
        console.warn("[loadBackups] Loading already in progress, skipping new load request");
        return
      }; // 避免重复加载
      
      loading.value = true;
      try {
        // 使用 Promise 和 requestIdleCallback 在浏览器空闲时执行
        const result = await new Promise<any[]>(resolve => {
          window.requestIdleCallback 
            ? window.requestIdleCallback(() => {
                getQtBookBackups(first.value, rows.value).then(resolve);
              }) 
            : getQtBookBackups(first.value, rows.value).then(resolve);
        });
        
        backups.value = result || [];
        
        // 同样对计数查询使用 requestIdleCallback
        if (updateTotalCount) {
          const count = await new Promise<number>(resolve => {
          window.requestIdleCallback 
            ? window.requestIdleCallback(() => {
                getQtBookBackupsCount().then(resolve);
              }) 
            : getQtBookBackupsCount().then(resolve);
          });
          totalRecords.value = count;
        }
      } catch (error) {
        console.error("Failed to load notebook backups:", error);
      } finally {
        loading.value = false;
      }
    };
      
    // Handle pagination
    const onPageChange = (event: { first: number, rows: number, page: number, pageCount: number }) => {
      first.value = event.first;
      rows.value = event.rows;
      loadBackups(false); // Don't update total count when just changing pages
    };
    
    // Reload backups
    const reload = async () => {
      loading.value = true;
      try {
        // Get the new total count first
        const count = await getQtBookBackupsCount();
        totalRecords.value = count;
        loading.value = false;
        
        // Check if current page is out of range after reload
        const currentPage = Math.floor(first.value / rows.value);
        const totalPages = Math.ceil(count / rows.value);
        
        if (count === 0) {
          first.value = 0; // If no records, go to first page
        } else if (currentPage >= totalPages) {
          // If current page exceeds available pages, go to last page
          first.value = (totalPages - 1) * rows.value;
        }
        // Otherwise keep the current page (first value remains unchanged)
        
        loadBackups(false); // Don't update total count again
      } catch (error) {
        loading.value = false;
        console.error("Failed to reload notebook backups:", error);
        loadBackups(true); // Still try to load even if count check failed, and get the count
      }
    };

    // Load a version
    const loadVersion = (backup: any) => {
      emit('select-version', backup);
    };
    
    // View backup details
    const viewBackupDetails = (backup: any) => {
      selectedBackup.value = backup;
      showDetailsDialog.value = true;
    };
    
    // 显示确认对话框
    const showConfirm = (title: string, message: string, callback: () => Promise<void>) => {
      confirmDialogTitle.value = title;
      confirmDialogMessage.value = message;
      confirmDialogCallback.value = callback;
      showConfirmDialog.value = true;
    };
    
    // 确认对话框的确认按钮
    const confirmAction = async () => {
      showConfirmDialog.value = false;
      await confirmDialogCallback.value();
    };
    
    // 标记/取消标记笔记版本
    const toggleMark = async (backup: any) => {
      try {
        const newMarkedStatus = !(backup.isMarked ?? false);
        await updateQtBookBackupMark(backup.id, newMarkedStatus);
        
        // 只更新当前记录的标记状态，避免重新加载整个列表
        const index = backups.value.findIndex(b => b.id === backup.id);
        if (index !== -1) {
          backups.value[index].isMarked = newMarkedStatus;
          // 强制更新视图
          backups.value = [...backups.value];
        }
      } catch (error) {
        console.error("Failed to mark/unmark backup:", error);
      }
    };
    
    // 删除一个版本
    const deleteVersion = async (backup: any) => {
      showConfirm(
        "确认删除", 
        `确定要删除版本 ${backup.key} 吗？`, 
        async () => {
          try {
            await deleteQtBookBackup(backup.id);
            reload(); // 刷新列表
          } catch (error) {
            console.error("Failed to delete backup:", error);
          }
        }
      );
    };
    
    // 删除所有标记的笔记版本
    const deleteMarkedBackups = () => {
      showConfirm(
        "确认批量删除", 
        "确定要删除所有已标记的笔记版本吗？此操作不可恢复！", 
        async () => {
          showProgress.value = true;
          progressValue.value = 0;
          progressMessage.value = "正在删除已标记的笔记版本...";
          
          try {
            await batchDeleteQtBookBackups(
              { isMarked: true },
              {
                progressCallback: (processed, total) => {
                  progressValue.value = Math.round((processed / total) * 100);
                }
              }
            );
          } catch (error) {
            console.error("Failed to delete marked backups:", error);
          } finally {
            showProgress.value = false;
            reload(); // 刷新列表
          }
        }
      );
    };
    
    // 删除所有未标记的笔记版本
    const deleteUnmarkedBackups = () => {
      showConfirm(
        "确认批量删除", 
        "确定要删除所有未标记的笔记版本吗？此操作不可恢复！", 
        async () => {
          showProgress.value = true;
          progressValue.value = 0;
          progressMessage.value = "正在删除未标记的笔记版本...";
          
          try {
            await batchDeleteQtBookBackups(
              { isMarked: false },
              {
                progressCallback: (processed, total) => {
                  progressValue.value = Math.round((processed / total) * 100);
                }
              }
            );
          } catch (error) {
            console.error("Failed to delete unmarked backups:", error);
          } finally {
            showProgress.value = false;
            reload(); // 刷新列表
          }
        }
      );
    };
    
    // 删除所有笔记版本
    const deleteAllBackups = () => {
      showConfirm(
        "确认批量删除", 
        "确定要删除所有笔记版本吗？此操作不可恢复！", 
        async () => {
          showProgress.value = true;
          progressValue.value = 0;
          progressMessage.value = "正在删除所有笔记版本...";
          
          try {
            await deleteAllQtBookBackups({
              progressCallback: (processed, total) => {
                progressValue.value = Math.round((processed / total) * 100);
              }
            });
          } catch (error) {
            console.error("Failed to delete all backups:", error);
          } finally {
            showProgress.value = false;
            reload(); // 刷新列表
          }
        }
      );
    };
    
    // 获取笔记中的题型名称列表
    const getQuestionTypes = (backup: any) => {
      if (!backup?.data?.entries) return '无题型';
      
      const types = backup.data.entries
        .filter((entry: any) => !entry.deleted) // 排除已删除的条目
        .map((entry: any) => entry.name)
        .join(', ');
      
      return types || '无题型';
    };
    
    // 获取JSON字符数
    const getJsonCharCount = (backup: any) => {
      if (!backup?.data) return 0;
      return JSON.stringify(backup.data).length;
    };

    onMounted(async () => {
      await sleep(1500);
      setTimeout(async () => {
        await loadBackups();
        initialLoaded.value = true;
      }, 1000);
    });

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: false,
      }, {
        header: () => vnd("div", { class: "stack-h items-center! justify-between w-full" }, [
          vnd("div", { class: "font-bold" }, ["笔记历史版本"]),
        ]),
        default: () => vnd("div", { class: [] }, [
          // 按钮组：刷新和批量操作
          vnd("div", { class: ["stack-h mb-2 flex-wrap"] }, [
            // 刷新按钮
            vnd(ToolButton, { 
              label: "刷新", 
              icon: "pi pi-refresh", 
              class: "mr-0.5rem",
              loading: loading.value,
              onClick: reload 
            }),

            // 批量操作按钮
            vnd("div", { class: "flex gap-1 ml-auto" }, [
              vnd(ToolButton, {
                label: "删除已标记",
                icon: "pi pi-trash",
                disabled: loading.value,
                onClick: deleteMarkedBackups
              }),
              vnd(ToolButton, {
                label: "删除未标记",
                icon: "pi pi-trash",
                disabled: loading.value,
                onClick: deleteUnmarkedBackups
              }),
              vnd(ToolButton, {
                label: "删除全部",
                icon: "pi pi-trash",
                disabled: loading.value,
                onClick: deleteAllBackups
              }),
            ]),
          ]),
          
          // 进度条
          showProgress.value && vnd("div", { class: "my-2" }, [
            vnd("div", { class: "text-sm mb-1" }, [progressMessage.value]),
            vnd(ProgressBar, { value: progressValue.value, showValue: true })
          ]),
          
          // Loading indicator
          (!initialLoaded.value || loading.value) && vnd("div", { class: "my-2 text-center" }, ["加载中..."]),
          
          // Simple custom table implementation
          initialLoaded.value && !loading.value && vnd("div", { class: "border-1 border-gray-200 dark:border-gray-700 rounded overflow-hidden" }, [
            // Table header
            vnd("div", { class: "stack-h bg-gray-100 dark:bg-gray-800 p-2 font-bold border-b-1 dark:border-gray-700" }, [
              vnd("div", { class: "flex-1 text-center" }, ["编号"]),
              vnd("div", { class: "flex-1 text-center" }, ["版本标识"]),
              vnd("div", { class: "flex-1 text-center" }, ["题型与字符数"]),
              vnd("div", { class: "flex-1 text-center" }, ["标记"]),
              vnd("div", { class: "flex-1 text-center" }, ["操作"]),
            ]),
            
            // Table body
            backups.value.length === 0 ? 
              vnd("div", { class: "p-4 text-center text-gray-500 dark:text-gray-400" }, ["没有历史记录"]) :
              backups.value.map(item => 
                vnd("div", { 
                  key: item.id,
                  class: "stack-h p-3 border-b-1 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 items-center!"
                }, [
                  vnd("div", { class: "flex-1 text-center" }, [`${item.id}`]),
                  vnd("div", { class: "flex-1 text-center" }, [item.key]),
                  vnd("div", { class: "flex-1" }, [
                    vnd("div", { class: "text-sm whitespace-normal" }, [`题型: ${getQuestionTypes(item)}`]),
                    vnd("div", { class: "text-xs text-gray-500 dark:text-gray-400" }, [`字符数: ${getJsonCharCount(item)}`])
                  ]),
                  vnd("div", { class: "flex-1 flex justify-center" }, [
                    vnd(ToolButton, {
                      icon: item.isMarked ? "pi pi-check-circle" : "pi pi-circle",
                      tip: item.isMarked ? "取消标记" : "标记此版本",
                      class: item.isMarked ? "p-button-success" : "p-button-secondary",
                      onClick: () => toggleMark(item)
                    })
                  ]),
                  vnd("div", { class: "flex-1 flex justify-center gap-2" }, [
                    vnd(ToolButton, {
                      icon: "pi pi-eye",
                      tip: "查看详情",
                      onClick: () => viewBackupDetails(item)
                    }),
                    vnd(ToolButton, {
                      icon: "pi pi-arrow-right-arrow-left",
                      tip: "加载此版本到当前状态",
                      onClick: () => loadVersion(item)
                    }),
                    vnd(ToolButton, {
                      icon: "pi pi-trash",
                      tip: "删除此版本",
                      class: "p-button-danger",
                      onClick: () => deleteVersion(item)
                    })
                  ])
                ])
              )
          ]),
          
          // Paginator
          initialLoaded.value && vnd(Paginator, {
            first: first.value,
            rows: rows.value,
            totalRecords: totalRecords.value,
            rowsPerPageOptions: [5, 10, 20],
            template: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
            onPage: onPageChange,
            class: "mt-2"
          }),
          
          // 确认对话框
          vnd(Dialog, {
            header: confirmDialogTitle.value,
            visible: showConfirmDialog.value,
            modal: true,
            closable: true,
            style: { width: '450px' },
            onHide: () => { showConfirmDialog.value = false }
          }, {
            default: () => [
              vnd("div", { class: "p-4" }, [
                vnd("p", {}, [confirmDialogMessage.value])
              ]),
              vnd("div", { class: "flex justify-end p-3 pt-0 gap-2" }, [
                vnd(Button, {
                  label: "取消",
                  class: "p-button-text",
                  onClick: () => { showConfirmDialog.value = false }
                }),
                vnd(Button, {
                  label: "确认",
                  class: "p-button-danger",
                  onClick: confirmAction
                })
              ])
            ]
          }),
          
          // 备份详情对话框
          vnd(Dialog, {
            header: "笔记版本详情",
            visible: showDetailsDialog.value,
            style: { width: '80vw' },
            modal: true,
            'onUpdate:visible': (value: boolean) => {
              showDetailsDialog.value = value;
            }
          }, {
            default: () => selectedBackup.value && vnd("div", { class: "p-3" }, [
              vnd("h3", { class: "mb-2 font-bold" }, [`ID: ${selectedBackup.value.id} | 标识: ${selectedBackup.value.key}`]),
              
              // 显示题型信息
              selectedBackup.value.data?.entries && Array.isArray(selectedBackup.value.data.entries) ?
                vnd("div", { class: "mb-4" }, [
                  vnd("h4", { class: "font-bold mb-2" }, ["题型列表"]),
                  ...selectedBackup.value.data.entries.map((entry: any, index: number) => 
                    vnd("div", { 
                      key: index,
                      class: `p-3 mb-2 rounded ${entry.deleted ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}`
                    }, [
                      vnd("div", { class: "font-bold mb-1 flex items-center" }, [
                        entry.deleted && vnd("i", { 
                          class: "pi pi-trash mr-2 text-red-500"
                        }),
                        vnd("span", { 
                          class: entry.deleted ? "line-through text-red-600" : ""
                        }, [`【${entry?.name}】`]),
                        // 已删除标识
                        entry.deleted && vnd("span", { 
                          class: "ml-2 text-xs bg-red-100 text-red-600 py-0.5 px-1 rounded"
                        }, ["已删除"]),
                      ]),
                      vnd("div", { class: "text-sm mb-1" }, [`描述: ${entry.desc || '无'}`]),
                      vnd("div", { class: "text-sm" }, [`线索: ${entry.clue || '无'}`])
                    ])
                  )
                ]) :
                vnd("div", { class: "mb-4 text-gray-500" }, ["没有题型数据"]),
              
              // 原始JSON数据
              vnd("div", {}, [
                vnd("h4", { class: "font-bold mb-2" }, ["原始数据"]),
                vnd("div", { class: "p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-60vh" }, [
                  vnd("pre", { class: "text-xs overflow-auto max-h-60vh" }, [JSON.stringify(selectedBackup.value.data, null, 2)])
                ]),
              ]),
              
              vnd("div", { class: "flex justify-end mt-4" }, [
                vnd(Button, {
                  label: "关闭",
                  icon: "pi pi-times",
                  onClick: () => { showDetailsDialog.value = false; }
                })
              ])
            ])
          })
        ])
      });
    };
  }
});