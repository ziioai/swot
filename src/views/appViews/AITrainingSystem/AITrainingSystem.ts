// @unocss-include

import { h as vnd, defineComponent, reactive } from 'vue';
import { useToast } from 'primevue/usetoast';
import Panel from 'primevue/panel';
import ToolButton from '@components/shared/ToolButton';
import TrainingControlPanel from './TrainingControlPanel';
import QuestionCard from './QuestionCard';
import NoteHistoryPanel from './NoteHistoryPanel';
import { SWOTOptions, SWOTState, QuestionDisplay, QuestionEntry, QuestionNote } from './types';
import {
  播放叮咚声,
  播放咕嘟声,
  播放咔哒声,
  播放喇叭式胜利音效,
  播放随机曲谱,
  // 播放猫叫声,
  // 播放男人说话声,
  // 播放女人说Good声,
  // 播放胜利音效,
  // 播放小星星,
  // 播放电子舞曲,
} from '@utils/soundEffects';
import renderMarkdown from '@utils/md';

import { SpaCE2025_Demo_Data_Standardized } from '@data/SpaCE2025';



const 备忘 = `

[SpaCE2025](https://pku-space.github.io/SpaCE2025/)

- O 是否达到最大循环次数
  - 达到：结束训练
  - 未达到：
    - 所有【未跳过、非简单、未达最大验证次数】是否为空集合
      - 是：结束训练
      - 否：继续执行核心流程
    - 核心流程 并行做所有【未跳过、非简单、未达最大验证次数】的题
      - 是否全都故障了
        - 是：被迫结束训练
        - 否：继续
      - 对于每道做对的题
        - 此题版本练习次数+=1
        - 此题总练习次数+=1
        - 此题版本正确次数+=1
        - 此题总正确次数+=1
        - 如果「此题版本练习次数=此题版本正确次数 >= 版本简单阈值」则标记为【版本简单题】
        - 如果「此题总练习次数=此题总正确次数 >= 总简单阈值」则标记为【总简单题】
      - 对于每道做错的题
        - 此题版本错误次数+=1
          - 如果达到版本难题阈值，则标记为【版本跳过题】
        - 此题总错误次数+=1
          - 如果达到总体难题阈值，则标记为【总体跳过题】
      - 是否全对
        - 全对：版本确证次数+=1
        - 非全对：不增加确证次数
      - 对于每道做错的题
        - 更新笔记
      - 总循环次数+=1
      - 返回 O 继续下一轮循环

`;





export default defineComponent({
  name: "AITrainingSystem",
  components: { TrainingControlPanel, QuestionCard, NoteHistoryPanel },
  setup() {
    const toast = useToast();

    const demoData = reactive<{
      questions: QuestionEntry[];
    }>({
      questions: [],
    });
  
    // Mock 训练配置
    const options = reactive<SWOTOptions>({
      maxLoopCount: 30,           // 最大循环次数
      maxVerifyCount: 20,         // 最大验证次数
      maxCertifyCount: 2,         // 最大确证次数
      versionSimpleThreshold: 2,  // 版本简单阈值
      totalSimpleThreshold: 4,    // 总体简单阈值
      versionSkipThreshold: 5,    // 版本难题阈值
      totalSkipThreshold: 10,     // 总体难题阈值
    });

    // Mock 训练状态
    const state = reactive<SWOTState>({
      totalCount: 12,
      versionCount: 5,
      versionCertifyCount: 1,
      quStateDict: {},
      ended: false,
      startTime: '2023-11-15 09:30:00'
    });

    // Mock 题目数据
    const questions = reactive<QuestionDisplay[]>([
      {
        nnid: 'MATH-001',
        content: '计算函数f(x) = x²在x=2处的导数',
        answer: '4',
        status: 'simple',
        aiThinking: '1. 识别题目要求计算导数\n2. 应用幂函数求导公式\n3. 计算结果: 4',
        errorAnalysis: '',
        stats: {
          totalCorrect: 5,
          totalWrong: 0,
          versionCorrect: 3,
          versionWrong: 0
        }
      },
      {
        nnid: 'MATH-002',
        content: '证明对于所有正整数n，1+3+5+...+(2n-1)=n²',
        answer: '数学归纳法证明过程...',
        status: 'active',
        aiThinking: '1. 识别题目类型\n2. 尝试数学归纳法\n3. 在n=k+1步骤遇到困难',
        errorAnalysis: '1. 错误原因：归纳步骤不完整\n2. 改进方向：加强归纳法训练',
        stats: {
          totalCorrect: 2,
          totalWrong: 3,
          versionCorrect: 1,
          versionWrong: 2
        }
      }
    ]);

    // Mock 笔记数据
    const notes = reactive<QuestionNote[]>([
      {
        nnid: 'MATH-001',
        content: '导数基础笔记：\n1. 幂函数求导公式\n2. 链式法则应用',
        history: [
          {
            version: 'v1.0',
            content: '初步导数笔记',
            createdAt: '2023-11-01 10:00',
            updatedAt: '2023-11-01 10:00'
          }
        ]
      },
      {
        nnid: 'MATH-002',
        content: '数学归纳法笔记：\n1. 基础步骤\n2. 归纳假设\n3. 归纳步骤',
        history: [
          {
            version: 'v1.0',
            content: '初步归纳法笔记',
            createdAt: '2023-11-05 14:30',
            updatedAt: '2023-11-05 14:30'
          },
          {
            version: 'v1.1',
            content: '添加常见错误示例',
            createdAt: '2023-11-10 09:15',
            updatedAt: '2023-11-10 09:15'
          }
        ]
      }
    ]);

    const activeNote = notes[0]; // 默认显示第一个笔记








    // 空函数 - 仅用于UI交互演示
    const startTraining = () => toast.add({ severity: "info", summary: "UI演示", detail: "开始训练点击", life: 1000 });
    const continueTraining = () => toast.add({ severity: "info", summary: "UI演示", detail: "继续训练点击", life: 1000 });
    const pauseTraining = () => toast.add({ severity: "info", summary: "UI演示", detail: "暂停训练点击", life: 1000 });
    const stopTraining = () => toast.add({ severity: "info", summary: "UI演示", detail: "停止训练点击", life: 1000 });
    const analyzeError = () => toast.add({ severity: "info", summary: "UI演示", detail: "错误分析点击", life: 1000 });
    const updateOptions = () => toast.add({ severity: "info", summary: "UI演示", detail: "参数更新", life: 1000 });





    const 加载训练题集 = () => {
      demoData.questions = SpaCE2025_Demo_Data_Standardized;
    };







    return () =>
      vnd("div", { class: "container mx-auto px-4 py-6" }, [

        vnd(Panel, {
          header: "SWOT: self-prompt training",
          toggleable: true,
          collapsed: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => [
            vnd("div", {class: "stack-v"}, [
              vnd("p", { class: "" }, "小镇做题家 AI版"),
              vnd("div", { class: "markdown-body",
                innerHTML: renderMarkdown(备忘),
              }), 

              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "播放叮咚声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放叮咚声, }),
                vnd(ToolButton, { label: "播放咕嘟声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咕嘟声, }),
                vnd(ToolButton, { label: "播放咔哒声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放咔哒声, }),
                // vnd(ToolButton, { label: "播放猫叫声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放猫叫声, }),
                // vnd(ToolButton, { label: "播放男人说话声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放男人说话声, }),
                // vnd(ToolButton, { label: "播放女人说Good声", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放女人说Good声, }),
              ]),

              vnd("div", {class: "stack-h"}, [
                vnd(ToolButton, { label: "播放喇叭式胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放喇叭式胜利音效, }),
                // vnd(ToolButton, { label: "播放胜利音效", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放胜利音效, }),
                // vnd(ToolButton, { label: "播放小星星", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放小星星, }),
                // vnd(ToolButton, { label: "播放电子舞曲", icon: "pi pi-play", class: "mr-0.5rem", onClick: 播放电子舞曲, }),
                vnd(ToolButton, { label: "播放随机曲谱", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(16);}, }),
                vnd(ToolButton, { label: "播放随机曲谱64", icon: "pi pi-play", class: "mr-0.5rem", onClick: ()=>{播放随机曲谱(64);}, }),
              ]),

            ]),
          ],
        }),

        vnd(Panel, {
          header: "题库配置",
          toggleable: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => vnd("div", {
            class: "stack-v",
          }, [
            vnd("div", { class: "markdown-body", innerHTML: renderMarkdown(`
暂不开发，数据写在代码里

- 训练集：用于训练
- 开发集：训练好之后用开发集测试性能
- 测试集：输出答案，用于提交
              `.trim()),
            }),
            vnd("div", {class: "stack-h"}, [
              vnd(ToolButton, { label: "加载训练题集", icon: "pi pi-play", class: "mr-0.5rem", onClick: 加载训练题集, }),
            ]),
          ]),
        }),

        vnd("div", { class: "grid grid-cols-1 md:grid-cols-12 gap-4" }, [
          vnd(Panel, {
            header: "训练控制",
            toggleable: true,
            class: ["col-span-1 md:col-span-6 xl:col-span-5", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
          }, {
            default: () => vnd(TrainingControlPanel, {
              options: options,
              state: state,
              isTraining: false,
              onStartTraining: startTraining,
              onContinueTraining: continueTraining,
              onPauseTraining: pauseTraining,
              onStopTraining: stopTraining,
              'onUpdate:options': updateOptions
            })
          }),
        
          vnd(Panel, {
            header: "题目笔记",
            toggleable: true,
            class: ["col-span-1 md:col-span-6 xl:col-span-7", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
          }, {
            default: () => vnd("div", {
              class: "stack-v",
            }, [
              vnd("div", { class: "markdown-body", innerHTML: renderMarkdown(`
- 版本选择
                `.trim()),
              }),
              vnd(NoteHistoryPanel, {
                note: activeNote,
                onSaveNote: () => {
                  toast.add({ severity: "info", summary: "UI演示", detail: "笔记保存", life: 1000 });
                },
              }),
            ]),
          }),
        ]),

        vnd(Panel, {
          header: "本次循环的答题情况",
          toggleable: true,
          class: ["my-1.5rem! col", "bg-zinc-100/75!", "dark:bg-zinc-800/75!",]
        }, {
          default: () => vnd("div", {
            class: ["stack-h"],
          }, [
            questions.map(question =>
              vnd(QuestionCard, {
                class: "w-100% md:max-w-48% xl:max-w-32%",
                key: question.nnid,
                question: question,
                trainingState: {
                  nnid: question.nnid,
                  trainedCountV: question.stats.versionCorrect + question.stats.versionWrong,
                  trainedCountT: question.stats.totalCorrect + question.stats.totalWrong,
                  correctCountV: question.stats.versionCorrect,
                  correctCountT: question.stats.totalCorrect,
                  errorCountV: question.stats.versionWrong,
                  errorCountT: question.stats.totalWrong,
                  isSimpleV: question.status === 'simple',
                  isSimpleT: question.stats.totalWrong === 0 && question.stats.totalCorrect >= 5,
                  isSkipV: question.stats.versionWrong >= 3,
                  isSkipT: question.stats.totalWrong >= 5
                },
                onAnalyzeError: analyzeError
              })
            ),
          ]),
        }),

      ]);
  }
});