/* eslint-disable @typescript-eslint/no-explicit-any */
// @unocss-include

import _ from 'lodash';
import {nanoid} from 'nanoid';
// import clipboard from "clipboard";
// import {produce} from 'immer';

import {
  h as vnd, defineComponent,
  // ref,
  reactive,
  // computed,
  onMounted,
  // onUnmounted,
  // nextTick,
} from 'vue';

import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
// import Card from 'primevue/card';
// import Select from 'primevue/select';
// import Slider from 'primevue/slider';
// import InputText from 'primevue/inputtext';
// import FloatLabel from 'primevue/floatlabel';
// import ToggleSwitch from 'primevue/toggleswitch';
// import Message from 'primevue/message';
// import Fieldset from 'primevue/fieldset';
import ToolButton from '@components/shared/ToolButton';
// import Bubble from "@components/chat/Bubble";

import { useToast } from 'primevue/usetoast';
// import { useConfirm } from "primevue/useconfirm";

import { MyWordTagSpan } from '../AppDemoView';

import {
  save,
  load,
  saveChatRecord,
  saveQtBookBackup,
} from './ss-db-functions';

import {
  SpaCE_Step1_MakeItems,
  SpaCE_Step1_Process,
  SpaCE_Step1_AfterProcess,
  SpaCE_Step2_MakeQuestion,
  SpaCE_Step2_Process,
  SpaCE_Step3_MakeErrorCase,
  SpaCE_Step3_Process,
} from '@utils/functions';

import {
  // save as appSave,
  load as appLoad,
} from '@utils/functions';

import {
  播放叮咚声,
  播放咕嘟声,
  播放咔哒声,
  播放喇叭式胜利音效,
  播放随机曲谱,
  // 播放猫叫声,
  // 播放男人说话声,
  // 播放女人说Good声,
  // 播放胜利音效,
  // 播放小星星,
  // 播放电子舞曲,
} from '@utils/soundEffects';

// import {
//   suppliers,
//   type SupplierDict,
// } from 'ai-util';
type ModelDict = {name?: string, label?: string, id?: string|number};

import {
  // LLMClient,
  // LLMRole,
  // type LifeCycleFns,
  suppliers,
  type SupplierDict,
} from 'llm-utils';


// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //








export const tableTextarea = (
  form: any,
  title: string,
  key: string,
  saveTo: string,
  placeholder: string=title,
  props?: any,
) => {
  return [
    vnd("div", { class: "opacity-80 fw-500" }, title),
    vnd(Textarea, { class: "w-full",
      placeholder: placeholder,
      ...props,
      modelValue: form?.[key],
      "onUpdate:modelValue": (value: string) => {
        form[key] = value;
        save(saveTo, form);
      },
    }),
  ];
};





// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

const SpaCESolverDemo = defineComponent({
  name: "SpaCESolverDemo",
  setup() {

    // /** ui **/ //
    const toast = useToast();
    // const confirm = useConfirm();

    // /** data **/ //
    const ssData = reactive({
      theData: {
        input: "",

        processing: false,
        thinking: "",
        output: "",
        thinkingSpans: [] as string[],
        outputSpans: [] as string[],
        outputData: null as any,

        qtBook: {entries:[]} as any,
        items: [] as any[],
        question: null as any,

      },


      data2: {} as any,
      data3: {} as any,

      inLoop: false,
      loopStartingQuestion: null as any,
      lastErrorQuestion: null as any,

      qtBookVersion: "",

    });

    // /** lifecycle **/ //
    onMounted(async ()=>{
      const ssData_ = await load("ssData");
      if (ssData_!=null) { Object.assign(ssData, ssData_); } else {
        toast.add({ severity: "success", summary: "欢迎", detail: "Welcome.", life: 3000 });
      }
      if (ssData?.qtBookVersion==null) {
        ssData.qtBookVersion = nanoid();
      }
      ssData.theData.processing = false;
      ssData.inLoop = false;
    });

    const supplierForm = reactive({
      selectedSupplier: suppliers[0] as SupplierDict,
      apiKeyDict: {} as Record<string, string>,
      supplierModelsDict: {} as Record<string, ModelDict[]>,
      selectedModelDict: {} as Record<string, ModelDict>,
    });
    onMounted(async ()=>{
      const supplierForm_ = await appLoad("supplierForm");
      if (supplierForm_!=null) { Object.assign(supplierForm, supplierForm_); }
    });



    // /** hooks **/ //



    // // const dbRecords = useDbRecords(5);
    // const dbChats = useDbChats(10);
    // const lastNChats = computed(()=>{
    //   console.log("lastNChats", dbChats?.lastNChats?.value);
    //   // --eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   return (dbChats?.lastNChats?.value as any)??[]
    // });


    // /** computed **/ //



    // /** methods **/ //

    // async function 执行分析<CR, TT>() {
    // }

    const 记录做题数据 = async () => {
      await saveChatRecord({key: nanoid(), data: ssData.data2});
    };
    const 记录笔记版本 = async (dataWrap: any) => {
      await saveQtBookBackup({key: ssData.qtBookVersion, data: dataWrap.qtBook});
    };

    const 更新笔记 = async (dataWrap: any) => {
      await 记录笔记版本(dataWrap);
      播放咔哒声();
      // console.log(dataWrap);
      // console.log(dataWrap.outputData);
      await SpaCE_Step1_AfterProcess(dataWrap);
      ssData.qtBookVersion = nanoid();
    };

    const 函数_分析错误 = async () => {
      ssData.data3.outputData = null;
      Object.assign(ssData.data3, _.pick(ssData.data2, ["qtBook", "question"]));
      ssData.data3.errorItem = _.cloneDeep(ssData.data2.outputData);
      SpaCE_Step3_MakeErrorCase(ssData.data3);
      ssData.data3.processing = true;
      await SpaCE_Step3_Process(ssData.data3, supplierForm);
      ssData.data3.processing = false;
      save("ssData", ssData);
    };

    const 函数_做题 = async () => {
      ssData.data2.outputData = null;
      ssData.data3 = {};
      Object.assign(ssData.data2, _.pick(ssData.theData, ["qtBook", "question"]));
      ssData.data2.processing = true;
      await SpaCE_Step2_Process(ssData.data2, supplierForm);
      ssData.data2.processing = false;
      save("ssData", ssData);
      if (ssData.data2.outputData?.answer!=null&&ssData.data2.outputData?.answer!=ssData.data2.question.answer) {
        ssData.lastErrorQuestion = ssData.data2.question;
      }
      await 记录做题数据();
    };

    const 函数_刷新随机例题 = async () => {
      await SpaCE_Step1_MakeItems(ssData.theData);
    };

    const 函数_刷新验证题 = async () => {
      ssData.data2.thinkingSpans = [];
      ssData.data2.outputSpans = [];
      ssData.data2.outputData = null;
      await SpaCE_Step2_MakeQuestion(ssData.theData);
    };

    const 函数_刷新并做题 = async () => {
      await 函数_刷新验证题();
      await 函数_做题();
    };

    const 函数_刷新并连续做题直到做错 = async () => {
      await 函数_刷新并做题();
      if (ssData.data2.outputData?.answer==ssData.data2.question.answer) {
        if (_.isEqual(ssData.lastErrorQuestion, ssData.data2.question)) {
          播放喇叭式胜利音效();
          toast.add({ severity: "success", summary: "答对了！", detail: "循环结束！", life: 1000 });
        } else {
          播放叮咚声();
          toast.add({ severity: "success", summary: "答对了！", detail: "将继续作答下一题", life: 1000 });
          await 函数_刷新并连续做题直到做错();
        }
      } else {
        播放咕嘟声();
        toast.add({ severity: "error", summary: "答错了！", detail: "请分析错误", life: 1000 });
        await 函数_分析错误();
      }
    };

    const 函数_连续做题直到做错 = async () => {
      await 函数_做题();
      if (ssData.data2.outputData?.answer==ssData.data2.question.answer) {
        播放叮咚声();
        toast.add({ severity: "success", summary: "答对了！", detail: "将继续作答下一题", life: 1000 });
        await 函数_刷新并连续做题直到做错();
      } else {
        播放咕嘟声();
        toast.add({ severity: "error", summary: "答错了！", detail: "请分析错误", life: 1000 });
        await 函数_分析错误();
      }
    };

    const 函数_刷新并连续做题且做错时自动更新笔记直到一周全对 = async () => {
      if (!ssData.inLoop) {
        ssData.loopStartingQuestion = ssData.data2.question;
        ssData.inLoop = true;
      }
      await 函数_刷新并做题();
      if (ssData.data2.outputData?.answer==ssData.data2.question.answer) {
        if (_.isEqual(ssData.loopStartingQuestion, ssData.data2.question)) {
          ssData.inLoop = false;
          播放喇叭式胜利音效();
          toast.add({ severity: "success", summary: "答对了！", detail: "循环结束！", life: 1000 });
        } else {
          播放叮咚声();
          toast.add({ severity: "success", summary: "答对了！", detail: "将继续作答下一题", life: 1000 });
          await 函数_刷新并连续做题且做错时自动更新笔记直到一周全对();
        }
      } else {
        播放咕嘟声();
        toast.add({ severity: "error", summary: "答错了！", detail: "请分析错误", life: 1000 });
        await 函数_分析错误();
        await 更新笔记(ssData.data2);
        await 函数_刷新并连续做题且做错时自动更新笔记直到一周全对();
      }
    };

    const 函数_连续做题且做错时自动更新笔记直到一周全对 = async () => {
      await 函数_做题();
      if (ssData.data2.outputData?.answer==ssData.data2.question.answer) {
        播放叮咚声();
        toast.add({ severity: "success", summary: "答对了！", detail: "将继续作答下一题", life: 1000 });
        await 函数_刷新并连续做题且做错时自动更新笔记直到一周全对();
      } else {
        播放咕嘟声();
        toast.add({ severity: "error", summary: "答错了！", detail: "请分析错误", life: 1000 });
        await 函数_分析错误();
        await 更新笔记(ssData.data2);
        await 函数_刷新并连续做题且做错时自动更新笔记直到一周全对();
      }
    };



    return ()=>{
      return [
        vnd(Panel, { header: "资料", toggleable: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "p-panel p-0.5rem max-h-12rem overflow-auto"}, [

            vnd("div", {class: "stack-v"}, [
              vnd("a", {href: "https://pku-space.github.io/SpaCE2025/", target: "_blank"}, [ "SpaCE2025" ]),

              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "播放叮咚声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放叮咚声, }),
                vnd(ToolButton, { label: "播放咕嘟声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咕嘟声, }),
                vnd(ToolButton, { label: "播放咔哒声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咔哒声, }),
                // vnd(ToolButton, { label: "播放猫叫声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放猫叫声, }),
                // vnd(ToolButton, { label: "播放男人说话声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放男人说话声, }),
                // vnd(ToolButton, { label: "播放女人说Good声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放女人说Good声, }),
              ]),

              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "播放喇叭式胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放喇叭式胜利音效, }),
                // vnd(ToolButton, { label: "播放胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放胜利音效, }),
                // vnd(ToolButton, { label: "播放小星星", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放小星星, }),
                // vnd(ToolButton, { label: "播放电子舞曲", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放电子舞曲, }),
                vnd(ToolButton, { label: "播放随机曲谱", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(16);}, }),
                vnd(ToolButton, { label: "播放随机曲谱64", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(64);}, }),
              ]),

            ]),

            // vnd("div", {class: "stack-h"}, []),
          ]),
        }),

        vnd(Panel, { header: "随机例题", toggleable: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "stack-v"}, [
            // vnd(Textarea, { class: "w-full", placeholder: "输入",
            //   modelValue: ssData.theData.input,
            //   "onUpdate:modelValue": (value: string) => {
            //     ssData.theData.input = value;
            //     save("ssData.theData", ssData.theData);
            //   },
            //   disabled: ssData.theData.processing,
            // }),

            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "刷新", icon: "pi pi-play", class: "mr-1.5rem",
                onClick: 函数_刷新随机例题,
              }),
            ]),

            vnd("div", {class: "p-panel p-0.5rem max-h-12rem overflow-auto"}, [
              vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.theData.items, null, 2) ]),
            ]),

            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "分析", icon: "pi pi-play", class: "mr-1.5rem",
                onClick: async () => {
                  ssData.theData.outputData = null;
                  ssData.theData.processing = true;
                  await SpaCE_Step1_Process(ssData.theData, supplierForm);
                  ssData.theData.processing = false;
                  save("ssData", ssData);
                },
              }),
            ]),

            !ssData.theData?.thinkingSpans?.length?null:[
              vnd("div", {class: "p-panel p-0.5rem max-h-6rem overflow-auto",}, [
                ((ssData.theData?.thinkingSpans??[])as any[]).map((it, idx)=>vnd(MyWordTagSpan, {
                  key:`[${idx}]${it}`, word: it,
                })),
              ]),
              vnd("div", {class: "stack-h opacity-60"}, [
                `已思考 ${ ssData.theData?.thinkingSpans?.length } tokens`,
              ]),
            ],

            !ssData.theData?.outputSpans?.length?null:[
              vnd("div", {class: "p-panel p-0.5rem max-h-6rem overflow-auto",}, [
                ((ssData.theData?.outputSpans??[])as any[]).map((it, idx)=>vnd(MyWordTagSpan, {
                  key:`[${idx}]${it}`, word: it,
                })),
              ]),
              vnd("div", {class: "stack-h opacity-60"}, [
                `已输出 ${ ssData.theData?.outputSpans?.length } tokens`,
              ]),
            ],

            ssData.theData.outputData==null?null:
            vnd("div", {class: "p-panel p-0.5rem max-h-50vh overflow-auto"}, [
              vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.theData.outputData, null, 2) ]),
            ]),
            ssData.theData.outputData==null?null:
            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "更新", icon: "pi pi-play", class: "mr-1.5rem",
                onClick: async () => {
                  await 更新笔记(ssData.theData);
                },
              }),
            ]),

            vnd("div", {class: "stack-h"}, []),
          ]),
        }),

        // vnd(Panel, { header: "好", toggleable: true, class: "my-1.5rem! col" }, {
        //   default: () => vnd("div", {class: "stack-v"}, [
        //     vnd("div", {class: "stack-h"}, []),
        //   ]),
        // }),

        vnd(Panel, { header: "随机验证题", toggleable: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "stack-v"}, [

            vnd("div", {class: "stack-v"}, [
              vnd("div", {class: ""}, [ "inLoop: ", JSON.stringify(ssData.inLoop) ]),
              vnd("div", {class: ""}, [ "lastErrorQuestion: ", JSON.stringify(ssData.lastErrorQuestion).slice(0, 60), "..." ]),
              vnd("div", {class: ""}, [ "loopStartingQuestion: ", JSON.stringify(ssData.loopStartingQuestion).slice(0, 60), "..." ]),
            ]),

            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "刷新", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_刷新验证题, }),
              vnd(ToolButton, { label: "刷新并做题", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_刷新并做题, }),
              vnd(ToolButton, { label: "刷新并连续做题直到做错", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_刷新并连续做题直到做错, }),
              vnd(ToolButton, { label: "刷新并连续做题且做错时自动更新笔记直到一周全对", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_刷新并连续做题且做错时自动更新笔记直到一周全对, }),
            ]),

            vnd("div", {class: "p-panel p-0.5rem max-h-12rem overflow-auto"}, [
              vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.theData.question, null, 2) ]),
            ]),

            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "做题", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_做题, }),
              vnd(ToolButton, { label: "连续做题直到做错", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_连续做题直到做错, }),
              vnd(ToolButton, { label: "连续做题且做错时自动更新笔记直到一周全对", icon: "pi pi-play", class: "mr-0.5rem", onClick: 函数_连续做题且做错时自动更新笔记直到一周全对, }),
            ]),

            !ssData.data2?.thinkingSpans?.length?null:[
              vnd("div", {class: "p-panel p-0.5rem max-h-6rem overflow-auto",}, [
                ((ssData.data2?.thinkingSpans??[])as any[]).map((it, idx)=>vnd(MyWordTagSpan, {
                  key:`[${idx}]${it}`, word: it,
                })),
              ]),
              vnd("div", {class: "stack-h opacity-60"}, [
                `已思考 ${ ssData.data2?.thinkingSpans?.length } tokens`,
              ]),
            ],

            ssData.data2.outputData==null?ssData.data2?.outputSpans?.length?[
              vnd("div", {class: "p-panel p-0.5rem max-h-6rem overflow-auto",}, [
                ((ssData.data2?.outputSpans??[])as any[]).map((it, idx)=>vnd(MyWordTagSpan, {
                  key:`[${idx}]${it}`, word: it,
                })),
              ]),
              vnd("div", {class: "stack-h opacity-60"}, [
                `已输出 ${ ssData.data2?.outputSpans?.length } tokens`,
              ]),
            ]:
            null:
            vnd("div", {class: "p-panel p-0.5rem max-h-50vh overflow-auto"}, [
              vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.data2.outputData, null, 2) ]),
            ]),

            ssData.data2.outputData!=null&&[
              ssData?.data2?.outputData?.answer==ssData?.data2?.question?.answer
              ?vnd("div", {class: "text-green"}, [ "答对了！" ])
              :[
                vnd("div", {class: "text-red"}, [ "答错了！" ]),
                vnd("div", {class: "stack-h"}, [
                  vnd(ToolButton, { label: "分析错误", icon: "pi pi-play", class: "mr-0.5rem",
                    onClick: 函数_分析错误,
                  }),
                ]),

                ssData.data3.outputData==null?ssData.data3?.outputSpans?.length?[
                  vnd("div", {class: "p-panel p-0.5rem max-h-6rem overflow-auto",}, [
                    ((ssData.data3?.outputSpans??[])as any[]).map((it, idx)=>vnd(MyWordTagSpan, {
                      key:`[${idx}]${it}`, word: it,
                    })),
                  ]),
                  vnd("div", {class: "stack-h opacity-60"}, [
                    `已输出 ${ ssData.data3?.outputSpans?.length } tokens`,
                  ]),
                ]:
                null:
                vnd("div", {class: "p-panel p-0.5rem max-h-50vh overflow-auto"}, [
                  vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.data3.outputData, null, 2) ]),
                ]),
                ssData.data3.outputData==null?null:
                vnd("div", {class: "stack-h"}, [
                  vnd(ToolButton, { label: "更新", icon: "pi pi-play", class: "mr-1.5rem",
                    onClick: async () => {
                      await 更新笔记(ssData.data3);
                      ssData.theData.qtBook = ssData.data3.qtBook;
                      ssData.data2.qtBook = ssData.data3.qtBook;
                    },
                  }),
                ]),
              ],
            ],

            // vnd("div", {class: "stack-h"}, []),
          ]),
        }),

        vnd(Panel, { header: "当前笔记", toggleable: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "p-panel p-0.5rem max-h-12rem overflow-auto"}, [
            vnd("div", {class: "stack-h"}, [`版本：${ssData.qtBookVersion}`]),

            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "清空", icon: "pi pi-play", class: "mr-1.5rem",
                severity: "danger",
                onClick: async () => {
                  ssData.data3.qtBook = {entries:[]};
                  ssData.data2.qtBook = {entries:[]};
                  ssData.theData.qtBook = {entries:[]};
                },
              }),
              vnd(ToolButton, { label: "复制", icon: "pi pi-copy", class: "mr-1.5rem",
                onClick: async () => {
                  await navigator.clipboard.writeText(JSON.stringify(ssData.theData.qtBook, null, 2));
                  toast.add({ severity: "success", summary: "已复制", detail: "已复制到剪贴板", life: 3000 });
                },
              }),
            ]),

            vnd("div", {class: "stack-v"}, [
              vnd("div", {class: "whitespace-pre-wrap overflow-auto"}, [ JSON.stringify(ssData.theData.qtBook?.entries, null, 2) ]),
            ]),

            // vnd("div", {class: "stack-h"}, []),
          ]),
        }),

      ];
    };
  }
})

export default SpaCESolverDemo;
