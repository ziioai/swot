// filepath: /Users/dude/__ROOT__/__CODE__/__GITME__/swot/src/views/appViews/AITrainingSystem/TrainingControlPanel.ts
// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, PropType } from 'vue';
import { SWOTOptions, SWOTState, TrainingState } from './types';
import ToolButton from '@components/shared/ToolButton';
// import Button from 'primevue/button';
// import InputNumber from 'primevue/inputnumber';
import Panel from 'primevue/panel';
// import Card from 'primevue/card';
import Divider from 'primevue/divider';
import NumberInputField from './components/NumberInputField';
import Checkbox from 'primevue/checkbox';
import { SWOT } from './swot-trainer';
import { useToast } from 'primevue/usetoast';

import { type TrainingStateText } from './types';


export default defineComponent({
  name: "TrainingControlPanel",
  props: {
    options: {
      type: Object as PropType<SWOTOptions>,
      required: false
    },
    state: {
      type: Object as PropType<SWOTState>,
      required: false
    },
    trainingStateText: {
      type: String as PropType<TrainingStateText>,
      default: "未知状态"
    },
    isTraining: {
      type: Boolean,
      default: false
    },
    isPaused: {
      type: Boolean,
      default: false
    },
    isPreparingPause: {
      type: Boolean,
      default: false
    },
    trainer: {
      type: Object as PropType<SWOT | null>,
      default: null
    }
  },
  emits: [
    'start-training',
    'continue-training',
    'pause-training',
    'cancel-pause',
    'stop-training',
    'reset-training',
    'update:options',
    'save-data'
  ],
  setup(props, { emit }) {
    const toast = useToast();
    
    const updateOption = (key: keyof SWOTOptions, value: number) => {
      emit('update:options', { [key]: value });
    };

    const updateBooleanOption = (key: keyof SWOTOptions, value: boolean) => {
      emit('update:options', { [key]: value });
    };
    
    // Emit save event to parent component
    const emitSaveData = async () => {
      emit('save-data');
    };
    
    // Training control functions
    const afterBatchFn = async () => { await emitSaveData(); };
    const afterResetFn = async () => { await emitSaveData(); };
    const afterCancelPauseFn = async () => { await emitSaveData(); };
    const beforeStopFn = async () => { await emitSaveData(); };
    const afterStopFn = async () => { await emitSaveData(); };

    // Start the training process
    const startTraining = async () => {
      if (!props.trainer) { 
        emit('start-training');
        return;
      }
      toast.add({ severity: "info", summary: "开始训练", detail: "已经开始训练", life: 1000 });
      await props.trainer.start(afterBatchFn);
    };
    
    // Reset the training process
    const resetTraining = () => {
      if (!props.trainer) { 
        emit('reset-training');
        return;
      }
      props.trainer.reset(afterResetFn);
      toast.add({ severity: "info", summary: "重置训练", detail: "已经重置训练", life: 1000 });
    };
    
    // Continue training from paused state
    const continueTraining = async () => {
      if (!props.trainer) { 
        emit('continue-training');
        return;
      }
      toast.add({ severity: "info", summary: "继续训练", detail: "从暂停状态恢复训练", life: 1000 });
      await props.trainer.resume(afterBatchFn);
    };
    
    // Pause the training process
    const pauseTraining = () => {
      if (!props.trainer) { 
        emit('pause-training');
        return;
      }
      if (props.trainer.trainingState === TrainingState.RUNNING) {
        props.trainer.requestPause({before: beforeStopFn, after: afterStopFn});
        toast.add({ severity: "info", summary: "准备暂停", detail: "等待当前批次完成后暂停", life: 1000 });
      }
    };
    
    // Cancel a pause request
    const cancelPauseRequest = () => {
      if (!props.trainer) { 
        emit('cancel-pause');
        return;
      }
      if (props.trainer.trainingState === TrainingState.PREPARING_PAUSE) {
        props.trainer.cancelPauseRequest(afterCancelPauseFn);
        toast.add({ severity: "info", summary: "取消暂停", detail: "已取消暂停请求", life: 1000 });
      }
    };
    
    // Stop the training process
    const stopTraining = () => {
      if (!props.trainer) { 
        emit('stop-training');
        return;
      }
      props.trainer.requestAbort("用户手动停止训练", {before: beforeStopFn, after: afterStopFn});
      toast.add({ severity: "info", summary: "停止训练", detail: "正在停止训练...", life: 1000 });
    };

    function optionNumberInput(label: string, optionKey: keyof SWOTOptions, description?: (value: number) => string) {
      return vnd(NumberInputField, {
        label,
        modelValue: (props?.options?.[optionKey]??0) as number,
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
            JSON.stringify(_.omit(props.state, [
              "quStateDict",
              "quDataDict",
              "notebook",
              "notebookEditPlan",
            ]), null, 2),
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

      vnd("div", { class: "space-y-3" }, [
        // 显示当前训练状态
        vnd("div", { class: "flex items-center justify-between mb-2 p-2 rounded" }, [
          vnd("span", { class: "font-medium" }, "当前状态:"),
          vnd("span", { 
            class: [
              "px-2 py-1 rounded-lg text-white",
              ({
                "未知状态": "bg-gray-500",
                "未开始": "bg-gray-500",
                "训练中": "bg-green-500",
                "准备暂停": "bg-orange-500",
                "已暂停": "bg-yellow-500",
                "中止中": "bg-red-500",
                "已中止": "bg-gray-500",
                "结束中": "bg-gray-500",
                "已结束": "bg-gray-500",
              })?.[props.trainingStateText??""]??"bg-gray-500",
            ]
          }, props.trainingStateText)
        ]),

        // 控制按钮组
        ["未开始"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "primary",
          label: "开始", icon: "pi pi-play", class: "w-full",
          onClick: startTraining,
        }),
        
        ["训练中"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "warning",
          label: "暂停", icon: "pi pi-pause", class: "w-full",
          onClick: pauseTraining,
        }),
        
        // 新增的取消暂停按钮
        ["准备暂停"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "info",
          label: "取消暂停", icon: "pi pi-times", class: "w-full",
          onClick: cancelPauseRequest,
        }),
        
        ["已暂停", "已中止", "已结束"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "info",
          label: "继续", icon: "pi pi-play", class: "w-full",
          onClick: continueTraining,
        }),
        
        ["已暂停"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "danger",
          label: "停止", icon: "pi pi-stop", class: "w-full",
          onClick: stopTraining,
        }),
        
        ["未开始", "已暂停", "已中止", "已结束", "未知状态"].includes(props.trainingStateText) && vnd(ToolButton, { outlined: false, severity: "danger",
          label: "重置", icon: "pi pi-refresh", class: "w-full",
          onClick: resetTraining,
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
          optionNumberInput( "版本简单题阈值", "versionSimpleThreshold",
            value => `使用当前版本的笔记，某道题累计做了 ${value} 次且全都做对了，就会被判定为【版本简单题】，笔记更新前不再做这道题。`
          ),
          optionNumberInput( "总体简单题阈值", "totalSimpleThreshold",
            value => `在整个训练过程中，某道题累计做了 ${value} 次且全都做对了，就会被判定为【总体简单题】，训练过程中不再做这道题。`
          ),
          optionNumberInput( "版本困难题阈值", "versionSkipThreshold",
            value => `使用当前版本的笔记，某道题累计做错 ${value} 次，就会被判定为【版本难题】，笔记更新前不再做这道题。`
          ),
          optionNumberInput( "总体困难题阈值", "totalSkipThreshold",
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
          // 仅做题模式切换开关
          vnd("div", { class: "flex-auto mb-2 field-checkbox" }, [
            vnd("div", { class: "flex items-center gap-2" }, [
              vnd(Checkbox, {
                id: "practiceOnlyMode",
                modelValue: props?.options?.practiceOnlyMode ?? false,
                binary: true,
                'onUpdate:modelValue': (value: boolean) => updateBooleanOption('practiceOnlyMode', value)
              }),
              vnd("label", { class: "font-medium cursor-pointer", for: "practiceOnlyMode" }, "仅做题模式（不更新笔记）")
            ]),
            vnd("p", { class: "text-xs opacity-60 mt-1 ml-4" }, "开启后只进行题目练习，不会对错题进行分析和更新笔记，节省资源和时间。")
          ]),
          
          vnd(Divider),
          
          optionNumberInput( "并发数", "batchSize",
            value => `每次同时做 ${value} 道题。`
          ),
          optionNumberInput( "每题最做多少次", "maxVerifyCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但有可能模型反复尝试后仍然无法达成这个目标，因此我们设置一次训练中每道题最做 ${value} 遍，否则就跳过这道题。此设置与【题目标记阈值】是相互补充的关系，谁先达成就执行谁。`
          ),
          optionNumberInput( "训练过程最多循环多少次", "maxLoopCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但有可能模型反复修改笔记仍然无法达成这个目标，因此我们设置它最多把训练过程重复 ${value} 遍，避免无限循环。`
          ),
          optionNumberInput( "最大确证次数", "maxCertifyCount",
            value => `理想情况下，我们的训练目标是让模型能根据笔记把所有训练题都做对，但是只做对1次可能并不能让人放心，所以我们要进行"确证"，即每道题要做对 ${value} 次，才算是真的通过。`
          ),
        ])
      }),


    ]);
  }
});