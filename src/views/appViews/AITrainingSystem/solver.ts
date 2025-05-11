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

export const promptVersion = "相对认真（v1.7.3）";

export const 笔记介绍 = `
你的笔记以 JSON 格式记录和呈现，遵循名为 \`QTBook\` 的接口定义：
\`\`\`TypeScript
interface QTBook { entries: QTEntry[]; }
interface QTEntry {
  name: string;
  // 题型名称，记录你对这个题型的命名。

  desc: string;
  // 题型描述，记录你对这个题型的描述。包括答题目标、答案的格式等。

  clue: string;
  // 题型识别线索，记录你将如何把一道题目识别为这个题型，也包括如何排除其他题型。
  // 注意不要仅考虑题面表述，还要考虑实际做题步骤和关注点的差异。

  steps: string[];
  // 解题步骤，记录你解题的步骤，越靠前的越优先处理；这是笔记中最关键的部分；
  // 这些步骤是js函数形式的伪代码，并且你可以假设环境中具有一些你需要的工具函数（tool functions），它们被记录在tools字段中；
  // 这些步骤本身应该具有通用性，而不应该仅适用于非常特例化的情形。
  // 特例化的信息可以通过查询知识库（KDB）的方式来实现，你应该假设以往的知识库查询结果会被记录在笔记的datums字段中；
  // 更具体来说：
  // - steps应该用**js箭头函数**形式的**伪代码**来写，以便理清其中的逻辑关系。
  //   - 这些步骤函数之间通过一个名为\`vars\`的字典对象传递数据，
  //     每个函数都应该是对\`vars\`字典对象的一个操作，函数的输入和输出都是\`vars\`字典对象。
  //   - 对于判断、取值、查询、验证等类型的步骤，你应该假设自己能够查询到一个知识库（KDB），并且能够从中获取到你需要的信息。
  //     但这些信息应该放在\`datums\`中，而不是放在\`steps\`中。
  // - 如果你在答题时使用了\`KDB\`，那么你应该在\`datums\`中以json对象的形式记录下你所查询的内容（query），以及你从中获取到的信息。
  // 对于非常特例化的情形，可以通过datums来记录，而不是通过steps来记录。

  tools: ToolFunc[];
  // 工具函数，记录你在解题时所用到的工具函数，这些函数应该具有通用性，而不应该仅适用于非常特例化的情形。

  datums: KDBDatum[];
  // 数据记录，记录你在查询知识库时所查找到的具体数据，这些数据应该满足：
  // ①与具体题目无关，
  // ②足够具体，能够帮助你在解题时进行推理，
  // ③可以被复用到其他题目中。

  tips: string[];
  // 重要提示，记录你认为在解这类题时尤为需要注意的事项，越靠前的越重要。
  // tips应该用**自然语言**来写，以便让人更容易理解，并且应该具有泛化性。
  // 注意：tips应该相对普适和通用，而特例化的内容应该以datums的形式记录。
  // tips的数量最多不应该超过10条。如果你觉得10条都不够用，那么你应该考虑将当前题型拆分成多个更加细分的题型。

}
interface ToolFunc {
  idx: number;  // 数据的索引，唯一标识
  name: string;  // 工具函数的名称
  desc: string;  // 工具函数的描述
  args: ToolFuncArg[];  // 工具函数的参数列表
}
interface ToolFuncArg {
  name: string;  // 工具函数参数的名称
  desc: string;  // 工具函数参数的描述
}
interface KDBDatum {
  idx: number;  // 数据的索引，唯一标识
  query: string;  // 查询的内容
  input: {[key: string]: any;};  // 查询的输入
  output: {[key: string]: any;};  // 查询的输出
  [key: string]: any;  // 其他任何与查询有关的信息
}
\`\`\`

`.trim();

export const 笔记操作介绍 = `
你可以对笔记进行以下操作：
- \`CREATE_QT(qt:QTEntry)\`：
  - 新增一种题型，并记录name, desc, clue, steps, datums和tips等信息。
- \`MODIFY_QT(name:string, newQt:QTEntry)\`：
  - 将名为name的题型整个重写，修改为新的name, desc, clue, steps和tips等信息。
- \`MODIFY_QT_KV(name:string, key:(keyof QTEntry), value:any)\`：
  - 将名为name的题型的某个字段修改为指定的值，尤其适用于修改 name, desc, clue 等简单字段。
  - 如果需要对steps和tips进行大幅度的修改，比如重新排序，也可以用这种方式直接整个重写，但通常你应该用下面的专用操作来处理steps和tips。

- \`APPEND_STEP(name:string, step:string)\`：在名为name的题型的steps最后追加一个新的步骤。
- \`REMOVE_STEP(name:string, step:string)\`：在名为name的题型的steps中删除一个步骤。
- \`MODIFY_STEP(name:string, oldStep:string, newStep:string)\`：在名为name的题型的steps中，将oldStep修改为newStep。

- \`APPEND_TIP(name:string, tip:string)\`：在名为name的题型的tips最后追加一条新的提示信息。
- \`REMOVE_TIP(name:string, tip:string)\`：在名为name的题型的tips中删除一条提示信息。
- \`MODIFY_TIP(name:string, oldTip:string, newTip:string)\`：在名为name的题型的tips中，将oldTip修改为newTip。

- \`INSERT_STEP_AFTER(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之后插入一个新的步骤newStep。
- \`INSERT_STEP_BEFORE(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之前插入一个新的步骤newStep。

- \`APPEND_TOOL(name:string, tool:ToolFunc)\`：在名为name的题型的tools最后追加一个tool。
- \`MODIFY_TOOL(name:string, idx:number, newTool:ToolFunc)\`：名为name的题型的tools中，将索引为idx的tool修改为新的tool。
- \`DELETE_TOOL(name:string, idx:number)\`：名为name的题型的tools中，删除索引为idx的tool。

- \`APPEND_DATUM(name:string, datum:KDBDatum)\`：在名为name的题型的datums最后追加一个datum。
- \`MODIFY_DATUM(name:string, idx:number, newDatum:KDBDatum)\`：名为name的题型的datums中，将索引为idx的datum修改为新的datum。
- \`DELETE_DATUM(name:string, idx:number)\`：名为name的题型的datums中，删除索引为idx的datum。

- \`DELETE_QT(name:string)\`：删除名为name的题型。
  - 通常只有当你需要大幅度修改某个题型，或者希望对某些题型做拆分或合并的时候才会使用。
  - 这是非常危险的操作，请谨慎考虑。

【特别提醒】
如果你发觉现有的解题步骤和提示与当前题目有较大出入，希望做很多修改，
那么你应该考虑创建一种新的题型，而不是对原有题型的笔记做大幅度修改。
**因为很多题型看似相似，实际上却有很大不同。**
在你意识到这种情况时，你还应该修改原本题型的名称、描述和线索等信息，以便更好地反映出它们之间的差异。
`.trim();




export function 笔记操作函数(dataWrap: any) {
  const ops:any[] = dataWrap.operations??[];
  if (dataWrap.qtBook.entries == null) {
    dataWrap.qtBook.entries = [];
  }
  const book = dataWrap.qtBook;

  const reIndexDatums = (that: {datums?: null|(any[])})=>{
    if (that.datums==null) { that.datums = []; }
    that.datums.forEach((it: any) => {
      it.idx = undefined;
    });
    that.datums = _.uniqBy(that.datums, (it: any) => JSON.stringify(it));
    that.datums.forEach((it: any, idx: number) => {
      it.idx = idx;
    });
  };
  const reIndexTools = (that: {tools?: null|(any[])})=>{
    if (that.tools==null) { that.tools = []; }
    that.tools.forEach((it: any) => {
      it.idx = undefined;
    });
    that.tools = _.uniqBy(that.tools, (it: any) => JSON.stringify(it));
    that.tools.forEach((it: any, idx: number) => {
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
        // draft.entries = (draft?.entries??[]).filter((it: any) => it.name !== op.args.name);
        const idx = (draft?.entries??[]).findIndex((it: any) => it.name === op.args.name);
        if (idx) {
          draft.entries[idx].deleted = true;
        }
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

      else if (op.method === "APPEND_TOOL") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tools==null) { that.tools = []; }
          that.tools.push(op.args.tool);
          reIndexTools(that);
        }
      }
      else if (op.method === "MODIFY_TOOL") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tools==null) { that.tools = []; }
          const idx = that.tools.findIndex((it: any) => it.idx === op.args.idx);
          if (idx >= 0) {
            that.tools[idx] = op.args.newTool;
            that.tools[idx].idx = op.args.idx;
          }
          reIndexTools(that);
        }
      }
      else if (op.method === "DELETE_TOOL") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.tools==null) { that.tools = []; }
          that.tools = that.tools.filter((it: any) => it.idx !== op.args.idx);
          reIndexTools(that);
        }
      }

      else if (op.method === "APPEND_DATUM") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.datums==null) { that.datums = []; }
          that.datums.push(op.args.datum);
          reIndexDatums(that);
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
          reIndexDatums(that);
        }
      }
      else if (op.method === "DELETE_DATUM") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          if (that.datums==null) { that.datums = []; }
          that.datums = that.datums.filter((it: any) => it.idx !== op.args.idx);
          reIndexDatums(that);
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
判断当前题目是否属于现有题型中的某个题型（但不用做题）。

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

  const entries = _.clone((dataWrap?.qtBook?.entries??[]).filter((it: any)=>!it.deleted)) as any[];
  const descs = entries.filter((it)=>!it.deleted).map((entry) => _.pick(entry, ["name", "desc", "clue"]));

  lines.push(JSON.stringify(descs));

  lines.push("====[题目]====");
  if (dataWrap?.question==null) {lines.push("无内容");} else {
    lines.push(JSON.stringify(dataWrap.question?.content??"无内容"));
  }
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
};

export async function stage0_判断题型_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any, customPrompt?: string) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    customPrompt || stage0_判断题型_prompt, stage0_判断题型_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
};



// stage1 根据笔记做题

export const stage1_根据笔记做题_prompt = `
### 任务描述
你需要结合现有的笔记，完成题目，并按要求回复。
- 你应该遵循笔记中的步骤描述（steps）来完成题目，这些步骤是伪代码，而你可以选择使用自然语言、结合题目内容来阐述这些步骤。
- 你可以假定存在笔记中定义的工具函数（tools），通过扮演和模拟来使用它们。
- 你需要检查笔记中的数据记录（datums），看看是否用得上。
- 你要注意笔记中提到的提示（tips），并在答题时遵循它们。
- 笔记不一定完全可靠，你需要灵活变通。
- 如果没有匹配的题型，或者笔记不够清晰，则需要自己思考，建立答题思路。

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供现有的笔记和要完成的题目。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  plan: string;  // 你的初步计划，描述你打算如何完成这个题目。简要描述即可。
  usefulDatums?: string[]; // 如果笔记中有某些datum对完成这个题目有帮助，你可以在这里用自然语言描述。
  analyzes: string[];  // 详细的解题过程，应该遵循笔记中的步骤，需要结合题目具体内容详细具体地阐述。
  answer: string;  // 你的最终答案，通常是一个字符串。
  didFollow: boolean;  // 是否遵循了笔记的思路。
  reflection?: string;  // 【非必要】你对这个题目的反思，描述你在完成这个题目时的思考过程和收获。
  noteAdvice?: string;  // 【非必要】你对笔记的建议，描述你认为笔记中哪些地方需要改进。
}
\`\`\`
`.trim();

export function stage1_根据笔记做题_InputGenerator(dataWrap: any) {

  const note = _.clone(dataWrap?.note??{}) as any;

  if (note?.steps?.length) { note.stepsNum = note.steps.length; }
  if (note?.tools?.length) { note.toolsNum = note.tools.length; }
  if (note?.datums?.length) { note.datumsNum = note.datums.length; }
  if (note?.tips?.length) { note.tipsNum = note.tips.length; }

  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify(note));
  lines.push("====[题目]====");
  if (dataWrap?.question==null) {lines.push("无内容");} else {
    lines.push(JSON.stringify(dataWrap.question?.content??"无内容"));
  }
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}

export async function stage1_根据笔记做题_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any, customPrompt?: string) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    customPrompt || stage1_根据笔记做题_prompt, stage1_根据笔记做题_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}



// stage2 根据错题修改笔记

export const stage2_根据错题修改笔记_prompt = `
### 任务描述
总任务：根据错题和正确答案，作充分的分析，并规划笔记的修改方案。按要求回复。
如果要修改笔记，你需要使用特定的笔记操作算子（见下文）来完成修改，并以JSON对象的形式嵌入在你的回应中。
笔记修改的重点应该是对题型的区分，以及围绕解题步骤的完善。

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
  format_analyze: string;  // 检查正确答案和错误答案，评估是否仅是由于格式问题导致的错误。如果存在这种错误，则应该完善题型的name、desc或clue（判别依据）。
  analyze0: string;  // 详细讨论为什么现有的笔记不足以解决这个题目。针对steps, tools, datums和tips逐个进行分析。
  analyze1: string;  // 你认为目前笔记的总体思路是否出现重大偏颇，导致需要大幅度修改。
  analyze2: string;  // 仔细分析对于当前题目，是不是创建一个新的题型来处理会更加合适。尤其要注意如果题目的情形只属于笔记中的一种非常细分的情形，则建议创建一个新的题型。
  analyze3: string;  // 你是否发觉到目前的笔记中有某些内容是错误的，或者是需要修改的。

  analyze4: string;  // 你是否觉得出题人的思维方式比较古怪，甚至有无可能是出题人搞错了。
  analyze5: string;  // 你觉得题目的表述是否不够清楚或存在歧义，导致引人误解（有的话需要制定对策）。
  analyze6: string;  // 你觉得各题型的steps对于解决该类题型的问题是否具有通用性。
  analyze7: string;  // 你觉得目前的tools配置是否合理和充分。
  analyze8: string;  // 你觉得目前的datums中是否存在不够清晰、过于武断或存在错误等情形。
  analyze9: string;  // 你觉得目前的tips中是否存在过于特例化或武断的内容（特例内容应放到datums中）。

  analyze10: string;  // 目前笔记是否存在 stepsNum>10||toolsNum>10||datumsNum>10||tipsNum>10 的情况（若存在，则需要考虑拆分成多个题型）。
  analyze11: string;  // 你觉得不同题型之间是否具有足够的差异性，它们的name、desc或clue（判别依据）是否足够清楚。

  analyze12: string;  // 你认为目前的笔记是否能帮助答题者举一反三。
  analyze13: string;  // 你认为目前的笔记是否存在重复和冗余的内容。
  analyze14: string;  // 你对目前笔记（包括steps、tools、datums、tips）的其他可改进之处（包括增补、除冗、除错等）的概要分析。

  analyze_final: string;  // 你的总结。
  operations?: {
    method: string;  // 如 "CREATE_QT" 等，是你计划对笔记执行的操作。
    args: {[key: string]: any};  // 你计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];  // 你计划对笔记执行的若干操作。如果你认为没必要修改，则可以不返回这个字段。
}
\`\`\`
`.trim();
export function stage2_根据错题修改笔记_InputGenerator(dataWrap: any) {

  const entries = _.clone((dataWrap?.qtBook?.entries??[]).filter((it: any)=>!it.deleted)) as any[];
  entries.forEach((it) => {
    if (it?.steps?.length) { it.stepsNum = it.steps.length; }
    if (it?.tools?.length) { it.toolsNum = it.tools.length; }
    if (it?.datums?.length) { it.datumsNum = it.datums.length; }
    if (it?.tips?.length) { it.tipsNum = it.tips.length; }
  });

  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify({entries:entries}));
  lines.push("====[题目、正误答案、解析]====");
  lines.push(dataWrap?.errorCase==null?"（无内容）":JSON.stringify(dataWrap?.errorCase??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}

export async function stage2_根据错题修改笔记_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any, customPrompt?: string) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    customPrompt || stage2_根据错题修改笔记_prompt, stage2_根据错题修改笔记_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}



// stage4 合并对笔记的修改

export const stage4_合并对笔记的修改_prompt = `
### 任务描述
总任务：结合原始笔记，把不同的笔记修改计划合并且完善成单独一份笔记修改计划。
0、你将看到若干名做题专家对于一份答题笔记的修改计划。专家们的工作是并行的，所以可能存在重复。
1、你要评估来自不同专家的笔记修改计划之间的共性和差异。
2、尤其注意如果有专家要创建新的题型，要看看其他专家是否也想创建类似的题型，但使用了不同的题型名称。
3、你需要把所有专家的修改计划合并成一份新的笔记修改计划，覆盖他们所提到的所有修改，但去除了实际含义有重复的部分。
4、你还要考虑原始笔记的情况，以及不同修改方案和原始笔记之间的叙述风格。
5、如果笔记的格式或风格混乱或不一致，你需要自己额外制定修改计划进行整理。

### 关于笔记
${笔记介绍}

### 笔记操作
${笔记操作介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供现有的笔记和专家们的修改计划（并行）。

### 完善笔记所应考虑的方面
- 目前笔记的总体思路是否出现重大偏颇，导致需要大幅度修改。
- 目前的笔记中是否有某些内容是错误的，或者是需要修改的。
- 各题型的steps对于解决该类题型的问题是否具有通用性。
- 目前的tools配置是否合理和充分。
- 目前的datums中是否存在不够清晰、过于武断或存在错误等情形。
- 目前的tips中是否存在过于特例化或武断的内容（特例内容应放到datums中）。
- 目前笔记中的tips是否超过10条（若超过，则需要考虑拆分成多个题型）。
- 目前笔记中的steps是否超过10个步骤（若超过，则需要考虑拆分成多个题型）。
- 不同题型之间是否具有足够的差异性，它们的name、desc或clue（判别依据）是否足够清楚。
- 目前的笔记是否能帮助答题者举一反三。
- 目前的笔记是否存在重复和冗余的内容。
- 目前的各个题型的笔记内部风格和格式是否一致。
- 你对目前笔记（包括steps、tools、datums、tips）的其他可改进之处（包括增补、除冗、除错等）的概要分析。

### 你的回应
你应该回复一个标注的JSON对象（不带其他任何内容），符合以下接口定义：
\`\`\`TypeScript
interface YourResponse {
  /** 你对不同专家修改计划的分析和大致的合并思路。 */
  analyze1: string;
  /** 你根据原有笔记内容及风格所做的额外分析及进一步完善的思路 */
  analyze2: string;
  /** 经过你合并和完善之后的修改计划。 */
  operations?: {
    method: string;  // 如 "CREATE_QT" 等，是计划对笔记执行的操作。
    args: {[key: string]: any};  // 计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];
}
\`\`\`



`.trim();
export function stage4_合并对笔记的修改_InputGenerator(dataWrap: any) {

  const entries = _.clone((dataWrap?.qtBook?.entries??[]).filter((it: any)=>!it.deleted)) as any[];
  entries.forEach((it) => {
    if (it?.steps?.length) { it.stepsNum = it.steps.length; }
    if (it?.tools?.length) { it.toolsNum = it.tools.length; }
    if (it?.datums?.length) { it.datumsNum = it.datums.length; }
    if (it?.tips?.length) { it.tipsNum = it.tips.length; }
  });

  const lines = [];
  lines.push("====[笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries: entries}));
  lines.push("====[并行修改计划]====");
  lines.push(dataWrap?.opPlans==null?"（无内容）":JSON.stringify(dataWrap?.opPlans??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}
export async function stage4_合并对笔记的修改_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any, customPrompt?: string) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    customPrompt || stage4_合并对笔记的修改_prompt, stage4_合并对笔记的修改_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
};














// stage3 根据例题修改笔记

export const stage3_根据例题修改笔记_prompt = `
`.trim();








