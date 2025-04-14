// @unocss-include

import _ from "lodash";
import {
  defineComponent,
  ref,
  computed,
  h as vnd,
  onMounted,
  // onUnmounted,
} from 'vue';
import { getDBDemoEntries, db } from '@utils/functions';


import Paginator from 'primevue/paginator';
import ToolButton from '@components/shared/ToolButton';


export default defineComponent({
  name: 'DBDemoEntriesDataViewer',

  setup(_props, { slots }) {
    const offset = ref(0);
    const limit = ref(10);

    const dataItems = ref([] as any[]);

    // Refresh data with current pagination
    const refreshData = async () => {
      await fetchTotalCount();
      const newEntries = await getDBDemoEntries(
        offset.value,
        limit.value
      );

      // console.log(newEntries);

      dataItems.value = _.cloneDeep(newEntries ?? []);
      await fetchTotalCount();

      // console.log({offset: offset.value, limit: limit.value, total: totalRecords.value}, dataItems.value);
    };

    const totalRecords = ref(0);
    const fetchTotalCount = async () => {
      try {
        totalRecords.value = await db.demoEntries.count();
      } catch (error) {
        console.error("Error fetching total record count:", error);
      }
    };
    // Initial fetch
    onMounted(async () => {
      await refreshData();
    });
    const totalPages = computed(() =>
      Math.ceil(totalRecords.value / limit.value)
    );

    const currentPage = computed(() => Math.floor(offset.value / limit.value));



    // Render function
    return () => {
      return vnd('div', { class: 'db-demo-entries-data-viewer flex flex-col gap-1rem' }, [

        // Pagination Controls
        vnd(Paginator, {
          rows: limit.value,
          first: offset.value,
          totalRecords: totalRecords.value,
          // rowsPerPageOptions: [10, 20, 30],
          "onUpdate:rows": async (newVal: number) => {
            limit.value = newVal;
            await refreshData();
          },
          "onUpdate:first": async (newVal: number) => {
            offset.value = newVal;
            await refreshData();
          },
        }),

        // Pagination Info
        vnd('div', { class: 'text-sm text-gray-600' }, [
          `Page ${currentPage.value + 1} of ${totalPages.value ?? 1}`, " ",
          vnd('span', { class: 'ml-2' }, `(${totalRecords.value} total records)`),
        ]),

        vnd(ToolButton, {label: 'Refresh Data', onClick: refreshData}),

        // Data Content Section
        slots.default ? slots.default({
          entries: dataItems.value ?? [],
          refreshData,
        }) : vnd('div', { class: 'text-gray-500 italic' }, 'No content slot provided'),

        // Pagination Info
        vnd('div', { class: 'text-sm text-gray-600' }, [
          `Page ${currentPage.value + 1} of ${totalPages.value ?? 1}`, " ",
          vnd('span', { class: 'ml-2' }, `(${totalRecords.value} total records)`)
        ]),

        // Pagination Controls
        vnd(Paginator, {
          rows: limit.value,
          first: offset.value,
          totalRecords: totalRecords.value,
          // rowsPerPageOptions: [10, 20, 30],
          "onUpdate:rows": async (newVal: number) => {
            limit.value = newVal;
            await refreshData();
          },
          "onUpdate:first": async (newVal: number) => {
            offset.value = newVal;
            await refreshData();
          },
        }),

      ]);
    };
  }
});
