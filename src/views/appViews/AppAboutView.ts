// @unocss-include

// import _ from "lodash";

import markdownit from 'markdown-it';

import {
  h as vnd, defineComponent,
} from 'vue';
import Panel from 'primevue/panel';
// import { useToast } from 'primevue/usetoast';

const md = markdownit({
  breaks: true,
  linkify: true,
});

const readMeText = `
### SWOT
`;

const AppAboutView = defineComponent({
  name: "AppAboutView",
  setup() {

    // const toast = useToast();

    return ()=>{
      return vnd(Panel, {
        header: `说明`,
        class: "my-3",
      }, {
        default: () => [
          vnd("div", { class: [ "stack-v" ] }, [

            vnd("div", { class: "markdown-body",
              innerHTML: md.render(readMeText.trim()),
            }), 

          ]),
        ]
      });
    };
  }
})

export default AppAboutView;
