
import _ from 'lodash';

import ArtS_20250325_String from './ArtS_20250325.json?raw';
import NatS_20250407_String from './NatS_20250407.json?raw';

export const ArtS_20250325 = JSON.parse(ArtS_20250325_String) as any[];
export const NatS_20250407 = JSON.parse(NatS_20250407_String) as any[];

const ArtS_step = Math.floor(ArtS_20250325.length/30);
const NatS_step = Math.floor(NatS_20250407.length/30);

const FIE2025_Training_samples_ = [] as any[];
for (let ii = 0; ii < 30; ii++) {
  const ArtS_sample = ArtS_20250325[ii*ArtS_step];
  if (ArtS_sample) {
    FIE2025_Training_samples_.push(ArtS_sample);
  }
  const NatS_sample = NatS_20250407[ii*NatS_step];
  if (NatS_sample) {
    FIE2025_Training_samples_.push(NatS_sample);
  }
}
export const FIE2025_Training_samples = FIE2025_Training_samples_;

export const FIE2025_intro = `
#### 背景介绍
这是FIE2025（Factivity Inference Evaluation 2025，第一届中文叙实性推理评测）中的一道测试题。
叙实性推理（Factivity Inference, FI）是一种与事件真实性判断有关的语义理解任务，主要涉及语言使用中事实性信息的表达。
在人类的会话交际中，叙实性推理能力表现为语言使用者可以从某些动词性语言成分（如“相信”“谎称”“意识到”等）的使用推知其他语言成分所描述的相关事件的真实性（真还是假）。 例如，从肯定句“他们意识到局面已经不可挽回”和相应的否定句“他们没有意识到局面已经不可挽回”上，都可以推理出存在这样一个事实：“局面已经不可挽回”。进行叙实性推理所使用的知识是一种受世界知识（world knowledge）影响较小、主要涉及语言内部各成分之间语义关系的分析性语言知识（analytical knowledge of language）。比如，上面例句中的动词“意识到”要求（预设）它的宾语“局面已经不可挽回”的所指为真，不管该动词前面有没有否定性词语。
叙实性推理和反事实推理（Counter-Factual Inference, CFI）是语义理解中与事件真实性判断有关的两种推理形式，可统称为“真实性推理”（Factuality Inference, FactI）。 相较而言，叙实性推理主要依靠谓词（predicates, 如动词）来表达。例如，从“约翰不知道罗昆是中国人”中“知道”这个动词的使用，可以推理出这样一个事实：“罗昆是中国人”。而反事实推理则主要依靠反事实条件句（counter-factual conditionals）来表达。例如，从“要不是消防队来得及时，大火就要烧到顶楼了”这个反事实条件句中，可以推理出两个事实：“消防队确实来得很及时”和“大火确实没有烧到顶楼”。
#### 字段含义
（1） d_id：数据编号。编号采用“语料类型-数据号”的策略，其中“Art”表示“Artifactual”，“Nat”表示“Natural”，“ArtS”表示“Artifactual Sample”，“NatS”表示“Natural Sample”。
（2） type：谓词的叙实性类型。此字段只出现在人造语料中。
（3） predicate：谓词。谓词中大部分为动词，少部分为形容词。人造语料集涉及77个谓词，真实语料集涉及71个谓词。
（4） text：背景句（主蕴含句）。此字段提供推理所需的语境，模型需要以此为依据来判断结论句的真值情况。
（5） hypothesis：结论句（被蕴含句）。此字段提供推理所需的鉴别式，模型需要以背景句的内容来判断此句的真值情况。
`.trim();
export const FIE2025_instruction = `
假设text字段的内容为真，回答hypothesis字段的内容是否为真；答案仅限“真”“假”或“不能确定”，不能回答其他内容。
`.trim();

const answerMap = {
  "T": "真",
  "F": "假",
  "U": "不能确定",
  "R": "拒绝回答",  // 模型拒绝回答
} as any;

export const FIE2025_Training_Data_Standardized = FIE2025_Training_samples.map((it: any)=>{

  const content = {} as any;
  content.intro = FIE2025_intro;
  content.instruction = FIE2025_instruction;
  const content_ = _.pick(it, ["d_id", "text", "hypothesis", "predicate", "type"]) as any;
  Object.assign(content, content_);

  const that = {
    nnid: `FIE2025Demo[${it.d_id}]`,
    content: content,
    answer: answerMap?.[it?.answer]??"未知",
  };
  return that;
});
