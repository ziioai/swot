// @unocss-include

import { h as vnd, defineComponent, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Panel from 'primevue/panel';
import ToolButton from '@components/shared/ToolButton';
import { getIDBStorageSize } from './swot-db-functions';
import { sleep } from '@utils/functions';

export default defineComponent({
  name: "StorageInfoPanel",
  setup() {
    const { t } = useI18n();
    const storageInfo = ref<any>(null);
    const loadingStorageInfo = ref(false);
    
    const loadStorageInfo = async (force=false) => {
      if (!force&&loadingStorageInfo.value) return;
      loadingStorageInfo.value = true;
      try {
        storageInfo.value = await new Promise((resolve) => {
          window.requestIdleCallback 
            ? window.requestIdleCallback(() => { getIDBStorageSize().then(resolve); }) 
            : getIDBStorageSize().then(resolve);
        });
      } catch (error) {
        console.error("Failed to get storage size:", error);
        storageInfo.value = { error: true, message: t('AITrainingSystem.StorageInfoPanel.errorDefault') };
      } finally {
        loadingStorageInfo.value = false;
      }
    };

    onMounted(async () => {
      await sleep(1500);
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
          vnd("div", { class: "font-bold" }, [t('AITrainingSystem.StorageInfoPanel.title')]),
          vnd("div", { class: "text-sm text-gray-500 dark:text-gray-400 flex items-center" }, [
            loadingStorageInfo.value ? 
              vnd("span", { class: "flex items-center" }, [
                vnd("i", { class: "pi pi-spin pi-spinner mr-1" }),
                t('AITrainingSystem.StorageInfoPanel.usageCalculating')
              ]) :
              `${t('AITrainingSystem.StorageInfoPanel.usagePrefix')}${storageInfo.value?.total?.formatted || t('AITrainingSystem.StorageInfoPanel.notCalculated')}`
          ]),
        ]),
        default: () => vnd("div", { class: [] }, [
          vnd("div", { class: "p-3 border-1 border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800" }, [
            vnd("div", { class: "flex justify-between items-center mb-2" }, [
              vnd("h4", { class: "text-md font-bold m-0" }, [t('AITrainingSystem.StorageInfoPanel.usageDetailsTitle')]),
              vnd(ToolButton, { 
                icon: "pi pi-refresh", 
                tip: t('AITrainingSystem.StorageInfoPanel.refreshTip'),
                loading: loadingStorageInfo.value,
                onClick: ()=>{loadStorageInfo(true)}
              }),
            ]),
            
            loadingStorageInfo.value && vnd("div", { class: "flex items-center text-blue-500 dark:text-blue-400 mb-2" }, [
              vnd("i", { class: "pi pi-spin pi-spinner mr-2" }),
              t('AITrainingSystem.StorageInfoPanel.calculatingDetails')
            ]),
            
            storageInfo.value?.error && vnd("div", { class: "text-red-500 dark:text-red-400" }, [
              storageInfo.value.message || t('AITrainingSystem.StorageInfoPanel.errorDefault')
            ]),
            
            storageInfo.value?.unsupported && vnd("div", { class: "text-orange-500 dark:text-orange-400 mb-2" }, [
              t('AITrainingSystem.StorageInfoPanel.unsupportedAPI')
            ]),
            
            !loadingStorageInfo.value && storageInfo.value && !storageInfo.value.error && vnd("div", { class: "grid grid-cols-2 gap-2" }, [
              vnd("div", { class: "col-span-2 flex justify-between border-b-1 dark:border-gray-700 pb-1 mb-2" }, [
                vnd("div", { class: "font-bold" }, [t('AITrainingSystem.StorageInfoPanel.totalUsage')]),
                vnd("div", {}, [
                  `${storageInfo.value.total?.formatted || t('AITrainingSystem.StorageInfoPanel.unknown')} / 
                   ${storageInfo.value.total?.quota?.formatted || t('AITrainingSystem.StorageInfoPanel.unknown')} 
                   (${storageInfo.value.total?.percentUsed || "0%"})`
                ])
              ]),
              
              vnd("div", { class: "col-span-2 flex justify-between border-b-1 dark:border-gray-700 pb-1 mb-1" }, [
                vnd("div", { class: "font-bold" }, [t('AITrainingSystem.StorageInfoPanel.totalRecords')]),
                vnd("div", {}, [
                  `${storageInfo.value.tableCounts?.total || 0} ${t('AITrainingSystem.StorageInfoPanel.recordsSuffix')}`
                ])
              ]),
              
              vnd("div", { class: "col-span-2 flex justify-between" }, [
                vnd("div", {}, [t('AITrainingSystem.StorageInfoPanel.qtBookBackupsTable')]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.qtBookBackups || 0} ${t('AITrainingSystem.StorageInfoPanel.recordsSuffix')}`
                ])
              ]),
              vnd("div", { class: "col-span-2 flex justify-between" }, [
                vnd("div", {}, [t('AITrainingSystem.StorageInfoPanel.chatRecordsTable')]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.chatRecords || 0} ${t('AITrainingSystem.StorageInfoPanel.recordsSuffix')}`
                ])
              ]),
              vnd("div", { class: "col-span-2 flex justify-between" }, [
                vnd("div", {}, [t('AITrainingSystem.StorageInfoPanel.kvsTable')]),
                vnd("div", { class: "" }, [
                  `${storageInfo.value.tableCounts?.kvs || 0} ${t('AITrainingSystem.StorageInfoPanel.recordsSuffix')}`
                ])
              ])
            ])
          ])
        ])
      });
    };
  }
});