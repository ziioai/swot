// stage0 判断题型
// stage1 根据笔记做题
// stage2 根据错题修改笔记
// stage0plus 先学习一些例题

import _ from 'lodash';
import { 进一步抽象的标准化处理函数 } from '@utils/functions';
// import {produce} from 'immer';
const produce = (data: any, fn: any) => {
  fn?.(data);
  return data;
};

export const 笔记介绍 = `
你的笔记以 JSON 格式记录和呈现，遵循名为 \`QTBook\` 的接口定义：
\`\`\`TypeScript
interface QTBook { entries: QTEntry[]; }
interface QTEntry {
  name: string;  // 题型名称，记录你对这个题型的命名。
  desc: string;  // 题型描述，记录你对这个题型的描述。
  clue: string;  // 题型识别线索，记录你将如何把一道题目识别为这个题型，也包括如何排除其他题型。
  steps: string[];  // 解题步骤，记录你解题的步骤，越靠前的越优先处理；这些步骤是js函数形式的伪代码，并且经常以查询知识库（KDB）的方式来实现，以往的知识库查询结果会被记录在datums字段中；这些步骤应该具有通用性，而不应该仅适用于极为特定的情形。
  datums: KDBDatum[];  // 数据记录，记录你在查询知识库时所查找到的具体数据，这些数据应该满足：①与具体题目无关，②足够具体，能够帮助你在解题时进行推理，③可以被复用到其他题目中。对于极为特定的情形，可以通过datums来记录，而不是通过steps来记录。
  tips: string[];  // 重要提示，记录你认为在解这类题时尤为需要注意的事项，越靠前的越重要。
}
interface KDBDatum {
  idx: number;  // 数据的索引，唯一标识
  query: string;  // 查询的内容
  [key: string]: any;  // 其他任何与查询有关的信息
}
\`\`\`
其中：
- steps应该用**js函数**形式的**伪代码**（可以假设环境中具有一些你需要的前置功能）来写，以便理清其中的逻辑关系。这些步骤函数之间通过一个名为\`vars\`的字典对象传递数据，每个函数都应该是对\`vars\`字典对象的一个操作，函数的输入和输出都是\`vars\`字典对象。
  - 这些步骤应该具有通用性，而不应该仅适用于极为特定的情形。
  - 对于判断、取值、查询、验证等类型的步骤，你应该假设自己能够查询到一个知识库（KDB），并且能够从中获取到你需要的信息。（但这些信息应该放在\`datums\`中，而不是放在\`steps\`中）。
  - 提示：vars 中已经预置了题干中的全部信息。
- 如果你在steps中使用了\`KDB\`，那么你应该在\`datums\`中以json对象的形式记录下你所查询的内容（query），以及你从中获取到的信息。
- tips应该用**自然语言**来写，以便让人更容易理解，并且应该具有泛化性。
  - 对于特例化的情形，你应该考虑使用 datums 而不是 tips 来记录。
`.trim();

export const 笔记操作介绍 = `
你可以对笔记进行以下操作：
- \`CREATE_QT(qt:QTEntry)\`：新增一种题型，并记录name, desc, clue, steps, datums和tips等信息。
- \`APPEND_DATUM(name:string, datum:KDBDatum)\`：在名为name的题型的datums最后追加一个datum。
- \`MODIFY_DATUM(name:string, idx:number, newDatum:KDBDatum)\`：名为name的题型的datums中，将索引为idx的datum修改为新的datum。
- \`DELETE_DATUM(name:string, idx:number)\`：名为name的题型的datums中，删除索引为idx的datum。
- \`APPEND_STEP(name:string, step:string)\`：在名为name的题型的steps最后追加一个新的步骤。
- \`REMOVE_STEP(name:string, step:string)\`：在名为name的题型的steps中删除一个步骤。
- \`MODIFY_STEP(name:string, oldStep:string, newStep:string)\`：在名为name的题型的steps中，将oldStep修改为newStep。
- \`APPEND_TIP(name:string, tip:string)\`：在名为name的题型的tips最后追加一条新的提示信息。
- \`REMOVE_TIP(name:string, tip:string)\`：在名为name的题型的tips中删除一条提示信息。
- \`MODIFY_TIP(name:string, oldTip:string newTip:string)\`：在名为name的题型的tips中，将oldTip修改为newTip。
- \`INSERT_STEP_AFTER(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之后插入一个新的步骤newStep。
- \`INSERT_STEP_BEFORE(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之前插入一个新的步骤newStep。
- \`MODIFY_QT(name:string, newQt:QTEntry)\`：将名为name的题型整个重写，修改为新的name, desc, clue, steps和tips等信息。
- \`MODIFY_QT_KV(name:string, key:(keyof QTEntry), value:any)\`：将名为name的题型的某个字段修改为指定的值（包括name字段本身）。（可以通过此方式对steps和tips进行重新排序）

【特别提醒】如果你发觉现有的解题步骤和提示与当前题目有较大出入，希望做很多修改，那么你应该考虑创建一种新的题型，而不是对原有题型的笔记做大幅度修改。**因为很多题型看似相似，实际上却有很大不同。**在你意识到这种情况时，你还应该修改原本题型的名称、描述和线索等信息，以便更好地反映出它们之间的差异。
`.trim();

// - \`DELETE_QT(name:string)\`：删除名为name的题型。



export function 笔记操作函数(dataWrap: any) {
  const ops:any[] = dataWrap.operations??[];
  if (dataWrap.qtBook.entries == null) {
    dataWrap.qtBook.entries = [];
  }
  const book = dataWrap.qtBook;

  const reIndex = (that: {datums?: null|(any[])})=>{
    if (that.datums==null) { that.datums = []; }
    that.datums.forEach((it: any) => {
      it.idx = undefined;
    });
    that.datums = _.uniqBy(that.datums, (it: any) => JSON.stringify(it));
    that.datums.forEach((it: any, idx: number) => {
      it.idx = idx;
    });
  };

  dataWrap.qtBook = produce(book, (draft: (typeof book)) => {
    for (const op of ops) {
      console.log(op.method);

      if (op.method === "PASS") {
        //
      }

      else if (op.method === "DELETE_QT") {
        draft.entries = (draft?.entries??[]).filter((it: any) => it.name !== op.args.name);
      }
      else if (op.method === "CREATE_QT") {
        draft.entries.push(op.args?.qt??op.args);
        // 通过 json stringify 来去重
        draft.entries = _.uniqBy(draft.entries, (it: any) => JSON.stringify(it));
      }
      else if (op.method === "MODIFY_QT") {
        const idx = (draft?.entries??[]).findIndex((it: any) => it.name === op.args.name);
        if (idx) {
          draft.entries[idx] = op.args.newQt;
        }
      }
      else if (op.method === "MODIFY_QT_KV") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that[op.args.key] = op.args.value;
          if (_.isArray(that[op.args.key])) {
            that[op.args.key] = _.uniq(that[op.args.key]);
          }
        }
      }

      else if (op.method === "APPEND_DATUM") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.datums==null) { that.datums = []; }
          that.datums.push(op.args.datum);
          reIndex(that);
        }
      }
      else if (op.method === "MODIFY_DATUM") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.datums==null) { that.datums = []; }
          const idx = that.datums.findIndex((it: any) => it.idx === op.args.idx);
          if (idx >= 0) {
            that.datums[idx] = op.args.newDatum;
            that.datums[idx].idx = op.args.idx;
          }
          reIndex(that);
        }
      }
      else if (op.method === "DELETE_DATUM") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.datums==null) { that.datums = []; }
          that.datums = that.datums.filter((it: any) => it.idx !== op.args.idx);
          reIndex(that);
        }
      }

      else if (op.method === "APPEND_TIP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tips==null) { that.tips = []; }
          that.tips.push(op.args.tip);
          that.tips = _.uniq(that.tips);
        }
      }
      else if (op.method === "MODIFY_TIP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tips==null) { that.tips = []; }
          const idx = that.tips.findIndex((it: any) => it === op.args.oldTip);
          if (idx >= 0) {
            that.tips[idx] = op.args.newTip;
          }
        }
      }
      else if (op.method === "REMOVE_TIP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tips==null) { that.tips = []; }
          that.tips = that.tips.filter((it: any) => it !== op.args.tip);
        }
      }

      else if (op.method === "APPEND_STEP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.steps==null) { that.steps = []; }
          that.steps.push(op.args.step);
          that.steps = _.uniq(that.steps);
        }
      }
      else if (op.method === "MODIFY_STEP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.steps==null) { that.steps = []; }
          const idx = that.steps.findIndex((it: any) => it === op.args.oldStep);
          if (idx >= 0) {
            that.steps[idx] = op.args.newStep;
          }
        }
      }
      else if (op.method === "REMOVE_STEP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.steps==null) { that.steps = []; }
          that.steps = that.steps.filter((it: any) => it !== op.args.step);
        }
      }

      else if (op.method === "INSERT_STEP_AFTER") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.steps==null) { that.steps = []; }
          const idx = that.steps.findIndex((it: any) => it === op.args.refStep);
          if (idx >= 0) {
            that.steps.splice(idx + 1, 0, op.args.newStep);
            that.steps = _.uniq(that.steps);
          }
        }
      }
      else if (op.method === "INSERT_STEP_BEFORE") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.steps==null) { that.steps = []; }
          const idx = that.steps.findIndex((it: any) => it === op.args.refStep);
          if (idx >= 0) {
            that.steps.splice(idx, 0, op.args.newStep);
            that.steps = _.uniq(that.steps);
          }
        }
      }

    }
  });


}















// stage0 判断题型

export const stage0_判断题型_prompt = `
### 任务描述
判断当前题目是否属于现有题型中的某个题型，按要求回复。

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供现有的题型体系和要判断的题目数据。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  analyze: string;  // 你的初步分析。
  matched: boolean;  // 是否找到匹配的题型
  name?: string|null|undefined;  // 匹配的题型名称
}
\`\`\`
`.trim();

export function stage0_判断题型_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[题型体系]====");

  const entries = (dataWrap?.qtBook??{entries:[]}).entries;
  const descs = entries.map((entry: any) => _.pick(entry, ["name", "desc", "clue"]));

  lines.push(JSON.stringify(descs));

  lines.push("====[题目]====");
  if (dataWrap?.question==null) {lines.push("无内容");} else {
    lines.push(JSON.stringify(dataWrap.question?.content??"无内容"));
  }
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
};

export async function stage0_判断题型_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    stage0_判断题型_prompt, stage0_判断题型_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
};



// stage1 根据笔记做题

export const stage1_根据笔记做题_prompt = `
### 任务描述
总任务：根据题目要求，完成题目，按要求回复。
1、浏览题目和笔记，评估题目是否符合笔记描述的题型，并初步建立答题思路。
2、笔记不一定完全可靠，你需要灵活变通。
3、如果没有匹配的题型，或者笔记不够清晰，则需要自己思考，建立答题思路。

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供现有的笔记和要完成的题目。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  plan: string;  // 你的初步计划，描述你打算如何完成这个题目。简要描述即可。
  analyzes: string[];  // 你对题目的详细分析过程，分为多个步骤，每个步骤是一个字符串，构成一个字符串数组。需要结合题目具体内容详细具体地阐述。
  answer: string;  // 你的最终答案，通常是一个字符串。
  didFollow: boolean;  // 是否遵循了笔记的思路。
  reflection?: string;  // 【非必要】你对这个题目的反思，描述你在完成这个题目时的思考过程和收获。
  noteAdvice?: string;  // 【非必要】你对笔记的建议，描述你认为笔记中哪些地方需要改进。
}
\`\`\`
`.trim();

export function stage1_根据笔记做题_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify(dataWrap?.note));
  lines.push("====[题目]====");
  if (dataWrap?.question==null) {lines.push("无内容");} else {
    lines.push(JSON.stringify(dataWrap.question?.content??"无内容"));
  }
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}

export async function stage1_根据笔记做题_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    stage1_根据笔记做题_prompt, stage1_根据笔记做题_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}



// stage2 根据错题修改笔记

export const stage2_根据错题修改笔记_prompt = `
### 任务描述
总任务：根据错题和正确答案，修改笔记，按要求回复。
1、评估现有题型与当前题目是否足够匹配。
2、如果匹配，则修改现有题型的笔记，使其能够帮助解答当前题目；如果不够匹配，则创建一种新的题型并做笔记。
注意：笔记应该具有通用性和一般性，不应该过于针对化，容易导致“过拟合”。
3、如果要修改笔记，你需要使用特定的笔记操作算子（见下文）来完成修改，并以JSON对象的形式嵌入在你的回应中。

### 关于笔记
${笔记介绍}

### 笔记操作
${笔记操作介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供题目、正确答案（可能带有解释说明）、错误答案和现有的笔记。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  glance: string;  // 简要描述你对错误情况的第一印象。
  typeMatched: boolean;  // 现有题型描述与当前题目是否足够匹配
  errorAnalyze: string;  // 你对错误答案的分析，描述你认为错误的原因和改进方向。
  noteAnalyze: string;  // 你对目前笔记可改进之处的分析，包括增补、除冗、除错等。
  unclearQuestion: boolean;  // 是不是因为题目的表述不够清楚导致的错误（需要通过完善笔记来提示后人）
  ambiguousQuestion: boolean;  // 是不是因为题目的表述存在歧义导致的错误（需要通过完善笔记来提示后人）
  dogmaticNote: boolean;  // 笔记的描述是否过于死板，导致无法灵活应对题目变化（需要做相应的修改）
  weirdExplain: boolean;  // 题目正确答案的解释是否令你不解
  newTypeNeeded: boolean;  // 是否需要创建新的题型
  operations?: {
    method: string;  // 如 "CREATE_QT" 等，是你计划对笔记执行的操作。
    args: {[key: string]: any};  // 你计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];  // 你计划对笔记执行的若干操作。如果你认为没必要修改，则可以不返回这个字段。
}
\`\`\`
`.trim();
export function stage2_根据错题修改笔记_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries:[]}));
  lines.push("====[题目、正误答案、解析]====");
  lines.push(dataWrap?.errorCase==null?"（无内容）":JSON.stringify(dataWrap?.errorCase??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}

export async function stage2_根据错题修改笔记_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    stage2_根据错题修改笔记_prompt, stage2_根据错题修改笔记_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}



// stage4 合并对笔记的修改

export const stage4_合并对笔记的修改_prompt = `
### 任务描述
总任务：把不同的笔记修改计划合并成单独一份笔记修改计划。
0、你将看到若干名做题专家对于一份答题笔记的修改计划。专家们的工作是并行的，所以可能存在重复。
1、你要评估来自不同专家的笔记修改计划之间的共性和差异。
2、尤其注意如果有专家要创建新的题型，要看看其他专家是否也想创建类似的题型，但使用了不同的题型名称。
3、你需要把所有专家的修改计划合并成一份新的笔记修改计划，覆盖他们所提到的所有修改，但去除了实际含义有重复的部分。

### 关于笔记
${笔记介绍}

### 笔记操作
${笔记操作介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供现有的笔记和专家们的修改计划（并行）。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  /** 你的分析和大致的合并思路。 */
  analyze: string;
  /** 经过你合并之后的修改计划。 */
  operations?: {
    method: string;  // 如 "CREATE_QT" 等，是计划对笔记执行的操作。
    args: {[key: string]: any};  // 计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];
}
\`\`\`



`.trim();
export function stage4_合并对笔记的修改_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries:[]}));
  lines.push("====[并行修改计划]====");
  lines.push(dataWrap?.opPlans==null?"（无内容）":JSON.stringify(dataWrap?.opPlans??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}
export async function stage4_合并对笔记的修改_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    stage4_合并对笔记的修改_prompt, stage4_合并对笔记的修改_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
};














// stage3 根据例题修改笔记

export const stage3_根据例题修改笔记_prompt = `
`.trim();








