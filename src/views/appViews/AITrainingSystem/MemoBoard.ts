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

[SpaCE2025](https://pku-space.github.io/SpaCE2025/)

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

`;



export default defineComponent({
  name: "MemoBoard",
  setup() {

    return () => {

      return vnd("div", {class: "stack-v"}, [
        vnd("p", { class: "" }, "小镇做题家 AI版"),
        vnd("div", { class: "markdown-body",
          innerHTML: renderMarkdown(备忘),
        }),

        vnd("div", {class: "stack-h"}, [
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

        vnd("div", {class: "stack-h"}, [
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