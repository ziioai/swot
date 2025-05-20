/* eslint-disable @typescript-eslint/no-explicit-any */
// @unocss-include

import _ from 'lodash';
// import clipboard from "clipboard";


import {
  h as vnd, defineComponent,
  // ref,
  reactive,
  computed,
  onMounted,
  // onUnmounted,
  // nextTick,
} from 'vue';

// import Card from 'primevue/card';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
// import Slider from 'primevue/slider';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
// import FloatLabel from 'primevue/floatlabel';
// import ToggleSwitch from 'primevue/toggleswitch';
// import Message from 'primevue/message';
// import Fieldset from 'primevue/fieldset';
import ToolButton from '@components/shared/ToolButton';
// import Bubble from "@components/chat/Bubble";

// import { useToast } from 'primevue/usetoast';
// import { useConfirm } from "primevue/useconfirm";

// import db_ from '@src/db';
// import { Table } from 'dexie';
// interface Database {
//   records: Table<{ [key: string]: any }, number>;
//   kvs: Table<{ [key: string]: any }, number>;
//   chats: Table<{ [key: string]: any }, number>;
// }
// const db = db_ as unknown as Database;

import {
  suppliers as suppliers_,
  type SupplierDict,
} from 'llm-utils';

export const freeSuanLiSupplier: SupplierDict = {
  name: "api.suanli.cn",
  desc: "免费算力",
  baseUrl: "https://api.suanli.cn/v1",
  docUrl: "https://qwq.aigpu.cn",
  defaultModel: "free:QwQ-32B",
  models: [
    { id: "free:QwQ-32B", },
  ],
  modelsUrl: "/models",
  chatUrl: "/chat/completions",
  type: "ChatSupplier",
};
const suppliers = _.cloneDeep(suppliers_);
suppliers.unshift(freeSuanLiSupplier);
// console.log(suppliers);
export const DEFAULT_MODEL = {label:"[[<DEFAULT>]]"};

import {
  save,
  load,
  // getIpAndCountryCode,
  刷新模型列表,
} from '@utils/functions';


/**
 * @file
 */



type ModelDict = {name?: string, label?: string, id?: string|number};





export const tableTextarea = (
  form: any,
  title: string,
  key: string,
  saveTo: string,
  placeholder: string=title,
  props?: any,
) => {
  return [
    vnd("div", { class: "opacity-80 fw-500" }, title),
    vnd(Textarea, { class: "w-full",
      placeholder: placeholder,
      ...props,
      modelValue: form?.[key],
      "onUpdate:modelValue": (value: string) => {
        form[key] = value;
        save(saveTo, form);
      },
    }),
  ];
};





const AppConfigView = defineComponent({
  setup() {

    // /** hooks **/ //

    // /** data **/ //
    // const appData = reactive({
    //   ipAndCountryCode: {} as {ip?: string, code?: string},
    // });

    // Base suppliers (read-only defaults)
    const baseSuppliers: SupplierDict[] = (() => {
      const s = _.cloneDeep(suppliers_); // suppliers_ from llm-utils
      s.unshift(freeSuanLiSupplier);
      return s;
    })();

    // Custom suppliers (reactive, loaded/saved)
    const customSuppliers = reactive<{ list: SupplierDict[] }>({ list: [] });

    // Combined list of suppliers for selection
    const allSuppliers = computed(() => {
      // Custom suppliers take precedence if names conflict
      return _.uniqBy([...customSuppliers.list, ...baseSuppliers], 'name');
    });

    const supplierForm = reactive({
      selectedSupplier: suppliers[0] as SupplierDict,
      apiKeyDict: {} as Record<string, string>,
      supplierModelsDict: {} as Record<string, ModelDict[]>,
      selectedModelDict: {} as Record<string, ModelDict>,
    });

    // Data for the new supplier form
    const newSupplierData = reactive<Omit<SupplierDict, 'models'> & { modelsString?: string }>({
      name: "",
      desc: "",
      baseUrl: "",
      docUrl: "",
      defaultModel: "",
      modelsString: '[{"id":"default-model-id"}]', // Example JSON string for models
      modelsUrl: "",
      chatUrl: "",
      type: "ChatSupplier",
    });
    const supplierTypes: Array<SupplierDict['type']> = ["ChatSupplier"]; // Add more types if needed

    // /** computed **/ //

    const selectedModel = computed(()=>{
      // Ensure supplierForm.selectedSupplier is valid before accessing its properties
      if (!supplierForm.selectedSupplier) {
        return { name: DEFAULT_MODEL.label }; // Or some other sensible default
      }
      const defaultModel = {name: supplierForm.selectedSupplier?.defaultModel};
      if (supplierForm.selectedModelDict[supplierForm.selectedSupplier?.name]?.name==DEFAULT_MODEL.label) {
        return defaultModel;
      }
      return supplierForm.selectedModelDict[supplierForm.selectedSupplier.name]??defaultModel;
    });
    // const selectedModelName = computed(()=>{ return selectedModel.value?.name??DEFAULT_MODEL.label; });
    const availableModels = computed(()=>{
      if (!supplierForm.selectedSupplier?.name) return [];
      return supplierForm.supplierModelsDict[supplierForm.selectedSupplier.name]??[];
    });
    const availableModelOptions = computed(()=>{
      return [
        {name: DEFAULT_MODEL.label},
        ...availableModels.value.map((model)=>({name: model?.label??model?.name??model?.id})),
      ];
    });


    // /** methods **/ //

    function parseModelsFromString(modelsStr: string | undefined): ModelDict[] {
      if (!modelsStr || modelsStr.trim() === "") return [];
      try {
        const parsed = JSON.parse(modelsStr);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => typeof m === 'object' && m !== null && (typeof m.id === 'string' || typeof m.id === 'number'));
        }
        alert("Invalid format for Models. Expected a JSON array of objects with an 'id' property.");
        return [];
      } catch (e) {
        console.error("Error parsing models string:", e);
        alert(`Error parsing Models JSON: ${(e as Error).message}`);
        return [];
      }
    }

    function addSupplier() {
      if (!newSupplierData.name || !newSupplierData.baseUrl || !newSupplierData.type) {
        alert("Supplier Name, Base URL, and Type are required.");
        return;
      }

      const models = parseModelsFromString(newSupplierData.modelsString);

      const supplierToAdd: SupplierDict = {
        name: newSupplierData.name!,
        desc: newSupplierData.desc || "",
        baseUrl: newSupplierData.baseUrl!,
        docUrl: newSupplierData.docUrl || "",
        defaultModel: newSupplierData.defaultModel || "",
        models: models.map(mo => ({ ...mo, id: String(mo.id) })),
        modelsUrl: newSupplierData.modelsUrl || "",
        chatUrl: newSupplierData.chatUrl || "",
        type: newSupplierData.type as SupplierDict['type'],
      };

      if (allSuppliers.value.some(s => s.name === supplierToAdd.name)) {
        alert(`Supplier with name "${supplierToAdd.name}" already exists.`);
        return;
      }

      customSuppliers.list.push(supplierToAdd);
      save("customSuppliersList", customSuppliers.list);

      // Clear form
      newSupplierData.name = "";
      newSupplierData.desc = "";
      newSupplierData.baseUrl = "";
      newSupplierData.docUrl = "";
      newSupplierData.defaultModel = "";
      newSupplierData.modelsString = '[{"id":"default-model-id"}]';
      newSupplierData.modelsUrl = "";
      newSupplierData.chatUrl = "";
      newSupplierData.type = "ChatSupplier";
      alert("自定义供应商已添加！");
    }

    // /** lifecycle **/ //
    // onMounted(async ()=>{
    //   // appData.ipAndCountryCode = await getIpAndCountryCode();

    //   const supplierForm_ = await load("supplierForm");
    //   if (supplierForm_!=null) { Object.assign(supplierForm, supplierForm_); }

    // });
    onMounted(async ()=>{
      // Load custom suppliers
      const loadedCustomSuppliers = await load("customSuppliersList");
      if (loadedCustomSuppliers && Array.isArray(loadedCustomSuppliers)) {
        customSuppliers.list = loadedCustomSuppliers;
      }
      // allSuppliers.value is now populated with base + custom suppliers

      // Load the supplierForm state (API keys, selected models, etc.)
      const loadedFormState = await load("supplierForm");
      if (loadedFormState) {
        if (loadedFormState.apiKeyDict) supplierForm.apiKeyDict = loadedFormState.apiKeyDict;
        if (loadedFormState.supplierModelsDict) supplierForm.supplierModelsDict = loadedFormState.supplierModelsDict;
        if (loadedFormState.selectedModelDict) supplierForm.selectedModelDict = loadedFormState.selectedModelDict;

        // Restore selectedSupplier by finding it in the current allSuppliers list
        if (loadedFormState.selectedSupplier?.name) {
          supplierForm.selectedSupplier = allSuppliers.value.find(
            s => s.name === loadedFormState.selectedSupplier.name
          )!;
        }
      }

      // If selectedSupplier is still not set (e.g., first run or saved one not found),
      // default to the first supplier in the allSuppliers list.
      if (!supplierForm.selectedSupplier && allSuppliers.value.length > 0) {
        supplierForm.selectedSupplier = allSuppliers.value[0];
      }
    });



    return ()=>{
      return [

        vnd(Panel, { header: "模型配置", toggleable: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "stack-v"}, [

            vnd(Select, {
              name: "supplier",
              options: allSuppliers.value, // Use combined list
              optionLabel: "name",
              placeholder: "选择供应商",
              fluid: true,
              modelValue: supplierForm.selectedSupplier,
              "onUpdate:modelValue": (value: SupplierDict) => {
                supplierForm.selectedSupplier = value;
                save("supplierForm", supplierForm);
              },
            }),

            vnd(InputText, {
              type: "password",
              name: "apiKey",
              placeholder: "API Key",
              fluid: true,
              // Ensure selectedSupplier is not undefined before accessing its name
              modelValue: supplierForm.selectedSupplier ? supplierForm.apiKeyDict[supplierForm.selectedSupplier.name] : "",
              "onUpdate:modelValue": (value: string) => {
                if (supplierForm.selectedSupplier) {
                  supplierForm.apiKeyDict[supplierForm.selectedSupplier.name] = value;
                  save("supplierForm", supplierForm);
                }
              },
            }),

            vnd("div", {class: "stack-h w-full"}, [
              vnd(Select, {
                name: "model",
                options: availableModelOptions.value,
                optionLabel: "name",
                placeholder: "选择模型",
                class: "grow-1",
                modelValue: selectedModel.value, // selectedModel computed handles undefined supplier
                "onUpdate:modelValue": (value: ModelDict) => {
                  if (supplierForm.selectedSupplier) {
                    supplierForm.selectedModelDict[supplierForm.selectedSupplier.name] = value;
                    save("supplierForm", supplierForm);
                  }
                },
              }),
              vnd(ToolButton, { icon: "pi pi-refresh", /* label: "刷新", */ tooltip:"刷新模型列表", command: ()=>{ // Changed pi-trash to pi-refresh
                if (supplierForm.selectedSupplier) {
                  刷新模型列表(supplierForm.selectedSupplier, supplierForm);
                } else {
                  alert("请先选择一个供应商。");
                }
              }}),
            ]),

            window?.location?.hostname != "localhost" ? null :
            vnd(ToolButton, { size: "small", icon: "pi pi-cog", label: "debug", command: ()=>{
              console.log({
                supplierForm,
                selectedModel: selectedModel.value,
                allSuppliers: allSuppliers.value,
                customSuppliers: customSuppliers.list,
              });
            }}),

          ]),
        }),


        // New Panel for Adding Custom Suppliers
        vnd(Panel, { header: "添加自定义供应商（目前仅支持OpenAI接口）", toggleable: true, collapsed: true, class: "my-1.5rem! col" }, {
          default: () => vnd("div", {class: "stack-v"}, [
            vnd(InputText, { fluid: true, placeholder: "名称 (必填)", modelValue: newSupplierData.name, "onUpdate:modelValue": (v: string) => newSupplierData.name = v }),
            vnd(InputText, { fluid: true, placeholder: "描述", modelValue: newSupplierData.desc, "onUpdate:modelValue": (v: string) => newSupplierData.desc = v }),
            vnd(InputText, { fluid: true, placeholder: "Base URL (必填, e.g., https://api.example.com/v1)", modelValue: newSupplierData.baseUrl, "onUpdate:modelValue": (v: string) => newSupplierData.baseUrl = v }),
            vnd(InputText, { fluid: true, placeholder: "文档 URL", modelValue: newSupplierData.docUrl, "onUpdate:modelValue": (v: string) => newSupplierData.docUrl = v }),
            vnd(InputText, { fluid: true, placeholder: "默认模型 ID", modelValue: newSupplierData.defaultModel, "onUpdate:modelValue": (v: string) => newSupplierData.defaultModel = v }),
            vnd("div", { class: "text-sm opacity-80 fw-500 mt-0.5rem" }, "模型列表 (JSON格式)"),
            vnd(Textarea, {
              class: "w-full font-mono text-sm", // Added styling for JSON
              placeholder: '[{"id":"model1-id", "name":"Model One (Optional)"}, {"id":"model2-id"}]',
              rows: 3,
              modelValue: newSupplierData.modelsString,
              "onUpdate:modelValue": (value: string) => newSupplierData.modelsString = value,
            }),
            vnd(InputText, { fluid: true, placeholder: "模型列表 API 路径 (e.g., /models)", modelValue: newSupplierData.modelsUrl, "onUpdate:modelValue": (v: string) => newSupplierData.modelsUrl = v }),
            vnd(InputText, { fluid: true, placeholder: "对话 API 路径 (e.g., /chat/completions)", modelValue: newSupplierData.chatUrl, "onUpdate:modelValue": (v: string) => newSupplierData.chatUrl = v }),
            vnd(Select, {
              class: "hidden!",
              options: supplierTypes,
              placeholder: "类型 (必填)",
              fluid: true,
              modelValue: newSupplierData.type,
              "onUpdate:modelValue": (v: SupplierDict['type']) => newSupplierData.type = v,
            }),
            vnd(ToolButton, { label: "添加供应商", icon: "pi pi-plus", class: "mt-0.5rem", command: addSupplier }),
          ])
        }),



      ];
    };
  }
})

export default AppConfigView;
