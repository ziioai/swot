/* eslint-disable @typescript-eslint/no-explicit-any */

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

import Dexie, { Table } from 'dexie';
import markdownit from 'markdown-it';
import * as zipson from "zipson";
import _ from 'lodash';
import json5 from 'json5';
import { liveQuery } from "dexie";
import { useObservable } from "@vueuse/rxjs";

import {
  LLMClient,
  LLMRole,
  type SupplierDict,
  type LifeCycleFns,
  // type ChatResponseChunkProcessor,
  // type ChatResponseResultProcessor,
} from 'llm-utils';



// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export const md = markdownit({
  breaks: true,
  linkify: true,
});

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

const db_ = new Dexie('DBOfPureKnowDemo');
db_.version(1).stores({
  kvs: '++id, &key, value',
  functions: '++id, &name, config',
  records: '++id, supplier, function, input, output',
  chats: '++id, title',
  demoEntries: '++id, input',
});
interface Database {
  records: Table<{ [key: string]: any }, number>;
  kvs: Table<{ [key: string]: any }, number>;
  chats: Table<{ [key: string]: any }, number>;
  demoEntries: Table<{ [key: string]: any }, number>;
  functions: Table<{ [key: string]: any }, number>;
}
export const db = db_ as unknown as Database;

export const load = async (key: string) => {
  const value_ = (await db.kvs.get({key}))?.value;
  if (value_ == null) { return null; }
  return zipson.parse(value_);
}
export const save = async (key: string, value: any) => {
  const value_ = zipson.stringify(value);
  await db.kvs.put({id: key, key, value: value_});
};

export const saveDemoEntry = async (data: {input: string}) => {
  const result = await db.demoEntries.put(_.cloneDeep(data));
  return result;
};

export const saveRecord = async (data: Record<string, any>) => {
  const result = await db.records.put(_.cloneDeep(data));
  return result;
};

export const deleteDemoEntry = async (data: {id: any}) => {
  const result = await db.demoEntries.delete(data?.id);
  return result;
};

export const deleteRecord = async (data: {id: any}) => {
  const result = await db.records.delete(data?.id);
  return result;
};

export const getDBDemoEntries = async (offset: number = 0, limit: number = 10) => {
  const entries = await db.demoEntries.orderBy('id').offset(offset).limit(limit).toArray();
  return entries;
};

export const useDBDemoEntries = (offset: number = 0, limit: number = 10) => {
  const entries = liveQuery(() => db.demoEntries.orderBy('id').offset(offset).limit(limit).toArray());
  return ({ entries: useObservable(entries as any) });
};

export const sleep = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, ms);
  });
};

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export const 刷新模型列表 = async (supplier: SupplierDict, form: any) => {

  const apiKeyDict = form.apiKeyDict as Record<string, string>;
  const supplierModelsDict = form.supplierModelsDict as Record<string, any>;

  try {
    const Authorization = `Bearer ${apiKeyDict[supplier.name]}`;
    console.log({supplier, apiKeyDict, Authorization});
    let res;
    try {
      const response = await fetch(`${supplier.baseUrl}${supplier.modelsUrl}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      res = { data: await response.json() };
      console.log(res);
    } catch (err_1) {
      try {
        const response = await fetch(`${supplier.baseUrl}${supplier.modelsUrl}`, {
          headers: {
            Authorization: Authorization,
          },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        res = { data: await response.json() };
        console.log(res);
      } catch (err_2) {
        console.warn(err_1);
        console.warn(err_2);
      }
    }
    let models = res?.data?.data??[];
    console.log({models});
    if (!models?.length) {
      models = supplier?.models??[];
    }
    const newSupplierModelsDict = {...supplierModelsDict};
    newSupplierModelsDict[supplier.name] = models;
    // Object.assign(form, {supplierModelsDict: newSupplierModelsDict});
    form.supplierModelsDict = newSupplierModelsDict;
    save("supplierForm", form);
  } catch (error) {
    console.warn(error);
  }
};



// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export async function 一般处理函数模板<CR, TT>(
  demoData: any,
  supplierForm: any,
  系统提示词: string,
  制作输入的函数: (demoData: any)=>string,
  tempData: any={},
  otherLLMOptions: any=null,
  startFn?: any,
  chunkFn?: any,
  resultFn?: any,
  onAfterUpdate?: any,
) {
  const modelName = supplierForm?.selectedModelDict?.[supplierForm?.selectedSupplier?.name]?.name;
  const 系统提示词fix = !系统提示词?.trim?.()?.length ? "" : `${
    modelName=="free:QwQ-32B"?"这是一个简单任务，请不要过度思考，尽量直接输出答案。\n\n----------\n\n":""
  }${系统提示词}${
    modelName=="free:QwQ-32B"?"\n\n----------\n\n这是一个简单任务，请不要过度思考，尽量直接输出答案。":""
  }`;


  const lifeCycleFns: LifeCycleFns<CR, TT> = {
    chunkProcessor: async (result, delta) => {
      // console.log("delta", delta);
      await chunkFn?.(demoData, tempData, result, delta);
      return delta as CR;
    },
    resultProcessor: async (result) => {
      await resultFn?.(demoData, tempData, result);
      return result as any;
    },
    onAfterUpdate: async () => {
      await onAfterUpdate?.();
    },
  };

  await startFn?.(demoData, tempData);
  const llmOps = {
    baseURL: supplierForm?.selectedSupplier?.baseUrl,
    apiKey: supplierForm?.apiKeyDict[supplierForm?.selectedSupplier?.name],
    defaultModel: supplierForm?.selectedModelDict?.[supplierForm?.selectedSupplier?.name]?.name,
  };
  const llmClient = new LLMClient(llmOps);
  const initialResult = {} as CR;
  const generator = llmClient.chatWithLifeCycle(
    系统提示词fix,
    [{role: "user" as LLMRole.User, content: 制作输入的函数(demoData)}],

    initialResult,
    otherLLMOptions??{ max_tokens: 2000, temperature: 1, },
    lifeCycleFns,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _chunk of generator) {
    // console.log("_chunk", _chunk);
    // do nothing
  }
  // demoData.processing = false;
}

export const 默认初始化函数 = async (demoData: any) => {
  demoData.processing = true;
  demoData.thinkingSpans = [] as string[];
  demoData.outputSpans = [] as string[];
}

export function 普通输入函数(demoData: any) {
  const input = demoData.input;
  return input;
}

export const 一般初始化函数__旧版 = async (demoData: any, tempData: any) => {
  demoData.processing = true;
  demoData.thinking = "";
  demoData.output = "";
  tempData.thinkingSpans = [] as string[];
  tempData.outputSpans = [] as string[];
}

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export async function 进一步抽象的标准化处理函数<CR, TT>(
  系统提示词: string,
  制作输入的函数: (demoData: any)=>string,
  dataWrap: any,
  supplierForm: any,
  llmOptions?: any,
  onAfterUpdate?: any,
  resultFn: any = 一般结果处理函数,
) {
  const theTempData = {};
  const modelName = supplierForm?.selectedModelDict?.[supplierForm?.selectedSupplier?.name]?.name;
  await 一般处理函数模板<CR, TT>(
    dataWrap, supplierForm, 系统提示词, 制作输入的函数,
    theTempData,
    Object.assign({ max_tokens: modelName=="free:QwQ-32B"?8000:4000,
      // presence_penalty: 0.06,
      // temperature: 0.7,
      model: modelName,
      temperature: 1,
    }, llmOptions??{}),
    默认初始化函数,
    async (dataWrap: any, _tempData: any, _result: any, delta: any) => {
      // console.log("delta", delta);
      if (delta.reasoning_content) {
        dataWrap.thinkingSpans.push(delta.reasoning_content);
      }
      if (delta.content) {
        dataWrap.outputSpans.push(delta.content);
      }
    },
    resultFn,
    async () => {
      await onAfterUpdate?.();
      dataWrap.processing = false;
    },
  );
}

export async function 一般结果处理函数(dataWrap: any, _tempData: any, _result: any) {
  // console.log("delta", delta);
  const inp = (dataWrap.outputSpans.join(""));
  console.log(dataWrap.outputSpans);
  console.log(inp);
  const out = badJSONParser(inp);
  console.log(out);
  if (!_.isString(out)) {
    dataWrap.outputData = out;
  }
}

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //

export const badJSONParser = (jsonStr: string) => {
  const newStr = jsonStr.trim()
  .replace(/\<think\>[\s\S]*\<\/think\>/g, '').trim()
  .replace(/^```[^\n]*|```$/g, '').trim();
  try {
    return json5.parse(newStr);
  } catch (error1) {
    try {
      return json5.parse(newStr.slice(1));
    } catch (error2) {
      console.error({error1, error2});
      return newStr;
    }
  }
};

export const badJSONLinesParser = (jsonStr: string) => {
  const newStr = jsonStr.trim()
  .replace(/\<think\>[\s\S]*\<\/think\>/g, '').trim()
  .replace(/^```[^\n]*|```$/g, '').trim();
  const lines = newStr.split("\n").filter(it=>it.trim().length>0);
  try {
    return lines.map(str=>json5.parse(str));
  } catch (error1) {
    console.error({error1});
    return newStr;
  }
};

// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //



// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //
// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //
// ========== ========== ========== ========== ========== ========== ========== ========== ========== ========== //
