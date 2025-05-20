// @unocss-include

import { h as vnd, defineComponent } from 'vue';
import ToolButton from '@components/shared/ToolButton';
import {
  播放叮咚声,
  播放咕嘟声,
  播放咔哒声,
  播放坠落声,
  播放报错声,
  播放哐当声,
  播放喇叭式胜利音效,
  播放随机曲谱,
  播放猫叫声,
  播放男人说话声,
  播放女人说话声,
  // 播放胜利音效,
  // 播放小星星,
  // 播放电子舞曲,
} from '@utils/soundEffects';
import renderMarkdown from '@utils/md';



const 备忘 = `
# SWOT (小镇做题家) - AI 训练系统

SWOT (意为“小镇做题家”) 是一个专注于自我提示训练 (Self-Prompt Training) 的 AI 训练系统。它提供了一个全面的平台，用户可以通过以下功能来训练和管理 AI 模型。

## 核心功能

*   **训练与答题:**
    *   用户可以加载题集，AI 会根据提供的笔记进行答题。
    *   系统会记录 AI 的答题情况，包括正确率、错误分析等。
    *   用户可以控制训练过程，例如启动、暂停训练，并调整训练参数。
*   **笔记管理:**
    *   **当前笔记:** 系统展示 AI 在解题过程中自主学习并记录的笔记。用户可以查看这些笔记，并观察 AI 如何根据解题结果和错误分析来迭代和优化其笔记。
    *   **笔记历史:** 系统会自动保存 AI 笔记的各个历史版本。用户可以方便地查看笔记的演变过程，并在需要时恢复到之前的版本。
    *   **笔记导入/导出:** 支持笔记数据的导入和导出。
*   **提示词配置:**
    *   用户可以编辑和管理用于训练过程中各个阶段的提示词模板，以优化 AI 的训练效果。
*   **题库配置:**
    *   用户可以管理用于训练或测试的题库数据，支持导入处理后的数据。
*   **模型接口配置:**
    *   管理 AI 模型的供应商、API 密钥和所选模型。
*   **对话记录:**
    *   保存与 AI 模型的历史对话记录，方便用户查看和分析之前的交互过程。
*   **存储管理:**
    *   查看和管理系统在本地存储的各种数据，包括训练器状态、问题集、提示词模板等。支持数据的导入和导出。
*   **调试工具:**
    *   提供一系列调试工具，方便开发者进行数据操作和状态检查。

## 设计理念

SWOT 系统旨在通过模拟“做题-学习-改进笔记-再做题”的循环，帮助 AI 模型提升其在特定知识领域的能力。用户提供题集，AI 在解题过程中自主记录和迭代笔记，通过这个学习循环，最终达到提升模型表现的目的。


## 训练流程逻辑

- O 是否达到最大循环次数
  - 达到：结束训练
  - 未达到：
    - 所有【未跳过、非简单、未达最大验证次数】是否为空集合
      - 是：结束训练
      - 否：继续执行核心流程
    - 核心流程 并行做所有【未跳过、非简单、未达最大验证次数】的题
      - 是否全都故障了
        - 是：被迫结束训练
        - 否：继续
      - 对于每道做对的题
        - 此题版本练习次数+=1
        - 此题总练习次数+=1
        - 此题版本正确次数+=1
        - 此题总正确次数+=1
        - 如果「此题版本练习次数=此题版本正确次数 >= 版本简单阈值」则标记为【版本简单题】
        - 如果「此题总练习次数=此题总正确次数 >= 总简单阈值」则标记为【总简单题】
      - 对于每道做错的题
        - 此题版本错误次数+=1
          - 如果达到版本难题阈值，则标记为【版本跳过题】
        - 此题总错误次数+=1
          - 如果达到总体难题阈值，则标记为【总体跳过题】
      - 是否全对
        - 全对：版本确证次数+=1
        - 非全对：不增加确证次数
      - 对于每道做错的题
        - 更新笔记
      - 总循环次数+=1
      - 返回 O 继续下一轮循环

参考： [SpaCE2025](https://pku-space.github.io/SpaCE2025/)
`;



export default defineComponent({
  name: "MemoBoard",
  setup() {

    return () => {

      return vnd("div", {class: "stack-v"}, [
        // vnd("p", { class: "" }, "小镇做题家 AI版"),
        vnd("div", { class: "markdown-body",
          innerHTML: renderMarkdown(备忘),
        }),

        vnd("div", {class: "stack-h hidden!"}, [
          vnd(ToolButton, { label: "播放叮咚声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放叮咚声, }),
          vnd(ToolButton, { label: "播放咕嘟声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咕嘟声, }),
          vnd(ToolButton, { label: "播放咔哒声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咔哒声, }),
          vnd(ToolButton, { label: "播放坠落声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放坠落声, }),
          vnd(ToolButton, { label: "播放报错声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放报错声, }),
          vnd(ToolButton, { label: "播放哐当声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放哐当声, }),
          vnd(ToolButton, { label: "播放猫叫声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放猫叫声, }),
          vnd(ToolButton, { label: "播放男人说话声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放男人说话声, }),
          vnd(ToolButton, { label: "播放女人说话声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放女人说话声, }),
        ]),

        vnd("div", {class: "stack-h hidden!"}, [
          vnd(ToolButton, { label: "播放喇叭式胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放喇叭式胜利音效, }),
          // vnd(ToolButton, { label: "播放胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放胜利音效, }),
          // vnd(ToolButton, { label: "播放小星星", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放小星星, }),
          // vnd(ToolButton, { label: "播放电子舞曲", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放电子舞曲, }),
          vnd(ToolButton, { label: "播放随机曲谱", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(16);}, }),
          vnd(ToolButton, { label: "播放随机曲谱64", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(64);}, }),
        ]),

      ]);

    };
  }
});