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
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: "MemoBoard",
  setup() {
    const { t } = useI18n();

    const getMemoContent = () => t('AITrainingSystem.MemoBoard.memoBoard.memoBoardContent');

    return () => {

      return vnd("div", {class: "stack-v"}, [
        // vnd("p", { class: "" }, "小镇做题家 AI版"),
        vnd("div", { class: "markdown-body",
          innerHTML: renderMarkdown(getMemoContent()),
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