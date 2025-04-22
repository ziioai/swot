// 基础音频播放引擎
export class SoundEngine {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new AudioContext();
  }
  
  // 获取当前音频上下文
  getAudioContext(): AudioContext {
    return this.audioContext;
  }
  
  // 创建简单的音符
  createTone(options: {
    type: OscillatorType;
    frequency: number;
    startTime: number;
    duration: number;
    gainEnvelope: {time: number; value: number}[];
    connect: AudioNode;
  }) {
    const { type, frequency, startTime, duration, gainEnvelope, connect } = options;
    
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    
    oscillator.connect(gainNode);
    gainNode.connect(connect);
    
    // 应用音量包络
    gainEnvelope.forEach(point => {
      // 确保时间值是有限的
      const timeValue = startTime + point.time;
      if (isFinite(timeValue)) {
        gainNode.gain.linearRampToValueAtTime(point.value, timeValue);
      } else {
        console.warn('非法的时间值:', {startTime, pointTime: point.time, sum: timeValue});
        // 使用一个安全的默认值
        gainNode.gain.linearRampToValueAtTime(point.value, startTime || this.audioContext.currentTime);
      }
    });
    
    // 确保开始和停止时间都是有限数
    const safeStartTime = isFinite(startTime) ? startTime : this.audioContext.currentTime;
    const safeStopTime = isFinite(startTime + duration) ? 
                        startTime + duration : 
                        this.audioContext.currentTime + (isFinite(duration) ? duration : 1);
    
    oscillator.start(safeStartTime);
    oscillator.stop(safeStopTime);
    
    return { oscillator, gainNode };
  }
  
  // 创建噪声源
  createNoise(options: {
    duration: number;
    startTime: number;
    gainEnvelope: {time: number; value: number}[];
    connect: AudioNode;
    decayRate?: number;
  }) {
    const { duration, startTime, gainEnvelope, connect, decayRate = 0 } = options;
    
    const bufferSize = this.audioContext.sampleRate * duration;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      if (decayRate > 0) {
        data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - (i / (bufferSize * decayRate)));
      } else {
        data[i] = Math.random() * 2 - 1;
      }
    }
    
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    
    noiseSource.connect(gainNode);
    gainNode.connect(connect);
    
    // 应用音量包络
    gainEnvelope.forEach(point => {
      const timeValue = startTime + point.time;
      if (isFinite(timeValue)) {
        gainNode.gain.linearRampToValueAtTime(point.value, timeValue);
      } else {
        console.warn('噪声音效中非法的时间值:', {startTime, pointTime: point.time, sum: timeValue});
        gainNode.gain.linearRampToValueAtTime(point.value, startTime || this.audioContext.currentTime);
      }
    });
    
    // 确保开始和停止时间都是有限数
    const safeStartTime = isFinite(startTime) ? startTime : this.audioContext.currentTime;
    const safeStopTime = isFinite(startTime + duration) ? 
                        startTime + duration : 
                        this.audioContext.currentTime + (isFinite(duration) ? duration : 1);
    
    noiseSource.start(safeStartTime);
    noiseSource.stop(safeStopTime);
    
    return { noiseSource, gainNode };
  }
  
  // 创建基本滤波器
  createFilter(options: {
    type: BiquadFilterType;
    frequency: number;
    Q?: number;
  }): BiquadFilterNode {
    const { type, frequency, Q = 1 } = options;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    
    return filter;
  }
  
  // 创建混响效果
  createReverb(options: {
    duration: number;
    decayRate: number;
  }): ConvolverNode {
    const { duration, decayRate } = options;
    
    const convolver = this.audioContext.createConvolver();
    const length = this.audioContext.sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const impulseData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate);
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }
}

// 定义曲谱类型
export type SoundEffect = {
  name: string;
  type: 'tone' | 'noise' | 'composite';
  elements?: SoundEffectElement[];
  effects?: SoundEffectProcessing[];
  masterVolume?: number;
}

// 声音元素类型
export type SoundEffectElement = ToneElement | NoiseElement | FrequencyRampElement;

// 声音处理效果
export type SoundEffectProcessing = {
  type: 'filter' | 'reverb';
  params: any;
}

// 音调元素
export type ToneElement = {
  type: 'tone';
  oscillatorType: OscillatorType;
  frequency: number;
  startTime: number;
  duration: number;
  gainEnvelope: {time: number; value: number}[];
  vibrato?: {
    frequency: number;
    depth: number;
    startTime: number;
    duration: number;
  }
}

// 噪声元素
export type NoiseElement = {
  type: 'noise';
  startTime: number;
  duration: number;
  gainEnvelope: {time: number; value: number}[];
  decayRate?: number;
}

// 频率斜坡元素
export type FrequencyRampElement = {
  type: 'frequencyRamp';
  oscillatorType: OscillatorType;
  startFrequency: number;
  endFrequency: number;
  startTime: number;
  duration: number;
  gainEnvelope: {time: number; value: number}[];
}

// 音效播放函数
export function playSoundEffect(effect: SoundEffect): void {
  const engine = new SoundEngine();
  const audioContext = engine.getAudioContext();
  
  // 创建主音量控制
  const masterGain = audioContext.createGain();
  masterGain.gain.value = effect.masterVolume || 1.0;
  masterGain.connect(audioContext.destination);
  
  // 处理效果链
  let effectChain: AudioNode = masterGain;
  if (effect.effects && effect.effects.length > 0) {
    // 从后向前应用效果链，最后一个效果连接到masterGain
    effect.effects.slice().reverse().forEach(effectConfig => {
      if (effectConfig.type === 'filter') {
        const filter = engine.createFilter(effectConfig.params);
        filter.connect(effectChain);
        effectChain = filter;
      } else if (effectConfig.type === 'reverb') {
        const reverb = engine.createReverb(effectConfig.params);
        reverb.connect(effectChain);
        effectChain = reverb;
      }
    });
  }
  
  // 处理所有声音元素
  if (effect.elements) {
    effect.elements.forEach(element => {
      if (element.type === 'tone') {
        const toneElement = element as ToneElement;
        const tone = engine.createTone({
          type: toneElement.oscillatorType,
          frequency: toneElement.frequency,
          startTime: audioContext.currentTime + toneElement.startTime,
          duration: toneElement.duration,
          gainEnvelope: toneElement.gainEnvelope,
          connect: effectChain
        });
        
        // 应用颤音效果
        if (toneElement.vibrato) {
          const vibrato = audioContext.createOscillator();
          vibrato.frequency.value = toneElement.vibrato.frequency;
          
          const vibratoGain = audioContext.createGain();
          vibratoGain.gain.value = toneElement.vibrato.depth;
          
          vibrato.connect(vibratoGain);
          vibratoGain.connect(tone.oscillator.frequency);
          
          vibrato.start(audioContext.currentTime + toneElement.vibrato.startTime);
          vibrato.stop(audioContext.currentTime + toneElement.vibrato.startTime + toneElement.vibrato.duration);
        }
      } else if (element.type === 'noise') {
        const noiseElement = element as NoiseElement;
        engine.createNoise({
          duration: noiseElement.duration,
          startTime: audioContext.currentTime + noiseElement.startTime,
          gainEnvelope: noiseElement.gainEnvelope,
          connect: effectChain,
          decayRate: noiseElement.decayRate
        });
      } else if (element.type === 'frequencyRamp') {
        const rampElement = element as FrequencyRampElement;
        const oscillator = audioContext.createOscillator();
        oscillator.type = rampElement.oscillatorType;
        
        // 设置频率斜坡
        const safeStartTime = isFinite(audioContext.currentTime + rampElement.startTime) ? 
                             audioContext.currentTime + rampElement.startTime : 
                             audioContext.currentTime;
        
        const safeEndTime = isFinite(audioContext.currentTime + rampElement.startTime + rampElement.duration) ? 
                           audioContext.currentTime + rampElement.startTime + rampElement.duration : 
                           audioContext.currentTime + (isFinite(rampElement.duration) ? rampElement.duration : 1);
        
        oscillator.frequency.setValueAtTime(rampElement.startFrequency, safeStartTime);
        oscillator.frequency.linearRampToValueAtTime(rampElement.endFrequency, safeEndTime);
        
        // 创建增益节点和包络
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        
        oscillator.connect(gainNode);
        gainNode.connect(effectChain);
        
        // 应用音量包络
        rampElement.gainEnvelope.forEach(point => {
          const timeValue = audioContext.currentTime + rampElement.startTime + point.time;
          if (isFinite(timeValue)) {
            gainNode.gain.linearRampToValueAtTime(point.value, timeValue);
          } else {
            console.warn('频率斜坡中非法的时间值:', {
              contextTime: audioContext.currentTime,
              startTime: rampElement.startTime,
              pointTime: point.time,
              sum: timeValue
            });
            gainNode.gain.linearRampToValueAtTime(point.value, audioContext.currentTime);
          }
        });
        
        // 启动和停止振荡器
        oscillator.start(safeStartTime);
        oscillator.stop(safeEndTime);
      }
    });
  }
  
  // 对于复合音效，处理特殊情况，如随机渲染
  if (effect.type === 'composite') {
    // 为复合音效留空，可以在这里添加特殊逻辑
  }
}



// 统一的播放接口函数
export const 播放音效 = (曲谱: SoundEffect) => {
  playSoundEffect(曲谱);
};



// 曲谱定义 - 叮咚声
export const 叮咚声曲谱: SoundEffect = {
  name: "叮咚声",
  type: "composite",
  masterVolume: 1.0,
  elements: [
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1046.5, // 高音C (C6)
      startTime: 0,
      duration: 0.35,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.4 },
        { time: 0.3, value: 0.01 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1318.51, // 高音E (E6)
      startTime: 0,
      duration: 0.35,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.4 },
        { time: 0.3, value: 0.01 }
      ]
    }
  ]
};
export const 播放叮咚声 = () => 播放音效(叮咚声曲谱);

// 曲谱定义 - 咕嘟声
export const 咕嘟声曲谱: SoundEffect = {
  name: "咕嘟声",
  type: "composite",
  masterVolume: 1.0,
  elements: [
    {
      type: "frequencyRamp",
      oscillatorType: "triangle",
      startFrequency: 180,
      endFrequency: 70,
      startTime: 0,
      duration: 0.5,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.7 },
        { time: 0.1, value: 0.5 },
        { time: 0.5, value: 0 }
      ]
    }
  ],
  // effects: [
  //   {
  //     type: "filter",
  //     params: {
  //       type: "lowpass",
  //       frequency: 400,
  //       Q: 5
  //     }
  //   }
  // ]
};
export const 播放咕嘟声 = () => 播放音效(咕嘟声曲谱);

// 曲谱定义 - 哐当声
export const 哐当声曲谱: SoundEffect = {
  name: "哐当声",
  type: "composite",
  masterVolume: 1.0,
  elements: [
    // 主要金属碰撞声
    {
      type: "noise",
      startTime: 0,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.85 }, // 强烈的初始冲击
        { time: 0.05, value: 0.5 },
        { time: 0.15, value: 0.2 },
        { time: 0.25, value: 0 }
      ],
      decayRate: 0.3
    },
    
    // 金属共振 - 低频
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 120, // 低音金属共振
      startTime: 0.01,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.7 },
        { time: 0.1, value: 0.3 },
        { time: 0.3, value: 0 }
      ]
    },
    
    // 金属共振 - 中频
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 350,
      startTime: 0.01,
      duration: 0.2,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.5 },
        { time: 0.08, value: 0.25 },
        { time: 0.2, value: 0 }
      ],
      vibrato: {
        frequency: 30, // 快速振动模拟金属抖动
        depth: 15,
        startTime: 0.01,
        duration: 0.18
      }
    },
    
    // // 金属尖锐声
    // {
    //   type: "tone",
    //   oscillatorType: "sawtooth",
    //   frequency: 1200,
    //   startTime: 0,
    //   duration: 0.15,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.01, value: 0.4 },
    //     { time: 0.05, value: 0.15 },
    //     { time: 0.15, value: 0 }
    //   ]
    // },
    
    // 次级碰撞 - 模拟物体弹跳
    {
      type: "noise",
      startTime: 0.14,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.45 }, // 次级撞击，比第一次弱
        { time: 0.05, value: 0.2 },
        { time: 0.15, value: 0 }
      ],
      decayRate: 0.4
    },
    
    // 次级金属共振 - 模拟弹跳后的余震
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 180,
      startTime: 0.15,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.4 },
        { time: 0.1, value: 0.15 },
        { time: 0.25, value: 0 }
      ]
    },
    
    // // 金属余音 - 高频泛音衰减
    // {
    //   type: "frequencyRamp",
    //   oscillatorType: "sine",
    //   startFrequency: 3000,
    //   endFrequency: 1500,
    //   startTime: 0.02,
    //   duration: 0.35,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.01, value: 0.15 },
    //     { time: 0.2, value: 0.05 },
    //     { time: 0.35, value: 0 }
    //   ]
    // }
  ],
  effects: [
    // // 滤波器 - 强化金属质感
    // {
    //   type: "filter",
    //   params: {
    //     type: "bandpass",
    //     frequency: 2500,
    //     Q: 1.5
    //   }
    // },
    // 混响 - 模拟空间效果
    {
      type: "reverb",
      params: {
        duration: 0.8,
        decayRate: 25.64
      }
    }
  ]
};
export const 播放哐当声 = () => 播放音效(哐当声曲谱);

// 曲谱定义 - 咔哒声
export const 咔哒声曲谱: SoundEffect = {
  name: "咔哒声",
  type: "composite",
  masterVolume: 1.0,
  elements: [
    {
      type: "noise",
      startTime: 0,
      duration: 0.2,  // 增加持续时间
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.5 },  // 提高音量峰值
        { time: 0.1, value: 0.2 },    // 添加中间点使声音衰减更平滑
        { time: 0.18, value: 0.001 }  // 延长衰减时间
      ],
      decayRate: 0.15  // 调整衰减率
    },
    {
      type: "tone",     // 添加高频音调元素增加明亮度
      oscillatorType: "triangle",
      frequency: 4000,  // 高频音调
      startTime: 0,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.002, value: 0.2 },
        { time: 0.1, value: 0.001 }
      ]
    }
  ],
  // effects: [
  //   {
  //     type: "filter",
  //     params: {
  //       type: "bandpass",
  //       frequency: 3500,  // 提高中心频率使声音更明亮
  //       Q: 0.8            // 降低Q值使频带更宽
  //     }
  //   }
  // ]
};
export const 播放咔哒声 = () => 播放音效(咔哒声曲谱);

// 曲谱定义 - 坠落声
export const 坠落声曲谱: SoundEffect = {
  name: "坠落声",
  type: "composite",
  masterVolume: 1.0,
  elements: [
    // 主要下落音效 - 从高到低快速滑落的频率
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth",
      startFrequency: 800,
      endFrequency: 150,
      startTime: 0,
      duration: 0.6,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.5 },
        { time: 0.4, value: 0.3 },
        { time: 0.6, value: 0 }
      ]
    },
    // 次要下落音效 - 稍微滞后，增强立体感
    {
      type: "frequencyRamp",
      oscillatorType: "triangle",
      startFrequency: 700,
      endFrequency: 100,
      startTime: 0.1,
      duration: 0.6,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.3 },
        { time: 0.45, value: 0.15 },
        { time: 0.6, value: 0 }
      ]
    },
    // 添加呼啸风声 - 随下落过程越来越强
    {
      type: "noise",
      startTime: 0.05,
      duration: 0.7,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.2, value: 0.1 },
        { time: 0.5, value: 0.2 },
        { time: 0.7, value: 0 }
      ],
      decayRate: 0.1
    },
    // // 撞击声 - 在下落结束时
    // {
    //   type: "noise",
    //   startTime: 0.6,
    //   duration: 0.2,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.01, value: 0.6 },
    //     { time: 0.05, value: 0.3 },
    //     { time: 0.2, value: 0 }
    //   ],
    //   decayRate: 0.4
    // },
    // // 低频撞击 - 增强撞击感
    // {
    //   type: "tone",
    //   oscillatorType: "sine",
    //   frequency: 80,
    //   startTime: 0.6,
    //   duration: 0.25,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.01, value: 0.7 },
    //     { time: 0.1, value: 0.2 },
    //     { time: 0.25, value: 0 }
    //   ]
    // }
  ],
  effects: [
    // // 滤波器 - 突出空气摩擦感
    // {
    //   type: "filter",
    //   params: {
    //     type: "bandpass",
    //     frequency: 2600,
    //     Q: 0.8
    //   }
    // },

    // 混响 - 提供空间感
    {
      type: "reverb",
      params: {
        duration: 1.2,
        decayRate: 2.3
      }
    }
  ]
};
export const 播放坠落声 = () => 播放音效(坠落声曲谱);

// 曲谱定义 - 报错声
export const 报错声曲谱: SoundEffect = {
  name: "报错声",
  type: "composite",
  masterVolume: 1,
  elements: [
    // 主要错误音 - 降调的两个音符
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 392.00, // G4
      startTime: 0.0,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.5 },
        { time: 0.12, value: 0.3 },
        { time: 0.15, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 261.63, // C4
      startTime: 0.15,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.6 },
        { time: 0.2, value: 0.3 },
        { time: 0.25, value: 0 }
      ]
    },
    
    // 增加嘈杂感 - 警告色彩
    {
      type: "tone",
      oscillatorType: "sawtooth",
      frequency: 196.00, // G3
      startTime: 0.16,
      duration: 0.22,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.15 },
        { time: 0.18, value: 0.08 },
        { time: 0.22, value: 0 }
      ]
    },
    
    // 添加噪声元素增强错误感
    {
      type: "noise",
      startTime: 0.15,
      duration: 0.2,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.15 },
        { time: 0.15, value: 0.10 },
        { time: 0.2, value: 0 }
      ],
      decayRate: 0.3
    },
    
    // 添加低频共鸣，增强警告感
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 110.00, // A2
      startTime: 0.15,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.25 },
        { time: 0.2, value: 0.15 },
        { time: 0.3, value: 0 }
      ]
    },
    
    // 高频尖锐声 - 引起注意
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 1046.50, // C6
      startTime: 0.01,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.12 },
        { time: 0.08, value: 0.05 },
        { time: 0.1, value: 0 }
      ]
    }
  ],
  effects: [
    {
      type: "filter",
      params: {
        type: "bandpass",
        frequency: 3200,
        Q: 0.80
      }
    },
    {
      type: "reverb",
      params: {
        duration: 2.25,
        decayRate: 20.5,
      }
    },
  ]
};
export const 播放报错声 = () => 播放音效(报错声曲谱);





// 曲谱定义 - 胜利音效
export const 胜利音效曲谱: SoundEffect = {
  name: "胜利音效",
  type: "composite",
  masterVolume: 0.7,
  elements: [
    // 旋律音符
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 523.25, // C5
      startTime: 0.0,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.3 },
        { time: 0.15, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 659.25, // E5
      startTime: 0.15,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.3 },
        { time: 0.15, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 783.99, // G5
      startTime: 0.3,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.3 },
        { time: 0.15, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1046.50, // C6
      startTime: 0.45,
      duration: 0.7,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.3 },
        { time: 0.4, value: 0.3 },
        { time: 0.7, value: 0.001 }
      ],
      vibrato: {
        frequency: 6,
        depth: 5,
        startTime: 0.2,
        duration: 0.5
      }
    },
    
    // 和弦部分
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 523.25, // C5
      startTime: 0.45,
      duration: 1.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.1, value: 0.2 },
        { time: 0.6, value: 0.2 },
        { time: 1.0, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 659.25, // E5
      startTime: 0.45,
      duration: 1.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.1, value: 0.14 },
        { time: 0.6, value: 0.14 },
        { time: 1.0, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 783.99, // G5
      startTime: 0.45,
      duration: 1.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.1, value: 0.12 },
        { time: 0.6, value: 0.12 },
        { time: 1.0, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 1046.50, // C6
      startTime: 0.45,
      duration: 1.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.1, value: 0.1 },
        { time: 0.6, value: 0.1 },
        { time: 1.0, value: 0.001 }
      ]
    },
    
    // 闪亮音效部分 - 预定义8个不同音高的音符
    ...Array.from({ length: 8 }, (_, i) => ({
      type: "tone" as const,
      oscillatorType: "sine" as const,
      frequency: 2000 + 3000 * (i / 8), // 从2000Hz到5000Hz均匀分布
      startTime: 0.7 + i * 0.08, // 从0.7秒开始，每个音符间隔0.08秒
      duration: 0.12,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.1 },
        { time: 0.1, value: 0.001 }
      ]
    }))
  ],
  effects: [
    {
      type: "reverb",
      params: {
        duration: 2,
        decayRate: 0.2
      }
    }
  ]
};
export const 播放胜利音效 = () => 播放音效(胜利音效曲谱);

// 曲谱定义 - 喇叭式胜利音效
export const 喇叭式胜利音效曲谱: SoundEffect = {
  name: "喇叭式胜利音效",
  type: "composite",
  masterVolume: 0.7,
  elements: [
    // 主旋律音符 - 使用矩形波产生明亮泛音丰富的喇叭感
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 523.25, // C5
      startTime: 0.0,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.5 }, // 更快的起音
        { time: 0.12, value: 0.2 },
        { time: 0.15, value: 0.001 } // 更干净的结尾
      ]
    },
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 659.25, // E5
      startTime: 0.15,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.5 },
        { time: 0.12, value: 0.2 },
        { time: 0.15, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 783.99, // G5
      startTime: 0.3,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.5 },
        { time: 0.12, value: 0.2 },
        { time: 0.15, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "square",
      frequency: 1046.50, // C6
      startTime: 0.45,
      duration: 0.4, // 缩短持续时间使其更干脆
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.6 }, // 增强主音音量
        { time: 0.3, value: 0.4 },
        { time: 0.4, value: 0.001 }
      ],
      vibrato: {
        frequency: 8, // 更快的颤音频率
        depth: 7,    // 更深的颤音
        startTime: 0.1,
        duration: 0.3
      }
    },
    
    // 添加铜管乐器特有的泛音
    {
      type: "tone",
      oscillatorType: "sawtooth", // 锯齿波添加更多泛音
      frequency: 1046.50 * 1.5, // C6的泛音 (G7)
      startTime: 0.45,
      duration: 0.35,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.15 },
        { time: 0.2, value: 0.1 },
        { time: 0.35, value: 0.001 }
      ]
    },
    
    // 减少和弦部分的持续时间，使音效更干脆
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 523.25, // C5
      startTime: 0.45,
      duration: 0.4, // 缩短持续时间
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.15 },
        { time: 0.3, value: 0.1 },
        { time: 0.4, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 659.25, // E5
      startTime: 0.45,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.1 },
        { time: 0.3, value: 0.07 },
        { time: 0.4, value: 0.001 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 783.99, // G5
      startTime: 0.45,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.08 },
        { time: 0.3, value: 0.05 },
        { time: 0.4, value: 0.001 }
      ]
    },
    
    // 闪亮音效部分 - 改为更像喇叭的音色分布
    ...Array.from({ length: 5 }, (_, i) => ({
      type: "tone" as const,
      oscillatorType: "square" as const, // 方波产生更亮的泛音
      frequency: 2500 + 2000 * (i / 5), // 在高频区域集中分布
      startTime: 0.7 + i * 0.05, // 缩短间隔使其更紧凑
      duration: 0.08, // 更短的持续时间
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.15 },
        { time: 0.06, value: 0.05 },
        { time: 0.08, value: 0.001 }
      ]
    }))
  ],
  effects: [
    {
      type: "filter",
      params: {
        type: "highpass", // 高通滤波器使声音更亮更清晰
        frequency: 800,
        Q: 0.7
      }
    },
    {
      type: "reverb",
      params: {
        duration: 2.25,
        decayRate: 20.5,
      }
    },
  ]
};

export const 播放喇叭式胜利音效 = () => 播放音效(喇叭式胜利音效曲谱);




// 曲谱定义 - 猫叫声
export const 猫叫声曲谱: SoundEffect = {
  name: "猫叫声",
  type: "composite",
  masterVolume: 0.7,
  elements: [
    // 主要猫叫声 - 使用频率滑动来模拟特有的音调变化
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth", // 锯齿波能产生丰富的泛音
      startFrequency: 900,
      endFrequency: 650,
      startTime: 0,
      duration: 0.5,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.6 },
        { time: 0.2, value: 0.5 },
        { time: 0.4, value: 0.3 },
        { time: 0.5, value: 0 }
      ]
    },
    
    // // 第二次叫声 - 猫通常会连叫两声
    // {
    //   type: "frequencyRamp",
    //   oscillatorType: "sawtooth",
    //   startFrequency: 950,
    //   endFrequency: 600,
    //   startTime: 0.7,
    //   duration: 0.6,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.05, value: 0.55 },
    //     { time: 0.25, value: 0.4 },
    //     { time: 0.5, value: 0.2 },
    //     { time: 0.6, value: 0 }
    //   ]
    // },
    
    // 添加颤音效果 - 使猫叫声更加逼真
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 820,
      startTime: 0.02,
      duration: 0.45,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.03, value: 0.3 },
        { time: 0.2, value: 0.25 },
        { time: 0.45, value: 0 }
      ],
      vibrato: {
        frequency: 14,  // 较快的颤音
        depth: 12,      // 深度较大
        startTime: 0.05,
        duration: 0.4
      }
    },
    
    // // 第二次叫声的颤音效果
    // {
    //   type: "tone",
    //   oscillatorType: "triangle",
    //   frequency: 870,
    //   startTime: 0.72,
    //   duration: 0.55,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.03, value: 0.25 },
    //     { time: 0.3, value: 0.2 },
    //     { time: 0.55, value: 0 }
    //   ],
    //   vibrato: {
    //     frequency: 12,
    //     depth: 15,
    //     startTime: 0.05,
    //     duration: 0.45
    //   }
    // },
    
    // 高频部分 - 模拟猫叫声中的尖锐成分
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1800,
      startTime: 0.03,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.15 },
        { time: 0.2, value: 0.1 },
        { time: 0.4, value: 0 }
      ]
    },
    
    // // 第二次叫声的高频部分
    // {
    //   type: "tone",
    //   oscillatorType: "sine",
    //   frequency: 1950,
    //   startTime: 0.73,
    //   duration: 0.5,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.05, value: 0.12 },
    //     { time: 0.3, value: 0.08 },
    //     { time: 0.5, value: 0 }
    //   ]
    // },
    
    // 添加少量噪声 - 模拟猫叫声中的气息成分
    {
      type: "noise",
      startTime: 0.01,
      duration: 0.45,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.1 },
        { time: 0.25, value: 0.06 },
        { time: 0.45, value: 0 }
      ],
      decayRate: 0.2
    },
    
    // // 第二次叫声的噪声成分
    // {
    //   type: "noise",
    //   startTime: 0.71,
    //   duration: 0.55,
    //   gainEnvelope: [
    //     { time: 0, value: 0 },
    //     { time: 0.05, value: 0.08 },
    //     { time: 0.35, value: 0.04 },
    //     { time: 0.55, value: 0 }
    //   ],
    //   decayRate: 0.25
    // },
  ],
  effects: [
    {
      type: "reverb",
      params: {
        duration: 2.25,
        decayRate: 20.5,
      }
    },
    // 带通滤波器突出猫叫声特有的频率范围
    {
      type: "filter",
      params: {
        type: "bandpass",
        frequency: 2600,
        Q: 1.2
      }
    },
    // // 轻微混响模拟空间感
    // {
    //   type: "reverb",
    //   params: {
    //     duration: 0.8,
    //     decayRate: 0.4
    //   }
    // },
  ]
};
export const 播放猫叫声 = () => 播放音效(猫叫声曲谱);

// 曲谱定义 - 男人说话声
export const 男人说话声曲谱: SoundEffect = {
  name: "男人说话声",
  type: "composite",
  masterVolume: 0.8,
  elements: [
    // 基础发声 - 模拟声带振动的基频（男声基频约为85-155Hz）
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth", // 锯齿波富含泛音，更接近人声特性
      startFrequency: 120, // 典型男声基频
      endFrequency: 105, // 略微下降模拟语调变化
      startTime: 0,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.5 },
        { time: 0.2, value: 0.4 },
        { time: 0.3, value: 0 }
      ]
    },
    // 第二个音节
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth",
      startFrequency: 115,
      endFrequency: 125, // 上升模拟问句结尾
      startTime: 0.35,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.55 },
        { time: 0.15, value: 0.45 },
        { time: 0.25, value: 0 }
      ]
    },
    // 第三个音节
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth",
      startFrequency: 130,
      endFrequency: 110,
      startTime: 0.65,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.03, value: 0.6 },
        { time: 0.2, value: 0.4 },
        { time: 0.3, value: 0 }
      ]
    },
    
    // 添加人声共振峰 - 第一共振峰约500-700Hz
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 600,
      startTime: 0,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.1 },
        { time: 0.25, value: 0.08 },
        { time: 0.3, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 650,
      startTime: 0.35,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.12 },
        { time: 0.2, value: 0.08 },
        { time: 0.25, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 580,
      startTime: 0.65,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.03, value: 0.11 },
        { time: 0.25, value: 0.07 },
        { time: 0.3, value: 0 }
      ]
    },
    
    // 第二共振峰约800-1200Hz
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1000,
      startTime: 0,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.07 },
        { time: 0.25, value: 0.05 },
        { time: 0.3, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1100,
      startTime: 0.35,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.08 },
        { time: 0.2, value: 0.06 },
        { time: 0.25, value: 0 }
      ]
    },
    {
      type: "tone", 
      oscillatorType: "sine",
      frequency: 950,
      startTime: 0.65,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.03, value: 0.06 },
        { time: 0.25, value: 0.04 },
        { time: 0.3, value: 0 }
      ]
    },
    
    // 添加气流噪声 - 模拟说话中的辅音部分
    {
      type: "noise",
      startTime: 0.02,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.1 },
        { time: 0.08, value: 0.05 },
        { time: 0.1, value: 0 }
      ],
      decayRate: 0.5
    },
    {
      type: "noise",
      startTime: 0.35,
      duration: 0.08,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.12 },
        { time: 0.06, value: 0.05 },
        { time: 0.08, value: 0 }
      ],
      decayRate: 0.6
    },
    {
      type: "noise",
      startTime: 0.65,
      duration: 0.12,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.11 },
        { time: 0.1, value: 0.04 },
        { time: 0.12, value: 0 }
      ],
      decayRate: 0.5
    },
    
    // 使用小的颤音模拟声带振动的微小变化
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 120,
      startTime: 0,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.2 },
        { time: 0.25, value: 0.15 },
        { time: 0.3, value: 0 }
      ],
      vibrato: {
        frequency: 5.5,  // 男性声带振动频率
        depth: 3,        // 较小的深度
        startTime: 0.01,
        duration: 0.28
      }
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 115,
      startTime: 0.35,
      duration: 0.25,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.22 },
        { time: 0.2, value: 0.16 },
        { time: 0.25, value: 0 }
      ],
      vibrato: {
        frequency: 5.8,
        depth: 4,
        startTime: 0.01,
        duration: 0.23
      }
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 125,
      startTime: 0.65,
      duration: 0.3,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.03, value: 0.25 },
        { time: 0.25, value: 0.15 },
        { time: 0.3, value: 0 }
      ],
      vibrato: {
        frequency: 5.2,
        depth: 3.5,
        startTime: 0.02,
        duration: 0.27
      }
    }
  ],
  // effects: [
  //   // 模拟人声特有的频率响应
  //   {
  //     type: "filter",
  //     params: {
  //       type: "bandpass",
  //       frequency: 800,  // 中心频率在人声范围内
  //       Q: 0.9           // 较宽的通带宽度
  //     }
  //   },
  //   // 添加少量混响模拟口腔共鸣
  //   {
  //     type: "reverb",
  //     params: {
  //       duration: 0.3,   // 短暂的混响
  //       decayRate: 0.6   // 较快的衰减
  //     }
  //   }
  // ]
};
export const 播放男人说话声 = () => 播放音效(男人说话声曲谱);

// 曲谱定义 - 女人说"good"声音
export const 女人说Good声曲谱: SoundEffect = {
  name: "女人说Good声音",
  type: "composite",
  masterVolume: 0.8,
  elements: [
    // 第一个音节 "g" - 模拟声带振动的基频（女声基频约为165-255Hz）
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth", // 锯齿波富含泛音，更接近人声特性
      startFrequency: 210, // 典型女声基频，比男声高
      endFrequency: 195, // 略微下降模拟语调变化
      startTime: 0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.3 },
        { time: 0.08, value: 0.2 },
        { time: 0.1, value: 0 }
      ]
    },
    // 第二个音节 "oo"
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth",
      startFrequency: 200,
      endFrequency: 205,
      startTime: 0.1,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.45 },
        { time: 0.1, value: 0.35 },
        { time: 0.15, value: 0 }
      ]
    },
    // 第三个音节 "d"
    {
      type: "frequencyRamp",
      oscillatorType: "sawtooth",
      startFrequency: 220,
      endFrequency: 180,
      startTime: 0.25,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.4 },
        { time: 0.08, value: 0.2 },
        { time: 0.1, value: 0 }
      ]
    },
    
    // 添加人声共振峰 - 女声第一共振峰约800-1100Hz
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 950, // 女声第一共振峰，高于男声
      startTime: 0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.12 },
        { time: 0.08, value: 0.08 },
        { time: 0.1, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 980,
      startTime: 0.1,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.14 },
        { time: 0.12, value: 0.1 },
        { time: 0.15, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 920,
      startTime: 0.25,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.13 },
        { time: 0.08, value: 0.07 },
        { time: 0.1, value: 0 }
      ]
    },
    
    // 第二共振峰约1500-2000Hz（女声第二共振峰高于男声）
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1700,
      startTime: 0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.09 },
        { time: 0.08, value: 0.05 },
        { time: 0.1, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 1800,
      startTime: 0.1,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.11 },
        { time: 0.12, value: 0.07 },
        { time: 0.15, value: 0 }
      ]
    },
    {
      type: "tone", 
      oscillatorType: "sine",
      frequency: 1650,
      startTime: 0.25,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.08 },
        { time: 0.08, value: 0.04 },
        { time: 0.1, value: 0 }
      ]
    },
    
    // 添加气流噪声 - 模拟辅音 "g" 和 "d"
    {
      type: "noise",
      startTime: 0,
      duration: 0.05,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.12 },
        { time: 0.04, value: 0.04 },
        { time: 0.05, value: 0 }
      ],
      decayRate: 0.6
    },
    {
      type: "noise",
      startTime: 0.25,
      duration: 0.04,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.14 },
        { time: 0.03, value: 0.05 },
        { time: 0.04, value: 0 }
      ],
      decayRate: 0.7
    },
    
    // 使用颤音模拟声带振动的微小变化 - 女性颤音频率略高于男性
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 210,
      startTime: 0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.2 },
        { time: 0.08, value: 0.12 },
        { time: 0.1, value: 0 }
      ],
      vibrato: {
        frequency: 6.8,  // 女性声带振动频率比男性高
        depth: 4,
        startTime: 0.01,
        duration: 0.08
      }
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 205,
      startTime: 0.1,
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.25 },
        { time: 0.12, value: 0.18 },
        { time: 0.15, value: 0 }
      ],
      vibrato: {
        frequency: 7.2,
        depth: 5,
        startTime: 0.01,
        duration: 0.13
      }
    },
    {
      type: "tone",
      oscillatorType: "triangle",
      frequency: 215,
      startTime: 0.25,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.22 },
        { time: 0.08, value: 0.15 },
        { time: 0.1, value: 0 }
      ],
      vibrato: {
        frequency: 7.0,
        depth: 4.5,
        startTime: 0.01,
        duration: 0.08
      }
    }
  ],
  // effects: [
  //   // 模拟女声特有的频率响应 - 中心频率比男声高
  //   {
  //     type: "filter",
  //     params: {
  //       type: "bandpass",
  //       frequency: 1200,  // 中心频率在女声范围内，高于男声
  //       Q: 0.85           // 稍窄的通带宽度
  //     }
  //   },
  //   // 添加少量混响模拟口腔共鸣
  //   {
  //     type: "reverb",
  //     params: {
  //       duration: 0.25,   // 短暂的混响
  //       decayRate: 0.65   // 较快的衰减
  //     }
  //   }
  // ]
};

export const 播放女人说Good声 = () => 播放音效(女人说Good声曲谱);





// 曲谱定义 - 小星星
export const 小星星曲谱: SoundEffect = {
  name: "小星星",
  type: "composite",
  masterVolume: 0.9,
  elements: [
    // 第一小节：C C G G
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 261.63, // C4
      startTime: 0.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 261.63, // C4
      startTime: 0.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 392.00, // G4
      startTime: 1.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 392.00, // G4
      startTime: 1.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    
    // 第二小节：A A G
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 440.00, // A4
      startTime: 2.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 440.00, // A4
      startTime: 2.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 392.00, // G4
      startTime: 3.0,
      duration: 0.8,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.7, value: 0.2 },
        { time: 0.8, value: 0 }
      ]
    },
    
    // 第三小节：F F E E
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 349.23, // F4
      startTime: 4.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 349.23, // F4
      startTime: 4.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 329.63, // E4
      startTime: 5.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 329.63, // E4
      startTime: 5.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    
    // 第四小节：D D C
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 293.66, // D4
      startTime: 6.0,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 293.66, // D4
      startTime: 6.5,
      duration: 0.4,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.35, value: 0.2 },
        { time: 0.4, value: 0 }
      ]
    },
    {
      type: "tone",
      oscillatorType: "sine",
      frequency: 261.63, // C4
      startTime: 7.0,
      duration: 0.8,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.05, value: 0.4 },
        { time: 0.7, value: 0.2 },
        { time: 0.8, value: 0 }
      ]
    }
  ],
  effects: [
    {
      type: "filter",
      params: {
        type: "lowpass",
        frequency: 3000,
        Q: 1
      }
    },
    {
      type: "reverb",
      params: {
        duration: 0.5,
        decayRate: 0.2
      }
    }
  ]
};

// 添加播放小星星的函数
export const 播放小星星 = () => 播放音效(小星星曲谱);



// ...existing code...

// 曲谱定义 - 电子舞曲
export const 电子舞曲曲谱: SoundEffect = {
  name: "电子舞曲",
  type: "composite",
  masterVolume: 0.8,
  elements: [
    // 低音鼓（Kick）
    ...Array.from({ length: 8 }, (_, i) => ({
      type: "frequencyRamp" as const,
      oscillatorType: "sine" as const,
      startFrequency: 120,
      endFrequency: 30,
      startTime: i * 0.5, // 每半拍一次，总共4拍
      duration: 0.15,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.8 },
        { time: 0.05, value: 0.3 },
        { time: 0.15, value: 0 }
      ]
    })),
    
    // 高帽（Hi-hat）
    ...Array.from({ length: 16 }, (_, i) => ({
      type: "noise" as const,
      startTime: i * 0.25, // 每四分之一拍一次
      duration: 0.05,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: i % 2 === 0 ? 0.2 : 0.07 }, // 强拍大声，弱拍小声
        { time: 0.05, value: 0 }
      ],
      decayRate: 0.8
    })),
    
    // 贝斯线（Bass line）- 循环的四音模式
    ...Array.from({ length: 4 }, (_, i) => [
      // 每组包含两个音符，形成律动感
      {
        type: "tone" as const,
        oscillatorType: "sawtooth" as const,
        frequency: [98, 110, 98, 123][i], // A2, A#2, A2, B2 的贝斯线
        startTime: i * 1.0,
        duration: 0.4,
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.05, value: 0.45 },
          { time: 0.2, value: 0.2 },
          { time: 0.4, value: 0 }
        ]
      },
      {
        type: "tone" as const,
        oscillatorType: "sawtooth" as const,
        frequency: [98, 110, 98, 123][i], // 重复相同音符
        startTime: i * 1.0 + 0.5,
        duration: 0.3,
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.05, value: 0.3 },
          { time: 0.2, value: 0.1 },
          { time: 0.3, value: 0 }
        ]
      }
    ]).flat(),
    
    // 旋律Arpeggio部分 - 在高八度上的律动琶音
    ...Array.from({ length: 16 }, (_, i) => ({
      type: "tone" as const,
      oscillatorType: "square" as const,
      frequency: [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33][i % 8], // C5, D5, E5, G5, A5, G5, E5, D5
      startTime: i * 0.25,
      duration: 0.2,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.02, value: 0.15 },
        { time: 0.18, value: 0.05 },
        { time: 0.2, value: 0 }
      ]
    })),
    
    // 合成长音垫 - 提供背景氛围
    {
      type: "tone" as const,
      oscillatorType: "sine" as const,
      frequency: 220.00, // A3
      startTime: 0,
      duration: 4.0,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.5, value: 0.1 },
        { time: 3.5, value: 0.1 },
        { time: 4.0, value: 0 }
      ]
    },
    {
      type: "tone" as const,
      oscillatorType: "sine" as const,
      frequency: 277.18, // C#4
      startTime: 0,
      duration: 4.0,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.5, value: 0.08 },
        { time: 3.5, value: 0.08 },
        { time: 4.0, value: 0 }
      ]
    },
    {
      type: "tone" as const,
      oscillatorType: "sine" as const,
      frequency: 329.63, // E4
      startTime: 0,
      duration: 4.0,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.5, value: 0.06 },
        { time: 3.5, value: 0.06 },
        { time: 4.0, value: 0 }
      ]
    },
    
    // 合成打击乐 - 在第2和第4拍增加动感
    {
      type: "noise" as const, 
      startTime: 1.0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.3 },
        { time: 0.1, value: 0 }
      ],
      decayRate: 0.5
    },
    {
      type: "noise" as const,
      startTime: 3.0,
      duration: 0.1,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.01, value: 0.3 },
        { time: 0.1, value: 0 }
      ],
      decayRate: 0.5
    }
  ],
  effects: [
    {
      type: "filter",
      params: {
        type: "lowpass",
        frequency: 5000,
        Q: 1
      }
    },
    {
      type: "reverb",
      params: {
        duration: 1.5,
        decayRate: 0.2
      }
    }
  ]
};

// 添加播放电子舞曲的函数
export const 播放电子舞曲 = () => 播放音效(电子舞曲曲谱);



// ...existing code...

// 随机曲谱生成器函数
export function 生成随机曲谱(长度: number = 8): SoundEffect {
  // console.log({长度});
  // 定义常用的音符频率 (C大调音阶)
  const 音符频率表 = [
    261.63,  // C4
    293.66,  // D4
    329.63,  // E4
    349.23,  // F4
    392.00,  // G4
    440.00,  // A4
    493.88,  // B4
    523.25,  // C5
    587.33,  // D5
    659.25,  // E5
    698.46,  // F5
    783.99   // G5
  ];
  
  // 定义可能的振荡器类型
  const 振荡器类型: OscillatorType[] = ["sine", "square", "triangle", "sawtooth"];
  
  // 随机选择函数
  const 随机选择 = <T>(数组: T[]): T => 数组[Math.floor(Math.random() * 数组.length)];
  const 随机数 = (最小值: number, 最大值: number): number => {
    const 结果 = 最小值 + Math.random() * (最大值 - 最小值);
    const rrr = isFinite(结果) ? 结果 : (最小值 + 最大值) / 2; // 如果结果不是有限数，返回范围的中间值
    // console.log('随机数:', { 最小值, 最大值, 结果, rrr });
    return rrr;
  };
  
  // 生成音符元素
  const 生成元素 = (): SoundEffectElement[] => {
    const 音符元素: SoundEffectElement[] = [];
    
    // 旋律部分 - 创建主要的音符
    for (let i = 0; i < 长度; i++) {
      // 70%概率是音符，30%概率是休止符
      if (Math.random() < 0.7) {
        音符元素.push({
          type: "tone",
          oscillatorType: 随机选择(振荡器类型),
          frequency: 随机选择(音符频率表),
          startTime: i * 0.5,
          duration: 随机数(0.2, 0.4),
          gainEnvelope: [
            { time: 0, value: 0 },
            { time: 0.05, value: 随机数(0.2, 0.5) },
            { time: 0.3, value: 0.1 },
            { time: 0.4, value: 0 }
          ],
          // 20%概率添加颤音效果
          ...(Math.random() < 0.2 ? {
            vibrato: {
              frequency: 随机数(4, 8),
              depth: 随机数(3, 10),
              startTime: 0.1,
              duration: 0.3
            }
          } : {})
        });
      }
    }
    
    // 和弦部分 - 随机添加背景和弦
    if (Math.random() < 0.6) {
      const 基础频率 = 随机选择(音符频率表.slice(0, 5)); // 选择较低音区作为和弦基础
      const 和弦开始时间 = Math.floor(随机数(0, 长度/2)) * 0.5;
      const 和弦持续时间 = 随机数(1.5, 长度 * 0.5);
      
      // 添加和弦的基本音
      音符元素.push({
        type: "tone",
        oscillatorType: "sine",
        frequency: 基础频率,
        startTime: 和弦开始时间,
        duration: 和弦持续时间,
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.3, value: 0.15 },
          { time: 和弦持续时间 - 0.5, value: 0.15 },
          { time: 和弦持续时间, value: 0 }
        ]
      });
      
      // 添加和弦的三度音
      音符元素.push({
        type: "tone",
        oscillatorType: "sine",
        frequency: 基础频率 * 1.26, // 大约是大三度
        startTime: 和弦开始时间,
        duration: 和弦持续时间,
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.3, value: 0.12 },
          { time: 和弦持续时间 - 0.5, value: 0.12 },
          { time: 和弦持续时间, value: 0 }
        ]
      });
      
      // 添加和弦的五度音
      音符元素.push({
        type: "tone",
        oscillatorType: "sine",
        frequency: 基础频率 * 1.5, // 完全五度
        startTime: 和弦开始时间,
        duration: 和弦持续时间,
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.3, value: 0.1 },
          { time: 和弦持续时间 - 0.5, value: 0.1 },
          { time: 和弦持续时间, value: 0 }
        ]
      });
    }
    
    // 40%概率添加打击乐元素
    if (Math.random() < 0.4) {
      // 添加数个打击乐元素
      for (let i = 0; i < 长度; i += 2) {
        音符元素.push({
          type: "noise",
          startTime: i * 0.5,
          duration: 0.1,
          gainEnvelope: [
            { time: 0, value: 0 },
            { time: 0.01, value: 0.2 },
            { time: 0.1, value: 0 }
          ],
          decayRate: 0.5
        });
      }
    }
    
    // 30%概率添加频率滑变音效
    if (Math.random() < 0.3) {
      音符元素.push({
        type: "frequencyRamp",
        oscillatorType: 随机选择(振荡器类型),
        startFrequency: 随机数(400, 800),
        endFrequency: 随机数(200, 600),
        startTime: 随机数(0, 长度 * 0.3) * 0.5,
        duration: 随机数(0.8, 1.5),
        gainEnvelope: [
          { time: 0, value: 0 },
          { time: 0.1, value: 0.2 },
          { time: 0.7, value: 0.1 },
          { time: 1.0, value: 0 }
        ]
      });
    }
    
    return 音符元素;
  };
  
  // 随机选择音效处理
  const 生成音效处理 = (): SoundEffectProcessing[] => {
    const 音效处理: SoundEffectProcessing[] = [];
    
    // 70%概率添加滤波器
    if (Math.random() < 0.7) {
      const 滤波器类型: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
      音效处理.push({
        type: "filter",
        params: {
          type: 随机选择(滤波器类型),
          frequency: 随机数(500, 5000),
          Q: 随机数(0.5, 3)
        }
      });
    }
    
    // 60%概率添加混响
    if (Math.random() < 0.6) {
      音效处理.push({
        type: "reverb",
        params: {
          duration: 随机数(0.5, 2.5),
          decayRate: 随机数(0.1, 0.4)
        }
      });
    }
    
    return 音效处理;
  };
  
  // 组装随机曲谱
  return {
    name: "随机曲谱",
    type: "composite",
    masterVolume: 随机数(0.7, 1.0),
    elements: 生成元素(),
    effects: 生成音效处理()
  };
}

// 添加播放随机曲谱的函数
export const 播放随机曲谱 = (长度: number = 8) => {
  const 随机曲谱 = 生成随机曲谱(长度);
  播放音效(随机曲谱);
  return 随机曲谱; // 返回生成的曲谱，便于检查或重复使用
};



