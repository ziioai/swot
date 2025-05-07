// @unocss-include

import _ from 'lodash';
import { h as vnd, defineComponent, PropType, computed } from 'vue';
import { SWOTState } from '../types';
import Panel from 'primevue/panel';
import Divider from 'primevue/divider';

export default defineComponent({
  name: "AccuracyPanel",
  props: {
    state: {
      type: Object as PropType<SWOTState | undefined>,
      required: false
    },
  },
  setup(props) {
    // 计算总体做题数据（最新结果）
    const totalStats = computed(() => {
      if (!props.state?.quStateDict) return { total: 0, correct: 0, incorrect: 0, rate: 0 };
      
      const states = Object.values(props.state.quStateDict);
      
      // 题目总数（即不同的题目数量）
      const total = states.length;
      
      // 根据最后一次答题结果计算正确和错误的题目数
      const correct = states.filter(state => {
        // 如果题目至少做过一次，且正确次数比错误次数多，视为最后一次做对了
        return (state.trainedCountT || 0) > 0 && 
               (state.correctCountT || 0) > (state.trainedCountT || 0) - (state.correctCountT || 0);
      }).length;
      
      // 错误题目数
      const incorrect = total - correct;
      
      // 正确率
      const rate = total > 0 ? (correct / total * 100) : 0;
      
      return { total, correct, incorrect, rate };
    });

    // 计算当前版本做题数据（最新结果）
    const versionStats = computed(() => {
      if (!props.state?.quStateDict) return { total: 0, correct: 0, incorrect: 0, rate: 0 };
      
      const states = Object.values(props.state.quStateDict);
      
      // 在当前版本中做过的题目数
      const trainedQuestions = states.filter(state => (state.trainedCountV || 0) > 0);
      const total = trainedQuestions.length;
      
      // 根据最后一次答题结果计算正确和错误的题目数
      const correct = states.filter(state => {
        // 如果题目在当前版本至少做过一次，且正确次数比错误次数多，视为最后一次做对了
        return (state.trainedCountV || 0) > 0 && 
               (state.correctCountV || 0) > (state.trainedCountV || 0) - (state.correctCountV || 0);
      }).length;
      
      // 错误题目数
      const incorrect = total - correct;
      
      // 正确率
      const rate = total > 0 ? (correct / total * 100) : 0;
      
      return { total, correct, incorrect, rate };
    });

    // 计算题目状态统计
    const questionStatusStats = computed(() => {
      if (!props.state?.quStateDict) return { 
        total: 0,
        simpleV: 0, simpleT: 0,
        skipV: 0, skipT: 0,
        active: 0
      };
      
      const states = Object.values(props.state.quStateDict);
      const total = states.length;
      
      // 版本简单题数量
      const simpleV = states.filter(state => state.isSimpleV).length;
      
      // 总体简单题数量
      const simpleT = states.filter(state => state.isSimpleT).length;
      
      // 版本跳过题数量
      const skipV = states.filter(state => state.isSkipV).length;
      
      // 总体跳过题数量
      const skipT = states.filter(state => state.isSkipT).length;
      
      // 活跃题目数量（未跳过、非简单题）
      const active = states.filter(state => 
        !state.isSimpleV && !state.isSimpleT && !state.isSkipV && !state.isSkipT
      ).length;
      
      return { total, simpleV, simpleT, skipV, skipT, active };
    });

    // 渲染统计数据项
    const renderStatItem = (label: string, value: number | string, unit: string = '', tooltip: string = '') => {
      return vnd("div", { 
        class: "flex-1 mb-2 text-center p-2 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-lg",
        title: tooltip
      }, [
        vnd("div", { class: "text-xs text-gray-500 dark:text-gray-400" }, label),
        vnd("div", { class: "text-xl font-bold" }, `${value}${unit}`),
      ]);
    };

    return () => vnd(Panel, {
      header: "做题统计数据",
      toggleable: true,
      class: ["bg-zinc-100/75!", "dark:bg-zinc-800/75!"],
    }, {
      default: () => vnd("div", { class: "space-y-4" }, [
        // 总体数据
        vnd("div", { class: "mb-2" }, [
          vnd("h3", { class: "text-md font-medium mb-2" }, "总体统计"),
          vnd("div", { class: "flex gap-2" }, [
            renderStatItem("题目总数", totalStats.value.total, "题", "题库中的题目总数"),
            renderStatItem("最新正确", totalStats.value.correct, "题", "按最新答题结果计算的正确题目数"),
            renderStatItem("正确率", totalStats.value.rate.toFixed(1), "%", "按最新答题结果计算的正确率")
          ])
        ]),
        
        vnd(Divider),
        
        // 当前版本数据
        vnd("div", { class: "mb-2" }, [
          vnd("h3", { class: "text-md font-medium mb-2" }, "当前版本统计"),
          vnd("div", { class: "flex gap-2" }, [
            renderStatItem("做过题目", versionStats.value.total, "题", "当前笔记版本下做过的题目数"),
            renderStatItem("最新正确", versionStats.value.correct, "题", "按最新答题结果计算的版本正确题目数"),
            renderStatItem("版本正确率", versionStats.value.rate.toFixed(1), "%", "按最新答题结果计算的版本正确率")
          ])
        ]),
        
        vnd(Divider),
        
        // 题目状态统计
        vnd("div", { class: "mb-2" }, [
          vnd("h3", { class: "text-md font-medium mb-2" }, "题目状态"),
          vnd("div", { class: "flex flex-wrap gap-2" }, [
            renderStatItem("总题数", questionStatusStats.value.total, "题", "题库中的总题目数量"),
            renderStatItem("活跃题", questionStatusStats.value.active, "题", "未被标记为简单或跳过的活跃题目数量"),
            renderStatItem("版本简单题", questionStatusStats.value.simpleV, "题", "当前版本中被标记为简单的题目数量"),
            renderStatItem("总体简单题", questionStatusStats.value.simpleT, "题", "整个训练过程中被标记为简单的题目数量"),
            renderStatItem("版本跳过题", questionStatusStats.value.skipV, "题", "当前版本中被标记为跳过的题目数量"),
            renderStatItem("总体跳过题", questionStatusStats.value.skipT, "题", "整个训练过程中被标记为跳过的题目数量"),
          ])
        ])
      ])
    });
  }
});
