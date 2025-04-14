// uno.config.ts
import { defineConfig } from 'unocss'

// https://unocss.dev/presets/uno
// import presetUno from '@unocss/preset-uno'
// https://github.com/StatuAgency/unocss-preset-grid
// import { presetGrid } from 'unocss-preset-grid'
// https://unocss.dev/transformers/variant-group

import presetMini from '@unocss/preset-mini'
import presetWind4 from '@unocss/preset-wind4'

import transformerVariantGroup from '@unocss/transformer-variant-group'
// https://unocss.dev/transformers/directives
import transformerDirectives from '@unocss/transformer-directives'
// https://unocss.dev/transformers/compile-class
import transformerCompileClass from '@unocss/transformer-compile-class'

// 所有支持的颜色名称（根据项目实际使用的颜色调整）
const colors = [
  'primary',   // 自定义主色
  'black', 'white', 'transparent', // 基础色

  'red', // 基础色
  'orange', 'amber',
  'yellow', // 基础色
  'lime',
  'green', // 基础色
  'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', // 基础色
  'violet',
  'purple', // 基础色
  'fuchsia',
  'pink', // 基础色
  'rose',

  'slate',
  'gray', // 基础色
  'zinc', 'neutral', 'stone',

  // Tailwind 扩展色
]
const prefixes = ['bg', 'border', 'text', 'shadow', 'fill', 'stroke', 'ring', 'ring-offset'];
const weights = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const safelist = colors.flatMap(cc => {
  return prefixes.flatMap(prefix => {
    return weights.flatMap(weight => {
      return [
        `${prefix}-${cc}-${weight}`,
        `${prefix}-${cc}`,
        `dark:${prefix}-${cc}-${weight}`,
        `dark:${prefix}-${cc}`
      ];
    })
  })
});

export default defineConfig({
  // ...UnoCSS options
  presets: [
    presetMini({dark: {dark: ".my-app-dark"}}),
    presetWind4(),
    // presetUno({dark: {dark: "my-app-dark"}}),
    // presetGrid(),
  ],
  // https://unocss.dev/config/#safelist
  safelist: safelist,
  transformers: [
    transformerVariantGroup(),
    transformerDirectives(),
    transformerCompileClass(),
  ],
  rules: [
    [/^vh-(\d+)$/, ([, d]) => ({ height: `${d}vh` })],
    [/^vw-(\d+)$/, ([, d]) => ({ width: `${d}vw` })],

    [/^text-border-(.+)$/, ([, xx]) => ({ "text-shadow": `.75px .75px .1px ${xx}, -.75px -.75px .1px ${xx}, .75px -.75px .1px ${xx}, -.75px .75px .1px ${xx}` })],

    [/^m-var-(.+)$/, ([, xx]) => ({ margin: `var(--${xx})` })],
    [/^p-var-(.+)$/, ([, xx]) => ({ padding: `var(--${xx})` })],
    [/^color-var-(.+)$/, ([, xx]) => ({ color: `var(--${xx})` })],
    [/^bg-var-(.+)$/, ([, xx]) => ({ background: `var(--${xx})` })],
    [/^border-var-(.+)$/, ([, xx]) => ({ "border-color": `var(--${xx})` })],
    [/^flex-align-content-(.+)$/, ([, xx]) => ({ "align-content": xx.replace("&", " ") })],
    [/^justify-content-(.+)$/, ([, xx]) => ({ "justify-content": xx.replace("&", " ") })],
  ],
  shortcuts: [
    {
      'my-box-normal': 'm-2 p-2 gap-2 rounded border flex flex-col',
    },
    {
      // 'my-p-panel': 'p-panel p-card-body overflow-auto',
      'my-p-card': 'p-card p-card-body overflow-auto',
    },
    // [/^--p-(.+)$/, ([, xx]) => (`p-${xx}`)],  // for some primevue components
  ],
})
