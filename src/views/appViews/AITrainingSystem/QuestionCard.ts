// @unocss-include

import { h as vnd, defineComponent, PropType } from 'vue';
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

    return () => 
      vnd(Panel, {
        // header: `[${props.idx??" "}] ${props.question.nnid}`,
        toggleable: true,
      }, {
        header: () => vnd("div", { class: "stack-h items-center" }, [
          vnd("div", { class: "font-bold" }, [`[${props.idx??" "}] ${props.question.nnid}`]),
          vnd(Badge, {
            value: props?.state??"预备",
            severity: ({
              "预备": "secondary",
              "中断": "contrast",
              "做题中": "secondary",
              "正确": "success",
              "错误分析中": "warn",
              "错误已分析": "danger",
              "太简单已跳过": "info",
              "太困难已跳过": "info",
            })[props?.state??"预备"]??"secondary",
            class: "ml-2"
          }),
        ]),
        default: () => vnd("div", { class: "stack-v" }, [

          vnd(Badge, { value: getStatusText(), severity: "secondary", }),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`题目`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
          ]}, [
            JSON.stringify(props.question.content, null, 2),
          ]),
          vnd("div", { class: []}, [`题面字段`]),
          vnd("div", { class: []}, [`答案字段`]),
          vnd("div", { class: []}, [`解释字段`]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`作答`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
          ]}, [
            JSON.stringify(props?.response??null, null, 2),
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
                JSON.stringify(props?.response?.answer??null, null, 2),
              ]),
            ]),
          ]),

          vnd("div", { class: ["mt-2 stack-h-center"]}, [
            vnd("div", { class: ["font-bold opacity-80"]}, [`正误：`]),
            vnd(Badge, {
              value: ({
                "预备": "未知",
                "中断": "未知",
                "做题中": "未知",
                "正确": "正确",
                "错误分析中": "错误",
                "错误已分析": "错误",
                "太简单已跳过": "跳过",
                "太困难已跳过": "跳过",
              })[props?.state??"未知"]??"未知",
              severity: ({
                "预备": "secondary",
                "中断": "contrast",
                "做题中": "secondary",
                "正确": "success",
                "错误分析中": "warn",
                "错误已分析": "danger",
                "太简单已跳过": "info",
                "太困难已跳过": "info",
              })[props?.state??"预备"]??"secondary",
            }),
          ]),

          vnd("div", { class: ["mt-2 font-bold opacity-80"]}, [`错误分析`]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!", "w-100%",
          ]}, [
            JSON.stringify(props?.errorReport??null, null, 2),
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