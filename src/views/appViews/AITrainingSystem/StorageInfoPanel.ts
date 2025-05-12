// @unocss-include

import { h as vnd, defineComponent, ref, onMounted } from 'vue';
import Panel from 'primevue/panel';
import ToolButton from '@components/shared/ToolButton';
import { getIDBStorageSize } from './swot-db-functions';

export default defineComponent({
  name: "StorageInfoPanel",
  setup() {
    const storageInfo = ref<any>(null);
    const loadingStorageInfo = ref(false);
    
    // 获取数据库大小信息
    const loadStorageInfo = async (force=false) => {
      // 检查是否已经在加载中，避免重复操作
      if (!force&&loadingStorageInfo.value) return;
      
      loadingStorageInfo.value = true; // 开始加载存储信息
      try {
        // 使用 requestIdleCallback 在浏览器空闲时执行，避免阻塞主线程
        storageInfo.value = await new Promise((resolve) => {
          window.requestIdleCallback 
            ? window.requestIdleCallback(() => {
                getIDBStorageSize().then(resolve);
              }) 
            : getIDBStorageSize().then(resolve);
        });
      } catch (error) {
        console.error("Failed to get storage size:", error);
        storageInfo.value = null;
      } finally {
        loadingStorageInfo.value = false; // 完成加载存储信息
      }
    };

    onMounted(async () => {
      setTimeout(async () => {
        loadStorageInfo();
      }, 1000);
    });

    return () => {
      return vnd(Panel, {
        toggleable: true,
        collapsed: false,
      }, {
        header: () => vnd("div", { class: "stack-h items-center! justify-between w-full" }, [
          vnd("div", { class: "font-bold" }, ["存储空间管理"]),
          vnd("div", { class: "text-sm text-gray-500 dark:text-gray-400 flex items-center" }, [
            loadingStorageInfo.value ? 
              vnd("span", { class: "flex items-center" }, [
                vnd("i", { class: "pi pi-spin pi-spinner mr-1" }),
                "存储占用: 计算中..."
              ]) :
              `存储占用: ${storageInfo.value?.total?.formatted || "未计算"}`
          ]),
        ]),
        default: () => vnd("div", { class: [] }, [
          // Storage information section
          vnd("div", { class: "p-3 border-1 border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800" }, [
            vnd("div", { class: "flex justify-between items-center mb-2" }, [
              vnd("h4", { class: "text-md font-bold m-0" }, ["存储空间使用情况"]),
              vnd(ToolButton, { 
                icon: "pi pi-refresh", 
                tip: "刷新存储信息",
                loading: loadingStorageInfo.value,
                onClick: ()=>{loadStorageInfo(true)}
              }),
            ]),
            
            // 加载中状态
            loadingStorageInfo.value && vnd("div", { class: "flex items-center text-blue-500 dark:text-blue-400 mb-2" }, [
              vnd("i", { class: "pi pi-spin pi-spinner mr-2" }),
              "正在计算存储空间使用情况..."
            ]),
            
            // 如果发生错误
            storageInfo.value?.error && vnd("div", { class: "text-red-500 dark:text-red-400" }, [
              storageInfo.value.message || "获取存储信息时发生错误"
            ]),
            
            // 如果不支持 StorageManager API
            storageInfo.value?.unsupported && vnd("div", { class: "text-orange-500 dark:text-orange-400 mb-2" }, [
              "当前浏览器不支持存储估算 API，无法获取精确存储大小"
            ]),
            
            // 总体存储信息
            !loadingStorageInfo.value && storageInfo.value && !storageInfo.value.error && vnd("div", { class: "grid grid-cols-2 gap-2" }, [
              // 总体存储使用
              vnd("div", { class: "col-span-2 flex justify-between border-b-1 dark:border-gray-700 pb-1 mb-2" }, [
                vnd("div", { class: "font-bold" }, ["总占用空间"]),
                vnd("div", {}, [
                  `${storageInfo.value.total?.formatted || "未知"} / 
                   ${storageInfo.value.total?.quota?.formatted || "未知"} 
                   (${storageInfo.value.total?.percentUsed || "0%"})`
                ])
              ]),
              
              // 表记录数量
              vnd("div", { class: "col-span-2 flex justify-between border-b-1 dark:border-gray-700 pb-1 mb-1" }, [
                vnd("div", { class: "font-bold" }, ["数据库记录总数"]),
                vnd("div", {}, [
                  `${storageInfo.value.tableCounts?.total || 0} 条记录`
                ])
              ]),
              
              // 详细表信息
              vnd("div", { class: "flex justify-between" }, [
                vnd("div", {}, ["笔记历史版本表"]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.qtBookBackups || 0} 条记录`
                ])
              ]),
              vnd("div", { class: "flex justify-between" }, [
                vnd("div", {}, ["聊天记录表"]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.chatRecords || 0} 条记录`
                ])
              ]),
              vnd("div", { class: "flex justify-between" }, [
                vnd("div", {}, ["键值存储表"]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.kvs || 0} 条记录`
                ])
              ])
            ])
          ])
        ])
      });
    };
  }
});
