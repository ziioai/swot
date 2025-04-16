import { h as vnd, defineComponent, reactive } from 'vue';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import TrainingControlPanel from './TrainingControlPanel';
import QuestionCard, { type Question } from './QuestionCard';
import NoteHistoryPanel from './NoteHistoryPanel';

export default defineComponent({
  name: "AITrainingSystem",
  components: {
    TrainingControlPanel,
    QuestionCard,
    NoteHistoryPanel
  },
  setup() {
    const toast = useToast();
    
    const state = reactive({
      isTraining: false,
      loopCount: 0,
      maxLoopCount: 30,
      versionCertifyCount: 0,
      maxCertifyCount: 2,
      
      questions: [
        { id: 'Q001', content: '计算函数f(x) = x²在x=2处的导数', answer: '4', 
          stats: { totalCorrect: 4, totalWrong: 0, versionCorrect: 2, versionWrong: 0 },
          status: 'simple', aiThinking: '1. 识别题目要求计算导数\n2. 回忆导数定义和幂函数求导公式\n3. 应用公式: f\'(x) = 2x\n4. 代入x=2得到f\'(2)=4'
        },
        { id: 'Q002', content: '证明对于所有正整数n，1+3+5+...+(2n-1)=n²', answer: '数学归纳法证明过程...',
          stats: { totalCorrect: 3, totalWrong: 1, versionCorrect: 1, versionWrong: 1 },
          status: 'active', aiThinking: '1. 识别题目要求数学归纳法证明\n2. 基础步骤验证n=1时成立\n3. 归纳假设n=k时成立\n4. 错误: 在n=k+1步骤中计算错误',
          errorAnalysis: '1. 错误原因: 归纳步骤计算错误\n2. 改进方向: 加强数学归纳法训练\n3. 笔记更新: 添加归纳法详细步骤示例'
        },
        { id: 'Q003', content: '解释什么是拉格朗日中值定理并给出一个应用示例', answer: '定理解释和应用示例...',
          stats: { totalCorrect: 0, totalWrong: 0, versionCorrect: 0, versionWrong: 0 },
          status: 'processing', aiThinking: '1. 分析题目要求解释定理和示例\n2. 检索拉格朗日中值定理定义\n3. 构建解释框架...'
        },
      ] as Question[],
      
      noteHistory: [
        { version: '2023-11-20', content: '1. 数学归纳法步骤详解...\n2. 常见错误...' },
        { version: '2023-11-15', content: '1. 初步数学归纳法笔记...' },
      ],
      
      selectedQuestionSet: '数学基础题集',
      questionSets: ['数学基础题集', '逻辑推理题集', '编程算法题集', '全部题目'],
      activeNoteVersion: '2023-11-20'
    });

    const startTraining = () => {
      state.isTraining = true;
      toast.add({ severity: "success", summary: "训练开始", life: 1000 });
    };

    const stopTraining = () => {
      state.isTraining = false;
      toast.add({ severity: "info", summary: "训练停止", life: 1000 });
    };

    const analyzeError = (questionId: string) => {
      const question = state.questions.find(q => q.id === questionId);
      if (question) {
        question.errorAnalysis = 'AI正在分析错误原因并生成更新计划...';
        toast.add({ severity: "info", summary: "分析中", detail: "AI正在分析错误", life: 1000 });
      }
    };

    return () => 
      vnd("div", { class: "container mx-auto px-4 py-6" }, [
        vnd("header", { class: "mb-6" }, [
          vnd("h1", { class: "text-2xl md:text-3xl font-bold text-gray-800" }, "AI训练系统 - SWOT方法"),
          vnd("p", { class: "text-gray-600" }, "基于强弱项分析的智能训练工具")
        ]),
        
        vnd("div", { class: "grid grid-cols-1 lg:grid-cols-4 gap-4" }, [
          vnd(Panel, { 
            header: "训练控制", 
            toggleable: true, 
            class: "my-1.5rem! lg:col-span-1" 
          }, {
            default: () => vnd(TrainingControlPanel, {
              isTraining: state.isTraining,
              loopCount: state.loopCount,
              maxLoopCount: state.maxLoopCount,
              versionCertifyCount: state.versionCertifyCount,
              maxCertifyCount: state.maxCertifyCount,
              selectedQuestionSet: state.selectedQuestionSet,
              questionSets: state.questionSets,
              onStartTraining: startTraining,
              onStopTraining: stopTraining,
              'onUpdate:maxLoopCount': (value: number) => state.maxLoopCount = value,
              'onUpdate:maxCertifyCount': (value: number) => state.maxCertifyCount = value,
              'onUpdate:selectedQuestionSet': (value: string) => state.selectedQuestionSet = value
            })
          }),
          
          vnd("div", { class: "lg:col-span-3 space-y-4" }, 
            state.questions.map(question => 
              vnd(QuestionCard, {
                key: question.id,
                question: question,
                onAnalyzeError: analyzeError
              })
            )
          )
        ]),
        
        vnd(Panel, { 
          header: "笔记历史版本", 
          toggleable: true, 
          class: "my-1.5rem!" 
        }, {
          default: () => vnd(NoteHistoryPanel, {
            noteHistory: state.noteHistory,
            activeNoteVersion: state.activeNoteVersion,
            'onUpdate:activeNoteVersion': (version: string) => state.activeNoteVersion = version
          })
        })
      ]);
  }
});