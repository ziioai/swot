// @unocss-include

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

// 电梯
// [【数据】] //
// [【方法】] //
// [【渲染】] //

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

import _ from "lodash";

import {
  h as vnd, defineComponent,
  ref,
  reactive,
  // markRaw,
  // computed,
  onMounted,
  computed,
  // onUnmounted,
  // watch,
  // nextTick,
} from 'vue';

import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

export const DEFAULT_MODEL = {label:"[[<DEFAULT>]]"};

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Any = any;

export function scrollToTheBottom(boxRef: ReturnType<typeof ref>) {
  const box = boxRef.value as HTMLElement;
  if (!box) return;
  // Check if user is already near the bottom
  const isNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 400;  // px
  if (isNearBottom) {
    requestAnimationFrame(() => {
      box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
    });
  }
}

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== // //

// const darked = (color: string) => ({ mainClasses: [`bg-${color}-950`, `border-${color}-700`, `text-${color}-400`], tagClasses: "opacity-50", });
// const heavy = (color: string) => ({ mainClasses: [`bg-${color}-700`, `border-${color}-800`, `text-${color}-400`], tagClasses: "opacity-50", });
const cleared = (color: string) => ({ mainClasses: [
  `bg-${color}-500`, `border-${color}-600`, `text-${color}-50`,
  `dark:bg-${color}-500`, `dark:border-${color}-400`, `dark:text-${color}-50`,
], tagClasses: "opacity-50", });
const lighted = (color: string) => ({ mainClasses: [
  `bg-${color}-100`, `border-${color}-200`, `text-${color}-950`,
  `dark:bg-${color}-900`, `dark:border-${color}-800`, `dark:text-${color}-50`,
], tagClasses: "opacity-40", });
const whited = (_color?: string) => ({ mainClasses: [
  "bg-white", "border-gray-200", "text-gray-800",
  "dark:bg-black", "dark:border-gray-800", "dark:text-gray-200",
], tagClasses: "opacity-40", });

const SpanDataDict = {
  "((~))": { ...whited(), },

  // other: { mainClasses: ["bg-white", "border-gray-100", "text-gray"], tag: "", },
  "other": { ...cleared("red"), tagFn: (parts:string[])=>parts.slice(1).join(":"), },

  // "w": { mainClasses: ["bg-gray-400", "border-gray-300", "text-gray-100"], tag: "", },
  "e": { ...lighted("gray"), tag: "e", },
  "o": { ...lighted("gray"), tag: "o", },
  "y": { ...lighted("gray"), tag: "y", },
  "w": { ...cleared("gray"), tag: "", },
  "w:paired": { ...cleared("gray"), tag: "", },

  "r:n": { ...lighted("blue"), },
  "r:v": { ...lighted("green"), },

  "q": {...lighted("sky"), tag: "q", },
  "n": { ...lighted("blue"), tagFn: (parts:string[])=>parts[1]??"", },
  "i:n": { ...lighted("blue"), tag: "i:n", },
  "symbol": { ...whited("blue"), tag: "sb", },
  // "sb": { ...whited("blue"), tag: "sb", },
  "title": { ...lighted("blue"), tag: "title", },
  "n:class": { ...lighted("indigo"), tagFn: (parts:string[])=>parts[2]??"", },
  "n:v": { ...lighted("teal"), },
  "v": { ...lighted("green"), },
  "i:v": { ...lighted("green"), tag: "i:v", },
  "v:adj": { ...lighted("lime"), },
  "v:sym": { ...lighted("rose"), tag: "", },

  "p": { ...cleared("amber"), },
  "c": { ...cleared("stone"), },
  // "u": { ...cleared("slate"), tag: "", },
  "u": { ...cleared("yellow"), tag: "", },
  "f": {...lighted("amber"), },

  "rz": {...cleared("violet"), tag: "rz", },
  "g": {...lighted("violet"), tag: "g", },
  "mq": {...lighted("purple"), tag: "mq", },
  "m": {...lighted("purple"), tag: "m", },
  "a": {...lighted("fuchsia"), tag: "a", },
  "i:a": { ...lighted("fuchsia"), tag: "i:a", },
  "b": {...lighted("fuchsia"), tag: "b", },
  "d": {...lighted("violet"), tag: "d", },

} as Any;

//** ---------- ---------- ---------- ---------- ---------- **//

export const MyWordTagSpan = defineComponent({
  name: "MyWordTagSpan",
  props: ["word", "tag", "translate"],
  setup(props) {
    const tagParts = ((props?.tag??"") as string).split(":");
    const spanData = computed (()=>
      SpanDataDict?.[tagParts.join(":")]??
      SpanDataDict?.[tagParts.slice(0,2).join(":")]??
      SpanDataDict?.[tagParts.slice(0,1).join(":")]??
      SpanDataDict?.[tagParts[0]]??
      SpanDataDict?.["((~))"]
    );
    const finalTag = computed(()=>props.tag??spanData.value?.tag??spanData.value?.tagFn?.(tagParts)??props.tag);

    return ()=>{
      const make = ()=> vnd("span", {
        onClick: ()=>{ console.log({
          props, tagParts, spanData,
        }); },
        class: [
          "inline-block border rounded px-0.2rem py-0.05rem m-0.1rem",
          spanData.value?.mainClasses,
        ],
        title: `${props.word??""}\n${props.translate??""}\n${props.tag??""}`,
        "data-tag": props.tag,
        "data-translate": props.translate,
        "data-final-tag": finalTag.value,
      }, [
        !props?.translate?.length ? props.word : vnd("ruby", {}, [props.word, vnd("rt", {class: "--fw-bold --text-shadow-md"}, props.translate)]),
        props?.tag==null?null:[" ", vnd("span", {class: spanData.value?.tagClasses}, finalTag.value)],
      ]);

      // return !props?.translate?.length ? make() : vnd("ruby", {}, [make(), vnd("rt", {class: "fw-bold text-shadow-md"}, props.translate)]);

      return make();
    };
  },
});

//** ---------- ---------- ---------- ---------- ---------- **//

export const MyElementTag = defineComponent({
  name: "MyElementTag",
  props: ["element"],
  setup(props) {
    return ()=>{
      return vnd(Tag, {
        severity:
        props?.element?.schema=="Concept"
        ?(props?.element?.term_is_specific?"warn":undefined):
        props?.element?.term_is_name
        ?"success":
        props?.element?.term_is_specific
        ?"danger":
        "info",
        title: JSON.stringify(props?.element, null, 2),
      }, {default: ()=>[
        vnd("span", {}, props?.element?.term),
        " ", vnd("span", {}, props?.element?.type),
        // " ", vnd("span", {}, props?.element?.schema),
      ]});
    };
  },
});

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export const DemoDatumPanel = defineComponent({
  name: "DemoDatumPanel",
  props: ["datum", "idx", "onClickElementPopBtn"],
  setup(props: {datum: Any, idx: number, onClickElementPopBtn: Any}, {slots}: {slots: Any}) {

    const draft = reactive({} as typeof props.datum);
    onMounted(()=>{
      Object.assign(draft, props?.datum??{});
    });

    return ()=>{
      return (vnd("div", {
        class: "p-panel p-0.5rem stack-v w-full!",
      }, [
        vnd("div", {}, [`${draft?.input}`]),

        draft?.basicInfo?.outputData!=null?
        vnd("div", {class: "stack-h"}, [
          vnd(Tag, {severity: "info", value: draft?.basicInfo?.outputData?.main_lang}),
          (draft?.basicInfo?.outputData?.other_langs??[]).map((dd:string, jdx:number)=>vnd(Tag, {key:`[${jdx}]${dd}`, value: dd})),
          vnd(Tag, {severity: "success", value: draft?.basicInfo?.outputData?.type}),
          draft?.basicInfo?.outputData?.level==null?null:
          vnd(Tag, {severity: "success", value: draft?.basicInfo?.outputData?.level}),

          (draft?.basicInfo?.outputData?.quality=="正常"||!draft?.basicInfo?.outputData?.quality)?null:
          vnd(Tag, {severity: "warn", value: draft?.basicInfo?.outputData?.quality}),

          (draft?.basicInfo?.outputData?.related_titles??[]).map((dd:string, jdx:number)=>vnd(Tag, {key:`[${jdx}]${dd}`, value: dd})),
          (draft?.basicInfo?.outputData?.related_authors??[]).map((dd:string, jdx:number)=>vnd(Tag, {key:`[${jdx}]${dd}`, value: dd})),

          (draft?.basicInfo?.outputData?.review_tags??[]).map((dd:string, jdx:number)=>vnd(Tag, {key:`[${jdx}]${dd}`, severity: "danger", value: dd})),
          // draft?.basicInfo?.outputData?.grade==null?null:
          // vnd(Tag, {value: draft?.basicInfo?.outputData?.grade}),
        ]) :
        [
          !draft?.basicInfo?.thinkingSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.basicInfo?.thinkingSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
          !draft?.basicInfo?.outputSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.basicInfo?.outputSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
        ],

        !draft?.basicInfo?.outputData?.analyze?.length?null:
        vnd("div", {class: "opacity-60"}, [`${draft?.basicInfo?.outputData?.analyze}`]),

        draft?.outputData!=null?
        vnd("div", {class: "--p-panel --p-0.5rem",}, [
          ((draft?.outputData??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd[0], tag: dd[1], translate: dd?.[2],})),
        ]):[
          !draft?.thinkingSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.thinkingSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
          !draft?.outputSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.outputSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
        ],

        draft?.elementsInfo?.outputData!=null?
        vnd("div", {class: "p-panel p-0.5rem stack-h w-full max-h-8rem overflow-auto",}, [

          ((draft?.elementsInfo?.outputData?.elements??[])as Any[]).map((dd, jdx)=>(
            vnd(MyElementTag, {element: dd, key:`[${jdx}]${dd?.term}`, onClick: async(event: Any)=>{await props?.onClickElementPopBtn?.(event, dd, "element")}})
          )),

          // JSON.stringify(draft?.elementsInfo?.outputData, null, 2),
        ]) :
        [
          !draft?.elementsInfo?.thinkingSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.elementsInfo?.thinkingSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
          !draft?.elementsInfo?.outputSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.elementsInfo?.outputSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
        ],

        draft?.rulesInfo?.outputData?.length?
        vnd("div", {class: "p-panel p-0.5rem stack-h w-full max-h-12rem whitespace-pre-wrap overflow-auto",}, [
          draft?.rulesInfo?.outputData,
        ]) :
        [
          !draft?.rulesInfo?.thinkingSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.rulesInfo?.thinkingSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
          !draft?.rulesInfo?.outputSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.rulesInfo?.outputSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
        ],

        draft?.tuplesInfo?.outputData?.length?
        vnd("div", {class: "p-panel p-0.5rem stack-h w-full max-h-12rem whitespace-pre-wrap overflow-auto",}, [
          draft?.tuplesInfo?.outputData,
        ]) :
        [
          !draft?.tuplesInfo?.thinkingSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.tuplesInfo?.thinkingSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
          !draft?.tuplesInfo?.outputSpans?.length?null:
          vnd("div", {class: "p-panel p-0.5rem max-h-8rem overflow-auto",}, [
            ((draft?.tuplesInfo?.outputSpans??[])as Any[]).map((dd, jdx)=>vnd(MyWordTagSpan, {key:`[${jdx}]${dd}`, word: dd})),
          ]),
        ],


        !draft?.processing ? null :
        vnd("div", {class: "stack-h"}, [
          vnd(ProgressSpinner, {style: {
            strokeWidth: "1rem", width: "2.5rem", height: "2.5rem",
          }, class: "my-spinner my-0.5rem!"}),
        ]),

        slots?.actionsDiv?.(draft),
      ]));
    };
  },
});

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //


