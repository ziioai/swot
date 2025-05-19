
import { createI18n } from "vue-i18n";
import enMessages from './en'; // 假设 en.ts 也做了类似聚合
import zhMessages from './zh'; // 导入聚合后的中文翻译

export const i18n = createI18n({
  legacy: false,
  locale: "zh",
  fallbackLocale: "en",
  messages: {
    "en": enMessages,
    "zh": zhMessages,
  },
});

