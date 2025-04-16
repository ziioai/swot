/* eslint-disable @typescript-eslint/no-explicit-any */
import { h as vnd, defineComponent, reactive } from 'vue';
import Panel from 'primevue/panel';
import { useToast } from 'primevue/usetoast';
import ToolButton from '@components/shared/ToolButton';

export default defineComponent({
  name: "AITrainingSystem",
  setup() {
    const toast = useToast();
    
    const state = reactive({
      // Training control state
      isTraining: false,
      loopCount: 0,
      maxLoopCount: 30,
      versionCertifyCount: 0,
      maxCertifyCount: 2,
      
      // Questions state
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
        }
      ],
      
      // Note history
      noteHistory: [
        { version: '2023-11-20', content: '1. 数学归纳法步骤详解...\n2. 常见错误...' },
        { version: '2023-11-15', content: '1. 初步数学归纳法笔记...' }
      ],
      
      // UI state
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

    return () => [
      vnd("div", { class: "container mx-auto px-4 py-6" }, [
        // Header
        vnd("header", { class: "mb-6" }, [
          vnd("h1", { class: "text-2xl md:text-3xl font-bold text-gray-800" }, "AI训练系统 - SWOT方法"),
          vnd("p", { class: "text-gray-600" }, "基于强弱项分析的智能训练工具")
        ]),
        
        // Main grid layout
        vnd("div", { class: "grid grid-cols-1 lg:grid-cols-4 gap-4" }, [
          // Control panel
          vnd(Panel, { 
            header: "训练控制", 
            toggleable: true, 
            class: "my-1.5rem! lg:col-span-1" 
          }, {
            default: () => vnd("div", { class: "space-y-4" }, [
              vnd("div", { class: "space-y-2" }, [
                vnd(ToolButton, { 
                  label: "开始训练", 
                  icon: "pi pi-play", 
                  class: "w-full",
                  onClick: startTraining
                }),
                vnd(ToolButton, { 
                  label: "停止训练", 
                  icon: "pi pi-stop", 
                  class: "w-full",
                  severity: "danger",
                  onClick: stopTraining
                })
              ]),
              
              vnd("div", { class: "border-t pt-3" }, [
                vnd("h3", { class: "font-medium text-gray-700 mb-2 text-sm" }, "训练参数"),
                vnd("div", { class: "space-y-2 text-xs" }, [
                  vnd("div", { class: "flex justify-between items-center" }, [
                    vnd("label", { class: "text-gray-600" }, "最大循环次数"),
                    vnd("input", { 
                      type: "number", 
                      value: state.maxLoopCount,
                      class: "w-16 border rounded px-2 py-1 text-xs",
                      onChange: (e: any) => state.maxLoopCount = parseInt(e.target.value)
                    })
                  ]),
                  vnd("div", { class: "flex justify-between items-center" }, [
                    vnd("label", { class: "text-gray-600" }, "版本确证次数"),
                    vnd("input", { 
                      type: "number", 
                      value: state.maxCertifyCount,
                      class: "w-16 border rounded px-2 py-1 text-xs",
                      onChange: (e: any) => state.maxCertifyCount = parseInt(e.target.value)
                    })
                  ])
                ])
              ]),
              
              vnd("div", { class: "border-t pt-3" }, [
                vnd("h3", { class: "font-medium text-gray-700 mb-2 text-sm" }, "选择训练题集"),
                vnd("select", { 
                  class: "w-full border rounded px-2 py-1 text-xs",
                  value: state.selectedQuestionSet,
                  onChange: (e: any) => state.selectedQuestionSet = e.target.value
                }, state.questionSets.map(set => 
                  vnd("option", { value: set }, set)
                ))
              ]),
              
              vnd("div", { class: "border-t pt-3" }, [
                vnd("h3", { class: "font-medium text-gray-700 mb-2 text-sm" }, "训练状态"),
                vnd("div", { class: "text-xs space-y-1" }, [
                  vnd("div", { class: "flex justify-between" }, [
                    vnd("span", { class: "text-gray-600" }, "当前循环:"),
                    vnd("span", null, `${state.loopCount}/${state.maxLoopCount}`)
                  ]),
                  vnd("div", { class: "flex justify-between" }, [
                    vnd("span", { class: "text-gray-600" }, "版本确证:"),
                    vnd("span", null, `${state.versionCertifyCount}/${state.maxCertifyCount}`)
                  ]),
                  vnd("div", { class: "flex justify-between" }, [
                    vnd("span", { class: "text-gray-600" }, "训练状态:"),
                    vnd("span", null, state.isTraining ? "进行中" : "已停止")
                  ])
                ])
              ])
            ])
          }),
          
          // Questions display area
          vnd("div", { class: "lg:col-span-3 space-y-4" }, 
            state.questions.map(question => 
              vnd(Panel, { 
                key: question.id,
                header: `题目 #${question.id}`,
                toggleable: true,
                class: question.status === 'processing' ? "border-l-4 border-blue-500" : 
                      question.status === 'simple' ? "border-l-4 border-green-500" : 
                      question.status === 'active' ? "border-l-4 border-yellow-500" : ""
              }, {
                default: () => vnd("div", { class: "p-4" }, [
                  // Question content
                  vnd("div", { class: "mb-3" }, [
                    vnd("h4", { class: "text-sm font-medium text-gray-700 mb-1" }, "题目内容:"),
                    vnd("div", { class: "bg-gray-50 p-3 rounded text-sm" }, question.content)
                  ]),
                  
                  // AI thinking process
                  vnd("div", { class: "mb-3" }, [
                    vnd("h4", { class: "text-sm font-medium text-gray-700 mb-1" }, "AI思考过程:"),
                    vnd("div", { class: "bg-blue-50 p-3 rounded text-sm whitespace-pre-wrap" }, question.aiThinking)
                  ]),
                  
                  // Answer comparison
                  vnd("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-3" }, [
                    vnd("div", null, [
                      vnd("h4", { class: "text-sm font-medium text-gray-700 mb-1" }, "正确答案:"),
                      vnd("div", { class: "bg-gray-50 p-3 rounded text-sm" }, question.answer)
                    ]),
                    vnd("div", null, [
                      vnd("h4", { class: "text-sm font-medium text-gray-700 mb-1" }, "AI回答:"),
                      vnd("div", { 
                        class: question.status === 'simple' ? "bg-green-50 p-3 rounded text-sm" : 
                              question.status === 'active' ? "bg-red-50 p-3 rounded text-sm" : 
                              "bg-yellow-50 p-3 rounded text-sm"
                      }, "AI回答内容...")
                    ])
                  ]),
                  
                  // Error analysis (if wrong)
                  question.errorAnalysis && [
                    vnd("div", { class: "mb-3" }, [
                      vnd("h4", { class: "text-sm font-medium text-gray-700 mb-1" }, "错误分析与笔记更新计划:"),
                      vnd("div", { class: "bg-yellow-50 p-3 rounded text-sm whitespace-pre-wrap" }, question.errorAnalysis)
                    ]),
                    vnd(ToolButton, { 
                      label: "应用笔记更新", 
                      icon: "pi pi-save", 
                      class: "mr-1.5rem",
                      onClick: () => analyzeError(question.id)
                    })
                  ]
                ])
              })
            )
          )
        ]),
        
        // Note history
        vnd(Panel, { 
          header: "笔记历史版本", 
          toggleable: true, 
          class: "my-1.5rem!" 
        }, {
          default: () => vnd("div", { class: "p-4" }, [
            vnd("div", { class: "flex space-x-2 mb-3 overflow-x-auto pb-2" }, 
              state.noteHistory.map(note => 
                vnd(ToolButton, { 
                  label: note.version,
                  class: `px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    note.version === state.activeNoteVersion ? 
                    'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`,
                  onClick: () => state.activeNoteVersion = note.version
                })
              )
            ),
            
            vnd("div", { class: "border rounded p-3 bg-gray-50 text-sm" }, [
              vnd("h3", { class: "font-medium mb-1" }, `当前笔记内容 (${state.activeNoteVersion} 更新)`),
              vnd("div", { class: "space-y-2 whitespace-pre-wrap" }, 
                state.noteHistory.find(n => n.version === state.activeNoteVersion)?.content
              )
            ])
          ])
        })
      ])
    ];
  }
});