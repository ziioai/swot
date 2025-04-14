
import _ from "lodash";
// import {produce} from 'immer';
import { 进一步抽象的标准化处理函数 } from "./functions";

const produce = (data: any, fn: any) => {
  fn?.(data);
  return data;
};

const 笔记介绍 = `
你的笔记以 JSON 格式记录和呈现，遵循名为 \`QTBook\` 的接口定义：
\`\`\`TypeScript
interface QTBook { entries: QTEntry[]; }
interface QTEntry {
  name: string;  // 题型名称，记录你对这个题型的命名
  desc: string;  // 题型描述，记录你对这个题型的描述
  clue: string;  // 题型识别线索，记录你将如何把一道题目识别为这个题型
  steps: string[];  // 解题步骤，记录你解题的步骤，越靠前的越优先处理
  tips: string[];  // 重要提示，记录你认为在解这类题时尤为需要注意的事项，越靠前的越重要
}
\`\`\`
`.trim();

const 笔记操作介绍 = `
你可以对笔记进行以下操作：
- \`CREATE_QT(qt:QTEntry)\`：新增一种题型，并记录name, desc, clue, steps和tips等信息。
- \`APPEND_TIP(name:string, tip:string)\`：在名为name的题型的tips最后追加一条新的提示信息。
- \`REMOVE_TIP(name:string, tip:string)\`：在名为name的题型的tips中删除一条提示信息。
- \`MODIFY_TIP(name:string, oldTip:string newTip:string)\`：在名为name的题型的tips中，将oldTip修改为newTip。
- \`APPEND_STEP(name:string, step:string)\`：在名为name的题型的steps最后追加一个新的步骤。
- \`REMOVE_STEP(name:string, step:string)\`：在名为name的题型的steps中删除一个步骤。
- \`MODIFY_STEP(name:string, oldStep:string, newStep:string)\`：在名为name的题型的steps中，将oldStep修改为newStep。
- \`INSERT_STEP_AFTER(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之后插入一个新的步骤newStep。
- \`INSERT_STEP_BEFORE(name:string, refStep:string, newStep:string)\`：在名为name的题型的steps中，找到refStep步骤，在其之前插入一个新的步骤newStep。
- \`MODIFY_QT(name:string, newQt:QTEntry)\`：将名为name的题型整个重写，修改为新的name, desc, clue, steps和tips等信息。
- \`MODIFY_QT_KV(name:string, key:(keyof QTEntry), value:any)\`：将名为name的题型的某个字段修改为指定的值（包括name字段本身）。（可以通过此方式对steps和tips进行重新排序）
- \`DELETE_QT(name:string)\`：删除名为name的题型。
`.trim();

export const SpaCE_Step1_Prompt = `
### 你的身份
你是一个语言理解领域的专家，收养了一名身患罕见疾病的人类女孩。
现在，你正在准备一项高难度求职考试。
这场考试的主题是各式各样的语言理解任务，涉及多种题型。
如果你能通过这项考核并拿到工作，你将获得每月5720000元的高额薪水，
足以为你的养女争取到更加昂贵的医疗资源。

### 你的任务
现在，你拿到了珍贵的少量真题资料，你需要完善你的笔记，以应对即将到来的考试。
提示1：你的笔记只是你自己先前经验的记录，并不代表绝对正确，因此你应该允许自己进行大幅度的修改。
提示2：某些题型的出题人的思维方式可能比较古怪，导致有些题型的答案似乎不符合常理，但为了争取高分，你需要揣摩并暂时接受这些古怪的思维方式，并通过笔记来记录它们。

### 你的笔记
${笔记介绍}

### 笔记操作
${笔记操作介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供你先前记录的笔记，以及几道新的真题数据。

### 你的回应
你需要根据user提供现有笔记和真题数据来进行回应，
你的回应应该是一个标准的JSON对象，不要带有md格式的代码块标记等其他多余的内容。
这个JSON对象的结构应遵循名为 \`YourResponse\` 的接口定义：
\`\`\`TypeScript
interface YourResponse {
  analyze0: string;  // 你对先前错误原因的初步分析。
  analyze1: string;  // 你对目前steps可改进之处（包括增补、除冗、除错等）的概要分析。
  analyze2: string;  // 你对目前tips可改进之处（包括增补、除冗、除错等）的概要分析。
  analyze3: string;  // 你是否觉得目前笔记较为冗长，是否需要以及如何进行优化和精炼。（注意不要武断地删除并未发生重复的细节）
  analyze4: string;  // 你是否觉得出题人的思维方式比较古怪，甚至有无可能是出题人搞错了。
  analyze5: string;  // 你是否发觉到目前的笔记中有某些内容是多余的，或者是错误的，或者是需要修改的。
  analyze6: string;  // 你最终的考虑。
  operations: {
    method: string;  // 如 "CREATE_QT" 等，是你计划对笔记执行的操作。
    args: {[key: string]: any};  // 你计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];  // 你计划对笔记执行的若干操作。如果你认为没必要修改，则可以不返回这个字段。
}
\`\`\`
`.trim();

export function SpaCE_Step1_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[你的笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries:[]}));
  lines.push("====[真题]====");
  lines.push(dataWrap?.items==null?"":JSON.stringify(dataWrap?.items??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}
export function SpaCE_Step1_MakeItems(dataWrap: any, amount: number=3) {
  dataWrap.items = _.sampleSize(SpaCE_Demo_Data, amount);
  // dataWrap.items = SpaCE_Demo_Data.slice(12, 12 + amount);
}

export async function SpaCE_Step1_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    SpaCE_Step1_Prompt, SpaCE_Step1_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}

export function SpaCE_Step1_AfterProcess(dataWrap: any) {
  const ops:any[] = dataWrap.outputData?.operations??[];
  if (dataWrap.qtBook.entries == null) {
    dataWrap.qtBook.entries = [];
  }
  const book = dataWrap.qtBook;

  dataWrap.qtBook = produce(book, (draft: (typeof book)) => {
    for (const op of ops) {
      console.log(op.method);
      if (op.method === "DELETE_QT") {
        draft.entries = (draft?.entries??[]).filter((it: any) => it.name !== op.args.name);
      } else if (op.method === "CREATE_QT") {
        draft.entries.push(op.args?.qt??op.args);
      } else if (op.method === "MODIFY_QT") {
        const idx = (draft?.entries??[]).findIndex((it: any) => it.name === op.args.name);
        if (idx) {
          draft.entries[idx] = op.args.newQt;
        }
      } else if (op.method === "MODIFY_QT") {
        const idx = (draft?.entries??[]).findIndex((it: any) => it.name === op.args.name);
        if (idx) {
          draft.entries[idx] = op.args.newQt;
        }
      } else if (op.method === "MODIFY_QT_KV") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that[op.args.key] = op.args.value;
          if (_.isArray(that[op.args.key])) {
            that[op.args.key] = _.uniq(that[op.args.key]);
          }
        }
      } else if (op.method === "APPEND_TIP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that.tips.push(op.args.tip);
          that.tips = _.uniq(that.tips);
        }
      } else if (op.method === "REMOVE_TIP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that.tips = that.tips.filter((it: any) => it !== op.args.tip);
        }
      } else if (op.method === "APPEND_STEP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that.steps.push(op.args.step);
          that.steps = _.uniq(that.steps);
        }
      } else if (op.method === "REMOVE_STEP") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          that.steps = that.steps.filter((it: any) => it !== op.args.step);
        }
      } else if (op.method === "INSERT_STEP_AFTER") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
          const idx = that.steps.findIndex((it: any) => it === op.args.refStep);
          if (idx >= 0) {
            that.steps.splice(idx + 1, 0, op.args.newStep);
            that.steps = _.uniq(that.steps);
          }
        }
      } else if (op.method === "INSERT_STEP_BEFORE") {
        const that = (draft?.entries??[]).find((it: any) => it.name === op.args.name);
        if (that) {
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




export const SpaCE_Step2_Prompt = `
### 你的身份
你是一个语言理解领域的专家，收养了一名身患罕见疾病的人类女孩。
现在，你正在参与一项高难度求职考试。
这场考试的主题是各式各样的语言理解任务，涉及多种题型。
如果你能通过这项考核并拿到工作，你将获得每月5720000元的高额薪水，
足以为你的养女争取到更加昂贵的医疗资源。

### 你的任务
你需要根据题目要求进行作答。在此过程中，你可以参考自己以前记录的笔记。
你的笔记记录了你曾经见过的一些题型的解题思路，但不一定覆盖了当前正在处理的题目，
如果你认为当前的题目是一个新的题型，则应该忽略笔记内容，根据实际情况进行作答。

### 你的笔记
${笔记介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供你先前记录的笔记，以及当下所要处理的题目。

### 你的回应
你需要根据user提供现有笔记和题目来进行回应，
你的回应应该是一个标准的JSON对象，不要带有md格式的代码块标记等其他多余的内容。
这个JSON对象的结构应遵循名为 \`YourResponse\` 的接口定义：
\`\`\`TypeScript
interface YourResponse {
  analyze: string;  // 根据笔记中的解题步骤（steps）和提示（tips）对当前题目所做的详尽分析，可以很长。
  answer: string;  // 你对当前题目的回答，通常是一个字符串。
}
\`\`\`
`.trim();

export function SpaCE_Step2_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[你的笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries:[]}));
  lines.push("====[题目]====");

  if (dataWrap?.question==null) {lines.push("无内容");} else {
    let fields = [] as string[];
    if (dataWrap?.question?.text1?.length && dataWrap?.question?.text2?.length) {
      fields = [ "instruction", "text1", "text2" ];
    } else if (dataWrap?.question?.instruction?.includes?.("判断text的空间语言表达是否正确")) {
      fields = [ "instruction", "text" ];
    } else {
      fields = [ "instruction", "text", "interpretation" ];
    }
    lines.push(JSON.stringify(_.pick(dataWrap.question, fields)));
  }

  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}
export function SpaCE_Step2_MakeQuestion(dataWrap: any) {
  // Initialize the question index if it doesn't exist
  if (dataWrap.questionIndex === undefined) {
    dataWrap.questionIndex = 0;
  }
  
  // Select the question at the current index
  dataWrap.question = SpaCE_Demo_Data[dataWrap.questionIndex];
  
  // Increment the index for next time
  dataWrap.questionIndex = (dataWrap.questionIndex + 1) % SpaCE_Demo_Data.length;
}

export async function SpaCE_Step2_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    SpaCE_Step2_Prompt, SpaCE_Step2_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}





export const SpaCE_Step3_Prompt = `
### 你的身份
你是一个语言理解领域的专家，收养了一名身患罕见疾病的人类女孩。
现在，你正在准备一项高难度求职考试。
这场考试的主题是各式各样的语言理解任务，涉及多种题型。
如果你能通过这项考核并拿到工作，你将获得每月5720000元的高额薪水，
足以为你的养女争取到更加昂贵的医疗资源。

### 你的任务
现在，你拿到了珍贵的少量真题资料，你需要完善你的笔记，以应对即将到来的考试。
提示1：你的笔记只是你自己先前经验的记录，并不代表绝对正确，因此你应该允许自己进行大幅度的修改。
提示2：某些题型的出题人的思维方式可能比较古怪，导致有些题型的答案似乎不符合常理，但为了争取高分，你需要揣摩并暂时接受这些古怪的思维方式，并通过笔记来记录它们。

### 你的笔记
${笔记介绍}

### 笔记操作
${笔记操作介绍}

### user是谁
user并不是通常意义上的人类用户，而是一个数据接口，也是你的助理，
它会为你提供你先前记录的笔记，以及一道特殊的真题数据，
其特殊之处在于：
你曾基于现有的笔记内容和真题数据，给出了一个错误的答案和错误的分析过程，
这个错误也被记录在这个真题数据里了。

### 你的回应
你需要根据user提供现有笔记和真题数据（包括你曾经的错误分析）来进行回应，
你的回应应该是一个标准的JSON对象，不要带有md格式的代码块标记等其他多余的内容。
这个JSON对象的结构应遵循名为 \`YourResponse\` 的接口定义：
\`\`\`TypeScript
interface YourResponse {
  analyze0: string;  // 你对先前错误原因的初步分析。
  analyze1: string;  // 你对目前steps可改进之处（包括增补、除冗、除错等）的概要分析。
  analyze2: string;  // 你对目前tips可改进之处（包括增补、除冗、除错等）的概要分析。
  analyze3: string;  // 你是否觉得目前笔记较为冗长，是否需要以及如何进行优化和精炼。（注意不要武断地删除并未发生重复的细节）
  analyze4: string;  // 你是否觉得出题人的思维方式比较古怪，甚至有无可能是出题人搞错了。
  analyze5: string;  // 你是否发觉到目前的笔记中有某些内容是多余的，或者是错误的，或者是需要修改的。
  analyze6: string;  // 你最终的考虑。
  operations: {
    method: string;  // 如 "CREATE_QT" 等，是你计划对笔记执行的操作。
    args: {[key: string]: any};  // 你计划对笔记执行的操作的参数，参见 笔记操作 一节。
  }[];  // 你计划对笔记执行的若干操作。如果你认为没必要修改，则可以不返回这个字段。
}
\`\`\`
`.trim();

export function SpaCE_Step3_InputGenerator(dataWrap: any) {
  const lines = [];
  lines.push("====[你的笔记]====");
  lines.push(JSON.stringify(dataWrap?.qtBook??{entries:[]}));
  lines.push("====[含有错误分析的真题]====");
  lines.push(dataWrap?.errorCase==null?"":JSON.stringify(dataWrap?.errorCase??[]));
  lines.push("====[请按要求回应]====");
  return lines.join("\n");
}
export function SpaCE_Step3_MakeErrorCase(dataWrap: any) {
  dataWrap.errorCase = dataWrap.question;
  dataWrap.errorCase.wrongAnswer = dataWrap.errorItem.answer;
  dataWrap.errorCase.wrongAnalyze = dataWrap.errorItem.analyze;
}

export async function SpaCE_Step3_Process<CR, TT>(dataWrap: any, supplierForm: any, onAfterUpdate?: any) {
  const that = await 进一步抽象的标准化处理函数<CR, TT>(
    SpaCE_Step3_Prompt, SpaCE_Step3_InputGenerator, dataWrap, supplierForm, null, onAfterUpdate,
  );
  return that;
}








export const SpaCE_Demo_Data_1 = [
  {"id":"rsr-demo-1","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"李国秀熟练地用左脚夹起水瓢，从桶里舀起水，开始浇灌院子里的盆栽。不远处，丈夫张顺东单手拿着手机，跟在妻子后面，聚精会神地录制视频。一旁的昆明市东川区电子商务公共服务中心负责人陆金云小声指导：“可以绕到侧面，拍个浇花的特写。”","interpretation":"“可以绕到侧面”是以“李国秀”为基准，确定“侧面”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-2","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"李国秀熟练地用左脚夹起水瓢，从桶里舀起水，开始浇灌院子里的盆栽。不远处，丈夫张顺东单手拿着手机，跟在妻子后面，聚精会神地录制视频。一旁的昆明市东川区电子商务公共服务中心负责人陆金云小声指导：“可以绕到侧面，拍个浇花的特写。”","interpretation":"“可以绕到侧面”是以“陆金云”为基准，确定“侧面”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-3","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"巧事都挤一块了，马海并不在意，他继续说道：“我这儿有，你们谁先打？”谁知马海刚从怀里掏出手机，突然觉得不对劲，用手捋捋，上面有个洞，原来刚才那女的一枪打来，是手机替他挡了一下子弹，不然他就完蛋了。","interpretation":"“上面有个洞”是以“手机”为基准，确定“上面”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-4","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"巧事都挤一块了，马海并不在意，他继续说道：“我这儿有，你们谁先打？”谁知马海刚从怀里掏出手机，突然觉得不对劲，用手捋捋，上面有个洞，原来刚才那女的一枪打来，是手机替他挡了一下子弹，不然他就完蛋了。","interpretation":"“上面有个洞”是以“手”为基准，确定“上面”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-5","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"大街被腾出来了，那帮人站成一排，交通警武警派出所的民警全部出动，在对面站成一排，阻挡着群众。","interpretation":"“在对面站成一排”是以“那帮人”为基准，确定“对面”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-6","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"大街被腾出来了，那帮人站成一排，交通警武警派出所的民警全部出动，在对面站成一排，阻挡着群众。","interpretation":"“在对面站成一排”是以“群众”为基准，确定“对面”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-7","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"平房的东西两侧，各有一座小楼。西侧的小楼上除躺椅、书架之外，还有一架长长的远望镜。天气好时，他用那架“千里眼”细细地观察加勒比海。","interpretation":"“西侧的小楼”是以“平房”为基准，确定“西侧”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-8","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"平房的东西两侧，各有一座小楼。西侧的小楼上除躺椅、书架之外，还有一架长长的远望镜。天气好时，他用那架“千里眼”细细地观察加勒比海。","interpretation":"“西侧的小楼”是以“小楼”为基准，确定“西侧”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-9","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"4月15日上午8点多钟，北京市百货大楼的开门时间还没到，西边家电商场的大门口已有四五十人在排队，排第一的那个小伙子清晨4点就来了。","interpretation":"“西边家电商场”是以“百货大楼”为基准，确定“西边”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-10","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"4月15日上午8点多钟，北京市百货大楼的开门时间还没到，西边家电商场的大门口已有四五十人在排队，排第一的那个小伙子清晨4点就来了。","interpretation":"“西边家电商场”是以“北京市”为基准，确定“西边”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-11","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"黄美玲对此表示认同。经历了健身房训练到个人训练，再到上团课，在她看来，长期保持付费健身习惯，除了健康需求和成本因素外，不断更新的项目与模式带来持续的新鲜感、体验感也很重要。“比如，在写字楼旁的教室里练动作，大落地窗，我们在里面练，别人在外面看，还会跟着跳起来。”黄美玲说，这样的氛围是她坚持下来的动力之一。","interpretation":"“别人在外面看”是以“教室”为基准，确定“外面”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-12","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"黄美玲对此表示认同。经历了健身房训练到个人训练，再到上团课，在她看来，长期保持付费健身习惯，除了健康需求和成本因素外，不断更新的项目与模式带来持续的新鲜感、体验感也很重要。“比如，在写字楼旁的教室里练动作，大落地窗，我们在里面练，别人在外面看，还会跟着跳起来。”黄美玲说，这样的氛围是她坚持下来的动力之一。","interpretation":"“别人在外面看”是以“大落地窗”为基准，确定“外面”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-13","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"这种“迷你型”流动消防车，像当地的“倒骑驴”三轮车，前边放置消防器材，后边人骑行。单车造价成本仅为3000元。平时社区义务消防队员在小巷里可骑此车巡逻，发现初起火灾，可就近及时将火扑灭。","interpretation":"“前边放置消防器材”是以“流动消防车”为基准，确定“前边”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-14","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"这种“迷你型”流动消防车，像当地的“倒骑驴”三轮车，前边放置消防器材，后边人骑行。单车造价成本仅为3000元。平时社区义务消防队员在小巷里可骑此车巡逻，发现初起火灾，可就近及时将火扑灭。","interpretation":"“前边放置消防器材”是以“三轮车”为基准，确定“前边”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-15","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"男式藏袍宽大、带袖，女式的稍窄，分有袖无袖两种。一般夏天或劳动时只穿左袖，右袖从后面拉到胸前，搭在右肩上；也可以左右袖都不穿，两袖束在腰间。","interpretation":"“右袖从后面拉到胸前”是以“左袖”为基准，确定“后面”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-16","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"用餐过程中，如未吃完，请把刀叉放在盘的两侧，摆放方法是叉在左边面朝下，刀在右边与叉形成一个角；用餐完毕，刀和叉应并排放在盘子的右边或中间，以示意服务员收去。刀放下时刀口应向内。","interpretation":"“叉在左边面朝下”是以“盘”为基准，确定“左边”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-17","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"用餐过程中，如未吃完，请把刀叉放在盘的两侧，摆放方法是叉在左边面朝下，刀在右边与叉形成一个角；用餐完毕，刀和叉应并排放在盘子的右边或中间，以示意服务员收去。刀放下时刀口应向内。","interpretation":"“刀在右边与叉形成一个角”是以“盘”为基准，确定“右边”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-18","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"用餐过程中，如未吃完，请把刀叉放在盘的两侧，摆放方法是叉在左边面朝下，刀在右边与叉形成一个角；用餐完毕，刀和叉应并排放在盘子的右边或中间，以示意服务员收去。刀放下时刀口应向内。","interpretation":"“刀在右边与叉形成一个角”是以“叉”为基准，确定“右边”所指的具体方位。","answer":"错误"},
  {"id":"rsr-demo-19","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"主建筑分为两大部分：左侧是下方上圆的笋状塔楼，顶部为一钟形尖塔，直指云霄。旁边还有一些小塔簇立周围，如星辰环绕；右侧是三层平顶楼房，楼顶两侧各有一只对称的锥塔。","interpretation":"“顶部为一钟形尖塔”是以“塔楼”为基准，确定“顶部”所指的具体方位。","answer":"正确"},
  {"id":"rsr-demo-20","instruction":"判断interpretation是否正确。请只回答“正确”或“错误”。","text":"主建筑分为两大部分：左侧是下方上圆的笋状塔楼，顶部为一钟形尖塔，直指云霄。旁边还有一些小塔簇立周围，如星辰环绕；右侧是三层平顶楼房，楼顶两侧各有一只对称的锥塔。","interpretation":"“顶部为一钟形尖塔”是以“主建筑”为基准，确定“顶部”所指的具体方位。","answer":"错误"}
  
];

export const SpaCE_Demo_Data_2 = [
  {"id":"jsi-demo-1","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"碰撞发生后，“VANMANILA”轮船长迅速跑去驾驶台左侧外部的桥翼查看情况，当班三副杰哈尔跟在后面看见“XIANGZHOU”轮甲板以下已没入水上，就迅速跑回驾驶台发布全船广播，船长回驾驶室见其在进行减速操作，下令恢复原速继续航行。","answer":"错误","interpretation":"文本存在异常的空间表达：【没入水上】。“没入”指在水面之下，即水中，与“水上”矛盾。"},
  {"id":"jsi-demo-2","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"运动基本姿势站立，挺胸抬头，背部平直，双手臂自然放于身体两侧。肘部上抬至屈肘90°，然后前臂向上抬起形成“L”字，然后向下伸直与躯干形成“Y”字，回到起始姿势。","answer":"错误","interpretation":"文本存在异常的空间表达：【向下伸直与躯干形成“Y”字】。根据前文可知，肘部先上抬至屈肘90°，前臂再向上抬起形成“L”字。此时，手臂应进一步向上伸直才能与躯干形成“Y”字形，而非向下。"},
  {"id":"jsi-demo-3","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"大约是在课上到四十分钟时，一只母鸡在一个男孩的腿边停住了。它侧着脸，反复地看着那个男孩因裤管有一个小洞而从后面漏出的一块白净的皮肤。“这是什么东西？”那鸡想，在地上磨了磨喙，笃地一口，正对着那块皮肤啄了下去。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“母鸡”的空间信息来自“在一个男孩的腿边停住；侧着脸；正对着那块皮肤”等表达。“喙”的空间信息来自“在地上磨；啄了下去”等表达。“小洞”的空间信息来自“裤管有一个小洞”。“皮肤”的空间信息来自“从后面漏出”。"},
  {"id":"jsi-demo-4","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"美国西北部近日遭受了四年来最大的一次暴风雪袭击，公路结冰路滑。柯亚沙说，演出团34人分乘3辆小面包车在行至亚当斯县境内的公路上时，第二辆车首先失去控制，造成翻车，两名学生被摔出车外当场死亡，司机也受了重伤。前面一辆车的司机从后视镜中看到前面的车子出事，因紧急刹车也翻了车，但没有造成重大伤亡。当时正是周末，出事地点又在荒野的公路上，救护车在事发一个半小时后才赶到现场。","answer":"错误","interpretation":"文本存在异常的空间表达：【从后视镜中看到前面的车子】。根据常识可知，后视镜是司机获取汽车后方和侧方信息的工具。对于正常行驶的车辆，司机无法通过后视镜看到前面的情况。"},
  {"id":"jsi-demo-5","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"事故发生在比什凯克城北部的一个垃圾场。当时一座大垃圾堆突然倒塌，将在其上面拾垃圾的一些人埋在了里面。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“垃圾场”的空间信息来自“在比什凯克城北部”。“一些人”的空间信息来自“在其上面；埋在了里面”等表达。"},
  {"id":"jsi-demo-6","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"宋钢快步跟了上去，林红走进了小树林，宋钢也跟进了小树林。林红走到树林的中央，看看四周，确定没有别人了才站住脚，听着后面宋钢的脚步声越来越近，然后没有脚步声，只有呼哧呼哧的喘气声了。林红知道宋钢已经站在她身后了，林红站着不动，宋钢也是站着不动，林红心想这个傻瓜为什么不绕到外面来?林红等了一会儿，宋钢还是在她身后站着，还是呼哧呼哧地喘气。林红只好自己转过身去，她看到月光下的宋钢正在哆嗦，她仔细地看了看宋钢的脖子，那道血印隐隐约约。","answer":"错误","interpretation":"文本存在异常的空间表达：【林红心想这个傻瓜为什么不绕到外面来】。根据前文可知，宋钢和林红进入了树林并站着不动，二者都在树林的内部。“绕到外面来”在文本中找不到明确的空间参照实体，造成理解困难。"},
  {"id":"jsi-demo-7","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"经审理查明，2017年7月16日9时45分许，被告人黄某驾驶号牌为沪DKXXXX的重型特殊结构货车(搅拌车)沿本市周家嘴路由东向西行驶至江浦路口，在直行信号灯为绿灯时向北左转弯，适遇被害人董某某驾驶编号为XXXXXXX的“OFO”自行车沿周家嘴路非机动车道由东向西直行通过江浦路口，黄某所驾搅拌车右前部碰撞董某某的自行车左前部，致董倒地后被搅拌车车轮碾压受伤，董某某在送医途中死亡。","answer":"错误","interpretation":"文本存在异常的空间表达：【沿本市周家嘴路由东向西行驶至江浦路口，在直行信号灯为绿灯时向北左转弯】。货车转弯前的行驶方向是由东向西。车头朝西时，车的左边为南，车的右边为北。“向北”对应右转弯，而非左转弯。“左转弯”对应向南，而非向北。"},
  {"id":"jsi-demo-8","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"公诉机关指控，2020年7月30日13时34分许，被告人陈某某驾驶牌号为沪FAXXXX的重型箱式货车沿本区叶新公路行驶至叶旺公路路口，在路口处由东向北行驶。被告人驾驶车辆在右转过程中，适逢被害人顾玉妹驾驶的电动自行车沿叶新公路北侧非机动车道由东向西行驶而至，两车发生碰撞，造成顾玉妹送医途中死亡，经事故责任认定，被告人陈某某负本起事故的全部责任。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“箱式货车”的空间信息来自“沿本区叶新公路；行驶至叶旺公路路口；在路口处；由东向北行驶；右转；两车发生碰撞”等表达。“电动自行车”的空间信息来自“沿叶新公路北侧非机动车道；由东向西行驶而至；两车发生碰撞”等表达。"},
  {"id":"jsi-demo-9","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"我年轻的时候，几乎每个月开工资的日子里，都要去吃一次西餐。那时候，西餐馆很小，人也很少。我喜欢去旁边的秋林商店，买一瓶价格不算贵的兰姆酒，然后拿到餐厅自斟自饮。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“我”的空间信息来自“去秋林商店；到餐厅自斟自饮”等表达。“兰姆酒”的空间信息来自“秋林商店买；拿到餐厅”等表达。“秋林商店”的空间信息来自“旁边”。"},
  {"id":"jsi-demo-10","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"路越来越难修，修到四公里左右，前面出现了一道黑青色的大崖壁。这道崖壁三丈多高，像一堵铁壁铜墙，正正地堵在路中间。谢成芬把负责爆破的人集中起来，站在崖壁下商量了几次，决定先从下边打眼，把崖壁的下半部炸掉。第一次，他们打了六个炮眼，可这一排炮炸过之后，坚硬的崖壁纹丝不动，只炸飞了几块碎石头。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“崖壁”的空间信息来自“前面出现；堵在路中间；下半部”等表达。“人”的空间信息来自“集中起来；站在崖壁下”等表达。“炮眼”的空间信息来自“从下边打眼”。“碎石头”的空间信息来自“炸飞”。"},
  {"id":"jsi-demo-11","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"走进北京什刹海体育运动学校排列紧凑的教学楼地下室，十几名来自北京史家胡同小学的孩子正在这里学习高尔夫球。地下训练室中有两个迷你果岭，一名教练正在示范如何推球。孩子们把果岭围成一圈，聚精会神地看着球在教练轻轻推动下从草上滚出球洞。训练时，他们挥杆的身影映射到教室侧面的镜子中。镜子上面的墙壁上有一行字：“梦想从这里起步”。","answer":"错误","interpretation":"文本存在异常的空间表达：【球在教练轻轻推动下从草上滚出球洞】。教练正在迷你果岭中推动高尔夫球。根据常识可知，草在果岭中位于球洞的外部，推动高尔夫球的目的是进入球洞。表达某物从外部滚到内部应使用“滚入”，而非“滚出”。"},
  {"id":"jsi-demo-12","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"客人小心翼翼递过来一张字条。贝多芬戴上眼镜专注地凝视了一会儿：“好，你们竟敢到兽穴里来抓老狮子的毛。”他说，虽然严肃，但脸上浮现出善良的微笑，“你们很勇敢……可是你们不容易了解我，也很难使我听懂你们的话。回去坐在我旁边，你们知道我听不见的。”","answer":"错误","interpretation":"文本存在异常的空间表达：【回去坐在我旁边】。“回去”表示从当前位置返回到先前的位置，远离说话者。“坐在我旁边”则指向一个靠近说话者的位置。两个成分的空间信息存在矛盾。"},
  {"id":"jsi-demo-13","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"这一天，他在街上闲逛，经过一家花店，从玻璃窗里望出去，隔着重重叠叠的花山，看见霓喜在里面买花。","answer":"错误","interpretation":"文本存在异常的空间表达：【从玻璃窗里望出去】。根据上下文可知，主人公经过花店，在花店外面。但“从玻璃窗里望出去”表示视线从窗内望向窗外，说明主人公在花店内部。与上下文信息矛盾。"},
  {"id":"jsi-demo-14","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"在橡胶坝坝底，葛汉斌同激流展开英勇搏斗，奋力搜寻落水群众。但他被河里的漩涡卷来卷去，逐渐体力不支，最终被卷入水里。由于无法靠近激流中的漩涡，随后赶来的支队民警和其他救援力量在河两岸扯起长绳，拉着绳子跳入水中进行搜救。当葛汉斌被托上水面时，他已经没有了生命迹象。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“葛汉斌”的空间信息来自“在橡胶坝坝底；被卷入水里；被托上水面”等表达。“漩涡”的空间信息来自“河里；激流中”等表达。“长绳”的空间信息来自“在河两岸；扯起”等表达。“支队民警和其他救援力量”的空间信息来自“赶来；在河两岸扯；跳入水中”等表达。"},
  {"id":"jsi-demo-15","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"只见一辆黑色面包车落入水库，车头已没入水中，车辆后半部分尚在水面之上。他没有片刻犹豫，跳下车飞奔过去，从4米多高的堤坝跳下水库，奋力游向正在下沉的车辆。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“面包车”的空间信息来自“落入水库；车头没入水中；后半部分在水面之上；下沉”等表达。“他”的空间信息来自“跳下车；飞奔过去；从堤坝跳下水库；游向车辆”等表达。“堤坝”的空间信息来自“4米多高”。"},
  {"id":"jsi-demo-16","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"他们有的从不能作战的伤员身上收拾手榴弹和子弹，有的爬在地上拾捡弹药，有的伏在工事里观察敌人。忽然，城垣敌人听见下面有动静了，手榴弹雨点似的掷进来，几次摧毁了伤员们的避弹坑。","answer":"正确","interpretation":"文本的空间表达传递了实体正确的空间信息。“他们”的空间信息来自“从伤员身上收拾；爬在地上；伏在工事里”等表达。“手榴弹”的空间信息来自“掷进来；摧毁了避弹坑”等表达。“敌人”的空间信息来自“城垣敌人”。“动静”的空间信息来自“下面”。“手榴弹和子弹”的空间信息来自“伤员身上”。“弹药”的空间信息来自“地下”。"},
  {"id":"jsi-demo-17","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"他向壁厢走去，拿起他的布袋，打开，从里面搜出一件东西，放在床上，又把他的鞋子塞进袋里，扣好布袋，驮在肩上，戴上他的便帽，帽檐齐眉，又伸手去摸他的棍子，把它放在窗角上，回在床边，毅然决然拿起先头放在床上的那件东西。好像是根短铁钎，一端磨到和标枪一般尖。","answer":"错误","interpretation":"文本存在异常的空间表达：【回在床边】。“回”是趋向动词，搭配介词“到”作为终点标记，不能搭配静态的介词定位标记“在”。"},
  {"id":"jsi-demo-18","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"脸部朝下仰趴在地面上，腰背挺直，双腿靠拢并绷紧，脚尖绷直，双臂在头部两侧向上平行伸直，掌心向下，身体紧贴在地面上。","answer":"错误","interpretation":"文本存在异常的空间表达：【脸部朝下仰趴在地面上】。根据常识可知，脸部朝下趴在地面上的动作被称为“俯趴”，而非“仰趴”。"},
  {"id":"jsi-demo-19","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"经审理查明，2015年12月18日9时许，被告人邬某某驾驶牌号为沪FMXXXX的小汽车沿本市杨浦区控江路由西向东至敦化路路口，遇绿灯向北左转弯至南侧人行横道时，车辆右前部碰撞到沿人行横道由西向东行走的被害人张某某，致张倒地受伤。","answer":"错误","interpretation":"文本存在异常的空间表达：【沿本市杨浦区控江路由西向东至敦化路路口，遇绿灯向北左转弯至南侧人行横道】。汽车转弯前的行驶方向是由西向东。车头朝东时，车的左边为北，车的右边为南。向北左转弯后应至北侧人行横道，而非南侧。至南侧人行横道应向南右转弯。"},
  {"id":"jsi-demo-20","instruction":"判断text的空间语言表达是否正确。请只回答“正确”或“错误”。","text":"远望山头的云雾开始散去，我们沿着蜿蜒崎岖而略微有些陡峭的山路上行，山脚下的村庄越来越近，渐渐模糊，伴随着清晨的阳光，一切显得宁静而美好。","answer":"错误","interpretation":"文本存在异常的空间表达：【山脚下的村庄越来越近】。根据上下文可知，我们沿着山路上行，即远离山脚，应离山脚下的村庄越来越远，而非越来越近。"}
];

export const SpaCE_Demo_Data = SpaCE_Demo_Data_2;





