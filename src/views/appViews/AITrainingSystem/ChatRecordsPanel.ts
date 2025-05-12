// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, ref, onMounted } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import Panel from 'primevue/panel';
import Paginator from 'primevue/paginator';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { getChatRecords, saveChatRecord, getChatRecordsCount, deleteChatRecord } from './swot-db-functions';

export default defineComponent({
  name: "ChatRecordsPanel",
  props: {
    currentChatId: { type: String, required: false },
  },
  emits: ['select-chat'],
  setup(_props, { emit }) {
    const chatRecords = ref<any[]>([]);
    const loading = ref(false);
    const totalRecords = ref(0);
    const first = ref(0);
    const rows = ref(10);
    const selectedChat = ref<any>(null);
    const showChatDialog = ref(false);
    
    // Load chat records with pagination using requestIdleCallback for optimization
    const loadChatRecords = async (updateTotalCount = true) => {
      if (loading.value) {
        console.warn("[loadChatRecords] Loading already in progress, skipping new load request");
        return;
      }
      
      loading.value = true;
      try {
        // Use Promise and requestIdleCallback to execute when browser is idle
        const result = await new Promise<any[]>(resolve => {
          window.requestIdleCallback 
            ? window.requestIdleCallback(() => {
                getChatRecords(first.value, rows.value).then(resolve);
              }) 
            : getChatRecords(first.value, rows.value).then(resolve);
        });
        
        chatRecords.value = result || [];
        
        // Similarly use requestIdleCallback for count query
        if (updateTotalCount) {
          const count = await new Promise<number>(resolve => {
            window.requestIdleCallback 
              ? window.requestIdleCallback(() => {
                  getChatRecordsCount().then(resolve);
                }) 
              : getChatRecordsCount().then(resolve);
          });
          totalRecords.value = count;
        }
      } catch (error) {
        console.error("Failed to load chat records:", error);
      } finally {
        loading.value = false;
      }
    };
    
    // Handle pagination
    const onPageChange = (event: { first: number, rows: number, page: number, pageCount: number }) => {
      first.value = event.first;
      rows.value = event.rows;
      loadChatRecords(false); // Don't update total count when just changing pages
    };
    
    // Reload chat records
    const reload = async () => {
      loading.value = true;
      try {
        // Get the new total count first
        const count = await getChatRecordsCount();
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
        
        loadChatRecords(false); // Don't update total count again
      } catch (error) {
        loading.value = false;
        console.error("Failed to reload chat records:", error);
        loadChatRecords(true); // Still try to load even if count check failed, and get the count
      }
    };

    // Show chat details in dialog
    const viewChatDetails = (chat: any) => {
      selectedChat.value = chat;
      showChatDialog.value = true;
    };
    
    // Load a chat record for editing
    const loadChat = (chat: any) => {
      emit('select-chat', chat);
    };
    
    // Delete a chat record
    const deleteChat = async (chat: any) => {
      if (confirm(`确定要删除聊天记录 ${chat.key} 吗？`)) {
        try {
          await deleteChatRecord(chat.id);
          reload(); // Refresh the list after deletion
        } catch (error) {
          console.error("Failed to delete chat record:", error);
        }
      }
    };
    
    // Extract formatted chat content for display
    const getChatSummary = (chat: any) => {
      if (!chat?.data) return '无内容';
      if (chat?.data?.data?.outputData) {
        return JSON.stringify(chat.data.data.outputData).substring(0, 50) + '...';
      };


      // Fallback to showing the structure
      const keys = Object.keys(chat.data);
      return `字段: ${keys.join(', ')}`;
    };
    
    // Get JSON character count
    const getJsonCharCount = (chat: any) => {
      if (!chat?.data) return 0;
      return JSON.stringify(chat.data).length;
    };

    // // Format timestamp from data if available
    // const formatTimestamp = (chat: any) => {
    //   if (chat?.data?.timestamp) {
    //     return new Date(chat.data.timestamp).toLocaleString();
    //   }
      
    //   if (chat?.data?.metadata?.created) {
    //     return new Date(chat.data.metadata.created).toLocaleString();
    //   }
      
    //   // Try to parse from the key if it has a timestamp pattern
    //   if (chat?.key?.includes('demo-')) {
    //     const timestampPart = chat.key.split('demo-')[1];
    //     if (!isNaN(Number(timestampPart))) {
    //       return new Date(Number(timestampPart)).toLocaleString();
    //     }
    //   }
      
    //   return '未知时间';
    // };

    onMounted(async () => {
      setTimeout(async () => {
        loadChatRecords();
      }, 1000);
    });

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: false,
      }, {
        header: () => vnd("div", { class: "stack-h items-center! justify-between w-full" }, [
          vnd("div", { class: "font-bold" }, ["聊天历史记录"]),
        ]),
        default: () => vnd("div", { class: [] }, [
          // Refresh and Demo buttons
          vnd("div", { class: ["stack-h mb-2"] }, [
            vnd(ToolButton, { 
              label: "刷新", 
              icon: "pi pi-refresh", 
              class: "mr-0.5rem",
              loading: loading.value,
              onClick: reload 
            }),
            vnd(ToolButton, { 
              label: "添加演示记录", 
              icon: "pi pi-plus",
              onClick: async () => {
                // Create a demo chat record
                const demoData = {
                  messages: [
                    { role: "system", content: "你是一个智能AI助手。" },
                    { role: "user", content: "你好，请介绍一下自己。" },
                    { role: "assistant", content: "你好！我是一个AI助手，我可以帮助你回答问题、提供信息和协助完成各种任务。我的知识库涵盖了广泛的主题，包括科学、历史、艺术、技术等多个领域。请告诉我你需要什么帮助，我会尽力为你提供支持！" }
                  ],
                  model: "gpt-4",
                  timestamp: new Date().toISOString(),
                  metadata: {
                    source: "demo",
                    created: new Date().toISOString()
                  }
                };
                
                try {
                  await saveChatRecord({ key: `demo-${new Date().getTime()}`, data: demoData });
                  reload(); // Refresh the list after adding
                } catch (error) {
                  console.error("Failed to add demo chat record:", error);
                }
              }
            }),
          ]),
          
          // Loading indicator
          loading.value && vnd("div", { class: "my-2 text-center" }, ["加载中..."]),
          
          // Simple custom table implementation
          !loading.value && vnd("div", { class: "border-1 border-gray-200 dark:border-gray-700 rounded overflow-hidden" }, [
            // Table header
            vnd("div", { class: "stack-h bg-gray-100 dark:bg-gray-800 p-2 font-bold border-b-1 dark:border-gray-700" }, [
              vnd("div", { class: "flex-1 text-center" }, ["编号"]),
              vnd("div", { class: "flex-1 text-center" }, ["标识"]),
              // vnd("div", { class: "flex-1 text-center" }, ["时间"]),
              vnd("div", { class: "flex-1 text-center" }, ["内容摘要"]),
              vnd("div", { class: "flex-1 text-center" }, ["操作"]),
            ]),
            
            // Table body
            chatRecords.value.length === 0 ? 
              vnd("div", { class: "p-4 text-center text-gray-500 dark:text-gray-400" }, ["没有聊天记录"]) :
              chatRecords.value.map(item => 
                vnd("div", { 
                  key: item.id,
                  class: "stack-h p-3 border-b-1 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 items-center!"
                }, [
                  vnd("div", { class: "flex-1 text-center" }, [`${item.id}`]),
                  vnd("div", { class: "flex-1 text-center" }, [item.key]),
                  // vnd("div", { class: "flex-1 text-center" }, [formatTimestamp(item)]),
                  vnd("div", { class: "flex-1" }, [
                    vnd("div", { class: "text-sm whitespace-normal" }, [getChatSummary(item)]),
                    vnd("div", { class: "text-xs text-gray-500 dark:text-gray-400" }, [`字符数: ${getJsonCharCount(item)}`])
                  ]),
                  vnd("div", { class: "flex-1 flex justify-center gap-2" }, [
                    vnd(ToolButton, {
                      icon: "pi pi-eye",
                      tip: "查看详情",
                      onClick: () => viewChatDetails(item)
                    }),
                    vnd(ToolButton, {
                      icon: "pi pi-arrow-right-arrow-left",
                      tip: "加载此聊天记录",
                      onClick: () => loadChat(item)
                    }),
                    vnd(ToolButton, {
                      icon: "pi pi-trash",
                      tip: "删除此记录",
                      class: "p-button-danger",
                      onClick: () => deleteChat(item)
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
          }),
          
          // Chat details dialog
          vnd(Dialog, {
            header: "聊天记录详情",
            visible: showChatDialog.value,
            style: { width: '80vw' },
            modal: true,
            'onUpdate:visible': (value: boolean) => {
              showChatDialog.value = value;
            }
          }, {
            default: () => selectedChat.value && vnd("div", { class: "p-3" }, [
              vnd("h3", { class: "mb-2 font-bold" }, [`ID: ${selectedChat.value.id} | 标识: ${selectedChat.value.key}`]),
              // vnd("h4", { class: "mb-2 text-gray-500" }, [`时间: ${formatTimestamp(selectedChat.value)}`]),
              
              // Format messages in chat view if available
              selectedChat.value.data.messages && Array.isArray(selectedChat.value.data.messages) ?
                vnd("div", { class: "mb-4" }, [
                  vnd("h4", { class: "font-bold mb-2" }, ["对话内容"]),
                  ...selectedChat.value.data.messages.map((msg: any, index: number) => 
                    vnd("div", { 
                      key: index,
                      class: `p-3 mb-2 rounded ${msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 
                        msg.role === 'system' ? 'bg-gray-100 dark:bg-gray-800' : 
                        'bg-green-100 dark:bg-green-900'}`
                    }, [
                      vnd("div", { class: "font-bold mb-1" }, [
                        msg.role === 'user' ? '用户' : 
                        msg.role === 'system' ? '系统' : 
                        msg.role === 'assistant' ? '助手' : msg.role
                      ]),
                      vnd("div", { class: "whitespace-pre-wrap" }, [msg.content])
                    ])
                  )
                ]) :
                null,
              
              // Raw JSON data
              vnd("div", {}, [
                vnd("h4", { class: "font-bold mb-2" }, ["原始数据"]),
                vnd("div", { class: "p-3 bg-gray-100 dark:bg-gray-800 rounded ==overflow-auto ==max-h-60vh" }, [
                  vnd("pre", { class: "text-xs overflow-auto max-h-60vh" }, [JSON.stringify(selectedChat.value.data, null, 2)])
                ]),
              ]),
              
              vnd("div", { class: "flex justify-end mt-4" }, [
                vnd(Button, {
                  label: "关闭",
                  icon: "pi pi-times",
                  onClick: () => { showChatDialog.value = false; }
                })
              ])
            ])
          })
        ])
      });
    };
  }
});
