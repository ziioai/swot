// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, PropType, ref, onMounted } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import Panel from 'primevue/panel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Paginator from 'primevue/paginator';
import { getQtBookBackups, getQtBookBackupsCount } from './swot-db-functions';

export default defineComponent({
  name: "NoteHistoryPanel",
  props: {
    currentVersion: { type: String, required: false },
  },
  emits: ['select-version'],
  setup(props, { emit }) {
    const backups = ref<any[]>([]);
    const loading = ref(true);
    const totalRecords = ref(0);
    const first = ref(0);
    const rows = ref(5);
    
    // Load notebook backups with pagination
    const loadBackups = async () => {
      loading.value = true;
      try {
        const result = await getQtBookBackups(first.value, rows.value);
        backups.value = result || [];
        
        // Get actual total count for pagination
        if (first.value === 0) {
          // Only update total on first page load or reload
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
      loadBackups();
    };
    
    // Reload backups
    const reload = () => {
      first.value = 0;
      loadBackups();
    };
    
    // Select a version
    const selectVersion = (backup: any) => {
      emit('select-version', backup);
    };

    // Load a version
    const loadVersion = (backup: any) => {
      if (backup && backup.data && backup.data.notebook) {
        emit('select-version', backup);
      }
    };
    
    onMounted(() => {
      loadBackups();
    });

    // // Format timestamp for display
    // const formatTimestamp = (id: number) => {
    //   if (!id) return 'Unknown';
    //   const date = new Date(id);
    //   return date.toLocaleString();
    // };

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: false,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, ["笔记历史版本"]),
        ]),
        default: () => vnd("div", {class: []}, [
          vnd("div", { class: ["stack-h mb-2"] }, [
            vnd(ToolButton, { 
              label: "刷新", 
              icon: "pi pi-refresh", 
              class: "mr-0.5rem",
              loading: loading.value,
              onClick: reload 
            }),
          ]),
          vnd(DataTable, {
            value: backups.value,
            loading: loading.value,
            paginator: false,
            rows: rows.value,
            scrollable: true,
            scrollHeight: "200px",
            class: "w-100%",
            selectionMode: "single",
            dataKey: "id",
          }, {
            default: () => [
              vnd(Column, { 
                field: "key", 
                header: "版本标识",
                sortable: true,
              }),
              vnd(Column, { 
                field: "id", 
                header: "编号",
                sortable: true,
                body: (rowData: any) => `${(rowData.id)}`,
              }),
              vnd(Column, { 
                header: "操作",
                body: (rowData: any) => {
                  const isCurrentVersion = rowData.key === props.currentVersion;
                  return vnd("div", { class: "stack-h" }, [
                    vnd(ToolButton, {
                      icon: "pi pi-eye",
                      class: isCurrentVersion ? "p-button-success" : "",
                      tooltip: isCurrentVersion ? "当前显示版本" : "显示此版本",
                      onClick: () => selectVersion(rowData)
                    }),
                    vnd(ToolButton, {
                      icon: "pi pi-arrow-right-arrow-left",
                      tooltip: "加载此版本到当前状态",
                      class: "ml-2",
                      onClick: () => loadVersion(rowData)
                    })
                  ]);
                }
              }),
            ]
          }),
          vnd(Paginator, {
            first: first.value,
            rows: rows.value,
            totalRecords: totalRecords.value,
            rowsPerPageOptions: [5, 10, 20],
            template: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
            onPage: onPageChange
          })
        ])
      });
    };
  }
});
