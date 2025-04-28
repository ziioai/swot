
import _ from 'lodash';

import train2024String from './SpaCE2024_train.jsonl?raw';

export const train2024 =
train2024String.split('\n')
.filter(line => line.trim() !== '')
.map(line => JSON.parse(line));

const step = Math.ceil(train2024.length/60);

const train2024Samples_ = [] as any[];
for (let i = 0; i < train2024.length; i += step) {
  const sample = train2024[i];
  if (sample) {
    train2024Samples_.push(sample);
  }
}
export const train2024Samples = train2024Samples_;

export const SpaCE2024_intro = `
#### 题源介绍
这是SpaCE2024评测中的一道测试题。SpaCE2024以选择题的形式考察以下五个层次的空间语义理解能力：
##### （1）空间参照实体找回。
要求从四个选项中选出文本空间信息的参照物。
##### （2）空间信息角色识别。
要求从四个选项中选出文本空间信息的语义角色，或者选出与语义角色相对应的空间表达形式。
question 可分为两类。一类要求识别文本中特定的空间语言表达所承担的语义功能，或者说扮演了什么语义角色。形式上表现为“P属于SE的()信息”，P代表文本中的空间语言表达，S代表文本中的实体，E代表文本中的事件。另一类要求根据特定语义角色的描述识别文本中的语言表达，例题就属于这一类。具体来说，试题中涉及到的与空间信息相关的语义角色包括以下 13 种：
|序号|语义角色|角色含义|问题特征|
|---|---|---|---|
|1|空间实体|携带空间方位信息的实体。|无共性特征。|
|2|外部位置|实体相对于外部参照物的位置。|S 的位置|
|3|组件位置|实体作为一个组件，相对于整体的位置。|S 相对于整体的位置|
|4|起点|实体移动时的初始位置。|S E 的初始位置|
|5|终点|实体移动时的终止位置。|S E 的终止位置|
|6|路径|实体移动时经过的轨迹。|S 经过了  <br>S 的 E 路线  <br>S 通向  <br>S 的一端|
|7|方向|实体移动时的趋向。|S 的 E 趋向|
|8|朝向|实体某个侧面的位置。|S 的朝向|
|9|部位|实体的一个部位|S 的部位|
|10|形状|实体自身的形态或组成的形态|S 的形状  <br>S 形成的布局|
|11|距离|两个实体在空间上的间隔|无共性特征。|
|12|时间|空间表达的发生时间|P 发生在|
|13|叙实性|空间表达真实发生或没有发生|不真实的空间信息是|
##### （3）空间信息异常识别。
要求从四个选项中选出文本空间信息异常的语言表达。
空间信息异常识别题的 text 文本中含有异常的空间方位信息。有的异常存在搭配不当、违背常识等情况，仅阅读选项就能发现异常。例如，A选项“面包车左偏方向驶入右侧绿化带”有明显的异常，违背了空间方位常识：左偏方向会使面包车往左边行驶，而非往右。还有一类异常属于上下文信息冲突的情况，答案选项单独看没有异常，但在文本中存在相互矛盾的信息，便构成了异常。
##### （4）空间方位信息推理。
要求基于文本给出的推理条件进行空间方位推理，从四个选项中选出所有符合推理的选项。
##### （5）空间异形同义识别。
要求从四个选项中选出能使两个文本异形同义或异义的空间义词语。
`.trim();

export const SpaCE2024_Demo_Data_Standardized = train2024Samples.map((it: any)=>{

  const content = _.pick(it, ["text", "question", "option"]) as any;

  content.type = (it.qid??"").includes("-m-") ? "多选" : "单选";
  content.intro = SpaCE2024_intro;

  const that = {
    nnid: `SpaCE2024Demo[${it.qid}]`,
    content: content,
    answer: it.answer,
  };
  return that;
});
