import { h as vnd, defineComponent, PropType, } from 'vue';
import clipboard from "clipboard";
import ToolButton from '@components/shared/ToolButton';
// import Badge from 'primevue/badge';
import Panel from 'primevue/panel';

export default defineComponent({
  name: "NoteHistoryPanel",
  props: {
    version: { type: String, required: false, },
    note: {
      type: Object as PropType<any | null>,
      required: false
    }
  },
  emits: ['save-note'],
  setup(props, { emit }) {

    return () => {

      const make = () => vnd("div", { class: "stack-v" }, [
        // vnd("div", { class: ["mt-2 stack-h-center"]}, [
        //   vnd("div", { class: ["font-bold opacity-80"]}, [`当前版本：`]),
        //   vnd(Badge, {
        //     value: props?.version??"???",
        //     severity: "secondary",
        //   }),
        // ]),

        vnd("div", { class: [
          "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
          "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
        ]}, [
          JSON.stringify(props?.note??null, null, 2),
        ]),

        vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [
          vnd(ToolButton, { label: "手动保存版本", icon: "pi pi-save", class: "mr-0.5rem",
            onClick: () => emit('save-note'),
          }),
          vnd(ToolButton, { label: "复制", icon: "pi pi-copy", class: "mr-0.5rem",
            onClick: () => {
              clipboard.copy(JSON.stringify(props?.note??null, null, 2));
            },
          }),
        ]),

      ]);

      return vnd(Panel, {
        toggleable: true,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, [props?.version??"???"]),
        ]),
        default: () => make(),
      });



    };
  }
});