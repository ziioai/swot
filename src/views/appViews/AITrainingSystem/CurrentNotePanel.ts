// @unocss-include

import _ from 'lodash';
import clipboard from "clipboard";
import { h as vnd, defineComponent, PropType, } from 'vue';
import ToolButton from '@components/shared/ToolButton';
// import Badge from 'primevue/badge';
import Panel from 'primevue/panel';

export default defineComponent({
  name: "CurrentNotePanel",
  props: {
    version: { type: String, required: false, },
    note: {
      type: Object as PropType<any | null>,
      required: false
    },
    notebookEditPlan: {
      type: Object as PropType<any | null>,
      required: false
    },
  },
  emits: ['save-note'],
  setup(props, { emit }) {

    return () => {

      const make = () => vnd("div", { class: [ "stack-v" ] }, [

        (props?.note?.entries as any[])?.map((entry, idx) => vnd("div", {key: `[${idx}]${entry?.name}`, class: [
          "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto", "w-100%",
          entry?.deleted ? "bg-red-100/75! border-l-4 border-l-red-500" : "bg-zinc-100/75! dark:bg-zinc-800/75!",
        ],}, [
          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [
            // 已删除条目添加垃圾桶图标
            entry?.deleted && vnd("i", { 
              class: "pi pi-trash mr-2 text-red-500"
            }),
            vnd("span", { 
              class: entry?.deleted ? "line-through text-red-600" : ""
            }, [`【${entry?.name}】`]),
            // 已删除标识
            entry?.deleted && vnd("span", { 
              class: "ml-2 text-xs bg-red-100 text-red-600 py-0.5 px-1 rounded"
            }, ["已删除"]),
          ]),
          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`name,desc,clue`]),
          JSON.stringify(_.pick(entry??null, ["name", "desc", "clue"]), null, 2),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`steps`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto", "w-100%",
          ]}, [ JSON.stringify(entry?.steps??null, null, 2), ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`tips`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto", "w-100%",
          ]}, [ JSON.stringify(entry?.tips??null, null, 2), ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`tools`]),
          ((entry?.tools??[])as any[]).map((it,idx)=>vnd("div", {
            class: [ "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto", "w-100%",],
            key: `[${idx}]${it?.name}`,
          }, [ JSON.stringify(it), ])),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`datums`]),
          ((entry?.datums??[])as any[]).map((it,idx)=>vnd("div", {
            class: [ "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto", "w-100%",],
            key: `[${idx}][${it?.idx}][${it?.query}]`,
          }, [ JSON.stringify(it), ])),

          // JSON.stringify(entry??null, null, 2),
        ])),

      ]);

      return vnd(Panel, {
        toggleable: true,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, [props?.version??"???"]),
        ]),
        default: () => vnd("div", {class: []}, [
          vnd("div", {class: []}, [
            vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`笔记修改计划`]),
            vnd("div", { class: [
              "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
              "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
            ]}, [
              props?.notebookEditPlan?.outputData==null&&
              JSON.stringify(props?.notebookEditPlan??null),
              JSON.stringify(props?.notebookEditPlan?.outputData??null, null, 2),
            ]),
          ]),
          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`笔记内容`]),
          vnd("div", {class: ["overflow-auto", "max-h-80vh"]}, [
            make(),
          ]),
          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [
            vnd(ToolButton, { label: "手动保存版本", icon: "pi pi-save", class: "mr-0.5rem",
              onClick: () => emit('save-note'),
            }),
            vnd(ToolButton, { label: "复制", icon: "pi pi-copy", class: "mr-0.5rem",
              onClick: () => {
                clipboard.copy(JSON.stringify({
                  version: props?.version??null,
                  notebook:props?.note??null,
                }, null, 2));
              },
            }),
          ]),
        ]),
      });



    };
  }
});