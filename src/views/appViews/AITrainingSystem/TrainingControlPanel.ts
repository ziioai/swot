// @unocss-include

import { h as vnd, defineComponent, PropType } from 'vue';
import { SWOTOptions, SWOTState } from './types';
import ToolButton from '@components/shared/ToolButton';
// import Button from 'primevue/button';
// import InputNumber from 'primevue/inputnumber';
import Panel from 'primevue/panel';
// import Card from 'primevue/card';
import Divider from 'primevue/divider';
import NumberInputField from './components/NumberInputField';



export default defineComponent({
  name: "TrainingControlPanel",
  props: {
    options: {
      type: Object as PropType<SWOTOptions>,
      required: true
    },
    state: {
      type: Object as PropType<SWOTState>,
      required: true
    },
    isTraining: {
      type: Boolean,
      required: true
    }
  },
  emits: [
    'start-training',
    'continue-training',
    'pause-training',
    'stop-training',
    'update:options'
  ],
  setup(props, { emit }) {
    const updateOption = (key: keyof SWOTOptions, value: number) => {
      emit('update:options', { ...props.options, [key]: value });
    };


    // 在 TrainingControlPanel.ts 中添加辅助函数
    function numberInput(label: string, optionKey: keyof SWOTOptions, description?: (value: number) => string) {
      return vnd(NumberInputField, {
        label,
        modelValue: props.options[optionKey] as number,
        'onUpdate:modelValue': (value: number) => updateOption(optionKey, value),
        description
      });
    }

    return () => vnd("div", { class: "space-y-4" }, [

      vnd(Panel, {
        header: "训练状态",
        toggleable: true,
        collapsed: false,
      }, {
        default: () => vnd("div", { class: "flex flex-wrap gap-4" }, [
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!",
          ]}, [
            JSON.stringify(props.state, null, 2),
          ]),
          vnd("div", { class: [
            "p-panel p-0.5rem", "flex-auto whitespace-pre-wrap overflow-auto",
            "bg-zinc-100/75!", "dark:bg-zinc-800/75!",
          ]}, [
            JSON.stringify(props.options, null, 2),
          ]),
          // vnd("div", { class: "flex-auto mb-2" }, [
          //   vnd("label", { class: "block", }, "总体做题次数"),
          //   vnd("div", { class: "my-1 w-100%", id: "totalCount" }, `${props.state.totalCount}/${props.options.maxLoopCount}`),
          //   vnd("p", { class: "text-xs opacity-60 mt-1" }, "已循环次数 / 最大循环次数")
          // ]),
          // vnd("div", { class: "flex-auto mb-2" }, [
          //   vnd("label", { class: "block", }, "版本确证"),
          //   vnd("div", { class: "my-1 w-100%", id: "versionCertifyCount" }, `${props.state.versionCertifyCount}/${props.options.maxCertifyCount}`),
          //   vnd("p", { class: "text-xs opacity-60 mt-1" }, "当前版本的确证次数 / 最大确证次数")
          // ]),
        ]),
      }),

      vnd("div", { class: "space-y-2" }, [
        vnd(ToolButton, { outlined: false, severity: "primary",
          label: "开始", icon: "pi pi-play", class: "w-full", disabled: props.isTraining,
          onClick: () => emit('start-training'),
        }),
        vnd(ToolButton, { outlined: false, severity: "primary",
          label: "继续", icon: "pi pi-play", class: "w-full", disabled: props.isTraining,
          onClick: () => emit('continue-training'),
        }),
        vnd(ToolButton, { outlined: false, severity: props.isTraining?"danger":"secondary",
          label: "暂停", icon: "pi pi-pause", class: "w-full", disabled: !props.isTraining,
          onClick: () => emit('pause-training'),
        }),
        vnd(ToolButton, { outlined: false, severity: props.isTraining?"danger":"secondary",
          label: "停止", icon: "pi pi-stop", class: "w-full", disabled: !props.isTraining,
          onClick: () => emit('stop-training'),
        }),
      ]),

      vnd(Divider),

      vnd(Panel, {
        header: "题目标记阈值设置",
        toggleable: true,
        collapsed: true,
      }, {
        default: () => vnd("div", { class: "flex flex-wrap gap-4" }, [
          vnd("div", {}, "一道题通常被视为【未跳过的非简单题】，除非它满足以下条件之一："),
          numberInput( "版本简单题阈值", "versionSimpleThreshold",
            value => `使用当前版本的笔记，某道题累计做了 ${value} 次且全都做对了，就会被判定为【版本简单题】，笔记更新前不再做这道题。`
          ),
          numberInput( "总体简单题阈值", "totalSimpleThreshold",
            value => `在整个训练过程中，某道题累计做了 ${value} 次且全都做对了，就会被判定为【总体简单题】，训练过程中不再做这道题。`
          ),
          numberInput( "版本困难题阈值", "versionSkipThreshold",
            value => `使用当前版本的笔记，某道题累计做错 ${value} 次，就会被判定为【版本难题】，笔记更新前不再做这道题。`
          ),
          numberInput( "总体困难题阈值", "totalSkipThreshold",
            value => `在整个训练过程中，某道题累计做错 ${value} 次，就会被判定为【总体难题】，训练过程中不再做这道题。`
          ),
        ]),
      }),

      vnd(Panel, {
        header: "训练过程参数设置",
        toggleable: true,
        collapsed: true,
      }, {
        default: () => vnd("div", { class: "flex flex-wrap gap-4" }, [
          numberInput( "并发数", "batchSize",
            value => `每次同时做 ${value} 道题。`
          ),
          numberInput( "每题最做多少次", "maxVerifyCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但有可能模型反复尝试后仍然无法达成这个目标，因此我们设置一次训练中每道题最做 ${value} 遍，否则就跳过这道题。此设置与【题目标记阈值】是相互补充的关系，谁先达成就执行谁。`
          ),
          numberInput( "训练过程最多循环多少次", "maxLoopCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但有可能模型反复修改笔记仍然无法达成这个目标，因此我们设置它最多把训练过程重复 ${value} 遍，避免无限循环。`
          ),
          numberInput( "最大确证次数", "maxCertifyCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但是只做对1次可能并不能让人放心，所以我们要进行“确证”，即每道题要做对 ${value} 次，才算是真的通过。`
          ),
        ])
      }),


    ]);
  }
});