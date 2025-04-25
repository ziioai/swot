// @unocss-include

import { h as vnd, defineComponent, PropType, reactive } from 'vue';
import Panel from 'primevue/panel';
import Badge from 'primevue/badge';
import ToolButton from '@components/shared/ToolButton';
import { QuestionEntry, QuestionTrainingState } from './types';

export default defineComponent({
  name: "QuestionCard",
  props: {
    swot: { type: Object as any, required: false, },
    idx: { type: Number, required: false, },
    state: { type: String, required: false, },
    question: {
      type: Object as PropType<QuestionEntry>,
      required: true,
    },
    judgeResponse: {
      type: Object as any,
      required: false,
      default: null,
    },
    response: {
      type: Object as any,
      required: false,
      default: null,
    },
    errorReport: {
      type: Object as any,
      required: false,
      default: null,
    },
    trainingState: {
      type: Object as PropType<QuestionTrainingState>,
      required: true,
    },
  },
  emits: ['analyze-error'],
  setup(props, {
    emit
  }) {
    const handleAnalyze = () => emit('analyze-error', props.question.nnid);

    const getStatusText = () => {
      if (props.trainingState.isSkipT) return '总体难题';
      if (props.trainingState.isSkipV) return '版本难题';
      if (props.trainingState.isSimpleT) return '总体简单题';
      if (props.trainingState.isSimpleV) return '版本简单题';
      return '未跳过的非简单题';
    };

    const map11 = {
      "预备": "secondary",
      "中断": "contrast",
      "报错": "contrast",
      "判断题型中": "secondary",
      "做题中": "secondary",
      "正确": "success",

      "错误待分析": "contrast",
      "错误分析中": "secondary",
      "错误已分析": "warn",
      "错误未分析": "danger",

      "太简单已跳过": "success",
      "太困难已跳过": "danger",
      "练够了已跳过": "info",
      "验够了已跳过": "success",
    } as { [key: string]: string; };
    const map22 = {
      "预备": "未知",
      "中断": "未知",
      "报错": "未知",
      "判断题型中": "未知",
      "做题中": "未知",
      "正确": "正确",

      "错误待分析": "错误",
      "错误分析中": "错误",
      "错误已分析": "错误",
      "错误未分析": "错误",

      "太简单已跳过": "跳过",
      "太困难已跳过": "跳过",
      "练够了已跳过": "跳过",
      "验够了已跳过": "跳过",
    } as { [key: string]: string; };

    const appData = reactive({
      collapsed: false,
    });

    return () => 
      vnd(Panel, {
        toggleable: true,
        collapsed: appData.collapsed || ![
          "判断题型中", "做题中", "错误分析中", "==错误已分析",
        ].includes(props?.trainingState?.stateText),
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, [`[${props.idx??" "}] ${props.question.nnid}`]),
          vnd(Badge, {
            value: props?.trainingState?.stateText??"预备",
            severity: map11[props?.trainingState?.stateText??"预备"]??"secondary",
            class: "ml-2"
          }),
        ]),
        default: () => vnd("div", { class: "stack-v" }, [

          vnd(Badge, { value: getStatusText(), severity: "secondary", }),

          vnd("div", { class: []}, [`题面字段`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
          ]}, [
            JSON.stringify(props.question.content, null, 2),
          ]),
          vnd("div", { class: []}, [`答案字段`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
          ]}, [
            JSON.stringify(props.question.answer, null, 2),
          ]),
          props.question?.explain!=null && [
            vnd("div", { class: []}, [`解释字段`]),
            vnd("div", { class: [
              "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
              "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
            ]}, [
              JSON.stringify(props.question.explain, null, 2),
            ]),
          ],

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`题型判断`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
          ]}, [
            props?.judgeResponse?.outputData==null&&
            JSON.stringify(props?.judgeResponse??null),
            JSON.stringify(props?.judgeResponse?.outputData??null, null, 2),
          ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`作答`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
          ]}, [
            props?.response?.outputData==null&&
            JSON.stringify(props?.response??null),
            JSON.stringify(props?.response?.outputData??null, null, 2),
          ]),

          vnd("div", { class: ["stack-h gap-1rem!"]}, [
            vnd("div", { class: ["stack-v"]}, [
              vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`参考答案`]),
              vnd("div", { class: [
                "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
                "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
              ]}, [
                JSON.stringify(props.question.answer, null, 2),
              ]),
            ]),
            vnd("div", { class: ["stack-v"]}, [
              vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`作答答案`]),
              vnd("div", { class: [
                "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
                "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
              ]}, [
                JSON.stringify(props?.response?.outputData?.answer??null, null, 2),
              ]),
            ]),
          ]),

          vnd("div", { class: ["mt-2 stack-h-center"]}, [
            vnd("div", { class: ["font-bold opacity-80"]}, [`正误：`]),
            vnd(Badge, {
              value: map22[props?.trainingState?.stateText??"未知"]??"未知",
              severity: map11[props?.trainingState?.stateText??"预备"]??"secondary",
            }),
          ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`错误分析`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%", "max-h-12rem",
          ]}, [
            props?.errorReport?.outputData==null&&
            JSON.stringify(props?.errorReport??null),
            JSON.stringify(props?.errorReport?.outputData??null, null, 2),
          ]),
          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [
            vnd(ToolButton, {
              label: "手动更新笔记", icon: "pi pi-save", class: "mr-0.5rem",
              onClick: handleAnalyze,
            }),
          ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`状态`]),
          vnd("div", { class: []}, [`版本 : 做了 ${props.trainingState.trainedCountV??0} 次，正确 ${props.trainingState.correctCountV??0} 次，错误 ${props.trainingState.errorCountV??0} 次`]),
          vnd("div", { class: []}, [`总计 : 做了 ${props.trainingState.trainedCountT??0} 次，正确 ${props.trainingState.correctCountT??0} 次，错误 ${props.trainingState.errorCountT??0} 次`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
          ]}, [
            JSON.stringify(props.trainingState, null, 2),
          ]),


        ]),
      });
  }
});