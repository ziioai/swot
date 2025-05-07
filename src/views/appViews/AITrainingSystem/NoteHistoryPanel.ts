// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, ref, onMounted } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import Panel from 'primevue/panel';
import Paginator from 'primevue/paginator';
import { getQtBookBackups, getQtBookBackupsCount, deleteQtBookBackup } from './swot-db-functions';

export default defineComponent({
  name: "NoteHistoryPanel",
  props: {
    currentVersion: { type: String, required: false },
  },
  emits: ['select-version'],
  setup(_props, { emit }) {
    const backups = ref<any[]>([]);
    const loading = ref(true);
    const totalRecords = ref(0);
    const first = ref(0);
    const rows = ref(5);
    
    // Load notebook backups with pagination
    const loadBackups = async (updateTotalCount = true) => {
      loading.value = true;
      try {
        const result = await getQtBookBackups(first.value, rows.value);
        backups.value = result || [];
        
        // Get total count for pagination if needed
        if (updateTotalCount) {
          const count = await getQtBookBackupsCount();
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
        console.error("Failed to reload notebook backups:", error);
        loadBackups(true); // Still try to load even if count check failed, and get the count
      }
    };

    // Load a version
    const loadVersion = (backup: any) => {
      emit('select-version', backup);
    };
    
    // Delete a version
    const deleteVersion = async (backup: any) => {
      if (confirm(`确定要删除版本 ${backup.key} 吗？`)) {
        try {
          await deleteQtBookBackup(backup.id);
          reload(); // Refresh the list after deletion
        } catch (error) {
          console.error("Failed to delete backup:", error);
        }
      }
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
    
    onMounted(() => {
      loadBackups();
    });

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: false,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, ["笔记历史版本"]),
        ]),
        default: () => vnd("div", { class: [] }, [
          // Refresh button
          vnd("div", { class: ["stack-h mb-2"] }, [
            vnd(ToolButton, { 
              label: "刷新", 
              icon: "pi pi-refresh", 
              class: "mr-0.5rem",
              loading: loading.value,
              onClick: reload 
            }),
          ]),
          
          // Loading indicator
          loading.value && vnd("div", { class: "my-2 text-center" }, ["加载中..."]),
          
          // Simple custom table implementation
          !loading.value && vnd("div", { class: "border-1 border-gray-200 rounded overflow-hidden" }, [
            // Table header
            vnd("div", { class: "flex bg-gray-100 p-2 font-bold border-b-1" }, [
              vnd("div", { class: "flex-1" }, ["编号"]),
              vnd("div", { class: "flex-1" }, ["版本标识"]),
              vnd("div", { class: "flex-1" }, ["题型与字符数"]),
              vnd("div", { class: "flex-1 text-center" }, ["操作"]),
            ]),
            
            // Table body
            backups.value.length === 0 ? 
              vnd("div", { class: "p-4 text-center text-gray-500" }, ["没有历史记录"]) :
              backups.value.map(item => 
                vnd("div", { 
                  key: item.id,
                  class: "flex p-3 border-b-1 hover:bg-gray-50 items-center"
                }, [
                  vnd("div", { class: "flex-1" }, [`${item.id}`]),
                  vnd("div", { class: "flex-1" }, [item.key]),
                  vnd("div", { class: "flex-1" }, [
                    vnd("div", { class: "text-sm whitespace-normal" }, [`题型: ${getQuestionTypes(item)}`]),
                    vnd("div", { class: "text-xs text-gray-500" }, [`字符数: ${getJsonCharCount(item)}`])
                  ]),
                  vnd("div", { class: "flex-1 flex justify-center gap-2" }, [
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
          vnd(Paginator, {
            first: first.value,
            rows: rows.value,
            totalRecords: totalRecords.value,
            rowsPerPageOptions: [5, 10, 20],
            template: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
            onPage: onPageChange,
            class: "mt-2"
          })
        ])
      });
    };
  }
});