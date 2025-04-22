// @unocss-include

// import _ from "lodash";

import {
  h as vnd, defineComponent, ref, watch,
  // onMounted, onUnmounted,
} from 'vue';

// import Panel from 'primevue/panel';
// import Fieldset from 'primevue/fieldset';
// import Button from 'primevue/button';

import Menubar from 'primevue/menubar';


import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
// import TabPanels from 'primevue/tabpanels';
// import TabPanel from 'primevue/tabpanel';

import { useDarkModeStore } from '@stores/darkMode';
import { useSystemSettingsStore } from '@stores/systemSettingsStore';
import { storeToRefs } from 'pinia';

// import { useToast } from 'primevue/usetoast';

import { RouterView } from 'vue-router';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useScrollCollapse } from '@hooks/useScrollCollapse';

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

const APP_NAME = "SWOT";
const GITHUB_DEV_URL = `https://github.com/ziioai/swot`;
const GITHUB_URL = `https://github.com/ziioai/swot`;
const ITEM_LIST = [
  { label: "配置", name: "app-config", icon: "pi pi-cog" },
  { label: "Train", name: "app-train", icon: "pi pi-book" },
  { label: "SS Demo", name: "app-ss", icon: "pi pi-book" },
  { label: "说明", name: "app-about", icon: "pi pi-book" },
  { label: "笔记", name: "app-notes", icon: "pi pi-clipboard" },
];

const menubarDevLinkItems = [
  { label: 'Reka', url: 'https://reka-ui.com/docs/components/editable', target: '_blank' },
  { label: 'shadcn/vue', url: 'https://shadcn-vue.com/docs/installation/manual.html', target: '_blank' },
  { label: 'Vite CN', url: 'https://cn.vite.dev/guide/', target: '_blank' },
  { label: 'Vite EN', url: 'https://vite.dev/guide/', target: '_blank' },
  { label: 'VitePress', url: 'https://vitepress.dev/zh/guide/getting-started', target: '_blank' },
  { label: 'Volta', url: 'https://docs.volta.sh/guide/', target: '_blank' },
  { label: 'tailwindcss', url: 'https://tailwindcss.com/docs/installation/using-vite', target: '_blank' },
  { label: 'Embla Carousel', url: 'https://www.embla-carousel.com/examples/predefined/', target: '_blank' },
  { label: 'Dexie', items: [
    { label: 'Dexie', url: 'https://dexie.org', target: '_blank' },
    { label: 'Design', url: 'https://dexie.org/docs/Tutorial/Design', target: '_blank' },
    { label: "Version.stores()", url: "https://dexie.org/docs/Version/Version.stores()", target: "_blank" },
    { label: 'IDB入门', url: 'https://juejin.cn/post/7025592963002531871', target: '_blank' },
    { label: "supported-operations", url: "https://github.com/dexie/Dexie.js#supported-operations", target: "_blank" },
    { label: "Tutorial/Vue", url: "https://dexie.org/docs/Tutorial/Vue", target: "_blank" },
    { label: "liveQuery()", url: "https://dexie.org/docs/liveQuery()", target: "_blank" },
    { label: "version()", url: "https://dexie.org/docs/Dexie/Dexie.version()", target: "_blank" },
  ]},
  { label: 'D3', items: [
    { label: 'd3-dispatch', url: 'https://d3js.org/d3-dispatch', target: '_blank' },
  ]},
  { label: 'vue-icons', url: 'https://vue-icons.kalimah-apps.com/getting-started.html', target: '_blank' },
  { label: 'Prime Icons', url: 'https://primevue.org/icons/', target: '_blank' },
  { label: 'UnoCSS', url: 'https://unocss.dev/interactive/', target: '_blank' },
  { label: 'Vue I18n', url: 'https://vue-i18n.intlify.dev/guide/advanced/composition.html', target: '_blank' },
  { label: 'VueUse', url: 'https://vueuse.org/', target: '_blank' },
  { label: 'Vue Router', url: 'https://router.vuejs.org/zh/guide/', target: '_blank' },
  { label: 'Pinia', url: 'https://pinia.vuejs.org/zh/core-concepts/', target: '_blank' },
  { label: 'Pinia Persisted', url: 'https://prazdevs.github.io/pinia-plugin-persistedstate/guide/config.html', target: '_blank' },
  { label: 'zipson', url: 'https://jgranstrom.github.io/zipson/', target: '_blank' },
  { label: 'vue render func', url: 'https://cn.vuejs.org/guide/extras/render-function.html', target: '_blank' },
  { label: 'vuejs.org', url: 'https://vuejs.org/', target: '_blank' },
  { label: 'vuejs.dev', url: 'https://vuejs.dev/', target: '_blank' },
  { label: 'Dexie.js', url: 'https://dexie.org/docs/Tutorial/Vue', target: '_blank' },
  { label: 'test', url: '#daf/ewf/2efw3?asd:df=w23?df' },
];

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //
// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //
// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

const AppView = defineComponent({
  name: "AppView",
  setup() {

    const { locale: i18nLocale } = useI18n({ useScope: 'global' });
    // console.log({i18nLocale: i18nLocale.value});

    const darkModeStore = useDarkModeStore();
    const { toggle: toggleDarkMode } = darkModeStore;
    const { isOn: isDarkModeOn } = storeToRefs(darkModeStore);

    const systemSettingsStore = useSystemSettingsStore();
    const { setLocale } = systemSettingsStore;
    const { availableLocales, locale } = storeToRefs(systemSettingsStore);

    const items = ref(ITEM_LIST);
    const currentLabelName = ref(items.value[0].label);

    // const toast = useToast();
    const router = useRouter();
    const route = useRoute();

    watch(()=>route.name, ()=>{
      // console.log({route, router});
      currentLabelName.value = `${String(route.name ?? "")}`;
    }, { immediate: true });


    const { isCollapsed: barCollapsed } = useScrollCollapse({
      threshold: 25,
      topOffset: 20,
      pixelsPerRem: 12, // Your code uses 12 pixels per rem
    });
    // const barCollapsed = ref(false);
    // const lastScrollY = ref(0);
    // const scrollThreshold = 50; // Minimum scroll amount before triggering hide/show

    // // Function to handle scroll events
    // const handleScroll = () => {
    //   const currentScrollY = window.scrollY;
    //   const scrollDifference = currentScrollY - lastScrollY.value;
      
    //   // If scrolled down more than threshold, collapse the bar
    //   if (scrollDifference > scrollThreshold) {
    //     barCollapsed.value = true;
    //     lastScrollY.value = currentScrollY;
    //   } 
    //   // If scrolled up more than threshold, expand the bar
    //   else if (scrollDifference < -scrollThreshold) {
    //     barCollapsed.value = false;
    //     lastScrollY.value = currentScrollY;
    //   }
      
    //   // If at the top of the page or within 20rem of the top, always show the bar
    //   const nearTopThreshold = 20 * 12; // Convert 20rem to pixels (assuming 1rem = 16px)
    //   if (currentScrollY === 0 || currentScrollY < nearTopThreshold) {
    //     barCollapsed.value = false;
    //   }
    // };

    // // Add scroll event listener on component mount
    // onMounted(() => {
    //   window.addEventListener('scroll', handleScroll, { passive: true });
    // });

    // // Clean up event listener on component unmount
    // onUnmounted(() => {
    //   window.removeEventListener('scroll', handleScroll);
    // });

    return ()=>{

      return vnd("div", { class: [
        "==bg-var-p-zinc-800 overflow-auto",
        "py-1rem",
        // "md:px-0.5rem md:py-0.75rem h-100dvh w-100dvw",
        // "w-100vw",
        // "stack-v",
        // "mx-auto",
      ] }, [

        vnd("div", {class: [
          barCollapsed.value ? "top--6rem" : "top-0", "left-0",
          "fixed z-100 w-100% min-h-2rem p-0.5rem",
          "bg-white dark:bg-zinc-900 bg-opacity-60",
          // "bg-transparent",
          // "backdrop-blur-sm backdrop-saturate-200 backdrop-sepia-100",
        ], style: {
          "-webkit-backdrop-filter": "blur(8px) saturate(200%)",
          "backdrop-filter": "blur(8px) saturate(200%)",
          "transition": "top 0.5s ease-in-out",
        }}, [
          vnd(Menubar, {
            // class: "my-6rem!",
            class: [
              "xl:max-w-1280px lg:max-w-1024px md:max-w-768px md:mx-auto w-100%",
              "border-none! bg-transparent!",
              // "bg-blue!",
              // "bg-white! dark:bg-black! bg-opacity-50!",
              // "backdrop-blur-md backdrop-saturate-150",
            ],
            breakpoint: "0px",
            model: [
  
              window?.location?.hostname != "localhost" ? null :
              { label: 'Dev Ref', icon: 'pi pi-external-link', items: menubarDevLinkItems},
  
              window?.location?.hostname != "localhost" ? null :
              { label: "Dev", icon: 'pi pi-github', url: GITHUB_DEV_URL, target: '_blank', },
              { label: "GitHub", icon: 'pi pi-github', url: GITHUB_URL, target: '_blank', },
              window?.location?.hostname != "localhost" ? null :
              { label: `${locale!.value} | ${i18nLocale!.value}`,
                icon: 'pi pi-language',
                items: availableLocales?.value?.map(it=>({
                  label: it, icon: 'pi pi-flag',
                  command: () => { setLocale(it, i18nLocale); },
                })),
              },
              { label: "theme",
                icon: `pi pi-${isDarkModeOn.value ? "moon" : "sun"}`,
                command: () => { toggleDarkMode(); },
              },
              // { label: "root", icon: 'pi pi-globe',
              //   command: () => { router.push({ name: "root" }); },
              // },
  
  
            ].filter(it=>it!=null),
            pt: {
              rootList: {
                class: "ml-auto!",
              },
            },
          }, {
            start: ()=>vnd("span", { class: "font-bold mx-0.5rem" }, APP_NAME),
          }),
        ]),



        vnd("div", { class: [
          "z-80",
          "my-5rem",
          "md:rounded-0.5rem md:border-2 xl:max-w-1280px lg:max-w-1024px md:max-w-768px md:mx-auto",
          "w-100% p-0.75rem bg-var-p-panel-background border-var-p-panel-border-color overflow-auto",
          "min-h-80vh",
          // "grow-1",
        ] }, [


          vnd("div", { class: [
            "==md:rounded-0.5rem ==md:border-2 xl:max-w-1280px lg:max-w-1024px md:max-w-768px md:mx-auto",
            "w-100% ==p-0.75rem bg-var-p-panel-background ==border-var-p-panel-border-color",
            // "grow-1 overflow-auto",
            "bg-transparent! [background:transparent]!",
          ], style: {
            "--p-panel-background": "transparent",
            "--p-tabs-tablist-background": "transparent",
          } }, [
            vnd(Tabs, {
              class: "bg-transparent!",
              value: currentLabelName.value,
              scrollable: true,
            }, {
              default:()=>vnd(TabList, {
                class: "bg-transparent!",
                pt: {
                  "tabList": { class: "bg-transparent! [background:transparent]!", },
                },
              }, {
                default:()=>items.value.map(item=>vnd(Tab, {
                  class: "bg-transparent!",
                  key: item.label,
                  value: item.name,
                  onClick: ()=>{
                    if (router.hasRoute(item?.name)) {
                      router.push({ name: item.name });
                    }
                    // item?.command?.();
                  },
                }, {
                  default: () => vnd("span", {
                    class: "inline-flex flex-row flex-items-center gap-2",
                  }, [
                    vnd("i", { class: item.icon }),
                    vnd("span", {}, item.label),
                  ]),
                })),
              }),
            }),
          ]),


          // vnd("div", {class: ["my-2rem"]}),

          vnd(RouterView),

          // vnd("div", {class: ["my-2rem"]}),



          // vnd("div", {class: ["my-4rem"]}),
        ]),



      ]);
    };
  }
})

export default AppView;
