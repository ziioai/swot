

// 星际旅行音乐数据类型和播放器实现

// 基本音符类型
interface Note {
  freq: number;      // 频率 (Hz)
  time: number;      // 开始时间 (秒)
  duration: number;  // 持续时间 (秒)
  type?: OscillatorType; // 波形类型
  gain?: number;     // 音量 (0-1)
  vibrato?: {        // 颤音参数
    freq: number;    // 颤音频率
    depth: number;   // 颤音深度
  };
}

// 和弦音符类型
interface ChordNote {
  freq: number;         // 频率 (Hz)
  ratio?: number;       // 相对音量比例
  type?: OscillatorType; // 波形类型
}

// 氛围层类型
interface AmbientLayer {
  baseFreq: number;        // 基础频率
  harmonics: number[];     // 泛音序列
  oscillatorTypes: OscillatorType[]; // 每个泛音的波形类型
  gainValues: number[];    // 每个泛音的音量
  lfoFreqs?: number[];     // 每个泛音的LFO频率
  lfoDepths?: number[];    // 每个泛音的LFO深度
}

// 噪声配置
interface NoiseConfig {
  type: 'white' | 'filtered';
  filterType?: BiquadFilterType;
  filterFreq?: number;
  filterQ?: number;
  gain: number;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

// 音效曲谱类型
interface SoundScore {
  masterGain?: number;           // 主音量
  reverb?: {                    // 混响参数
    time: number;
    decayRate: number;
  };
  delay?: {                     // 延迟参数
    time: number;
    feedback: number;
  };
  notes?: Note[];               // 旋律音符
  chords?: {                    // 和弦
    time: number;               // 开始时间
    duration: number;           // 持续时间
    notes: ChordNote[];         // 和弦音符
  }[];
  ambientLayers?: AmbientLayer[]; // 氛围层
  noiseEffects?: {               // 噪声效果
    config: NoiseConfig;
    duration: number;
    timeOffset?: number;
  }[];
  randomEffects?: {              // 随机效果
    interval: number;           // 平均间隔时间 (ms)
    probability: number;        // 触发概率 (0-1)
    generator: () => Note[];     // 效果生成器
  }[];
}







// 音频播放器类
class AudioPlayer {
  private static instance: AudioPlayer | null = null;
  private audioContext: AudioContext | null = null;
  private activeNodes: {
    oscillators: OscillatorNode[];
    gainNodes: GainNode[];
    filters: BiquadFilterNode[];
    lfoNodes: OscillatorNode[];
    bufferSources: AudioBufferSourceNode[];
    masterGain?: GainNode;
    convolver?: ConvolverNode;
    delay?: DelayNode;
  };
  private timers: number[] = [];
  private isPlaying: boolean = false;
  // private currentScore: SoundScore | null = null;

  private constructor() {
    this.activeNodes = {
      oscillators: [],
      gainNodes: [],
      filters: [],
      lfoNodes: [],
      bufferSources: []
    };
  }

  // 获取单例实例
  public static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  // 播放音频曲谱
  public play(score: SoundScore): void {
    if (this.isPlaying) {
      this.stop();
    }
  
    // this.currentScore = score;
    this.isPlaying = true;
    this.audioContext = new AudioContext();
  
    // 创建主增益节点
    const masterGain = this.audioContext.createGain();
    masterGain.gain.value = score.masterGain || 0.7;
    masterGain.connect(this.audioContext.destination);
    this.activeNodes.masterGain = masterGain;
  
    // 创建混响效果
    if (score.reverb) {
      const convolver = this.createReverb(score.reverb.time, score.reverb.decayRate);
      convolver.connect(masterGain);
      this.activeNodes.convolver = convolver;
    }
  
    // 创建延迟效果
    if (score.delay) {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = score.delay.time;
      
      const delayFeedback = this.audioContext.createGain();
      delayFeedback.gain.value = score.delay.feedback;
      
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(masterGain);
      
      this.activeNodes.delay = delay;
    }
  
    // 播放旋律音符
    if (score.notes) {
      this.playNotes(score.notes);
    }
  
    // 播放和弦
    if (score.chords) {
      this.playChords(score.chords);
    }
  
    // 创建氛围层 - 这个立即开始产生声音
    if (score.ambientLayers) {
      this.createAmbientLayers(score.ambientLayers);
    }
  
    // 创建噪声效果 - 这个也立即开始产生声音
    if (score.noiseEffects) {
      this.createNoiseEffects(score.noiseEffects);
    }
  
    // 立即播放一个初始音效，确保有立即的声音反馈
    if (score.randomEffects && score.randomEffects.length > 0) {
      // 立即播放一个随机效果
      const initialEffects = score.randomEffects[0].generator();
      this.playNotes(initialEffects);
      
      // 再安排几个连续的效果，确保开始有足够的声音
      setTimeout(() => {
        if (this.isPlaying && score.randomEffects) {
          const moreEffects = score.randomEffects[0].generator();
          this.playNotes(moreEffects);
        }
      }, 700);
      
      setTimeout(() => {
        if (this.isPlaying && score.randomEffects) {
          const moreEffects = score.randomEffects[0].generator();
          this.playNotes(moreEffects);
        }
      }, 1500);
    }
  
    // 设置随机效果定时器
    if (score.randomEffects) {
      this.setupRandomEffects(score.randomEffects);
    }
  
    // 渐入音量，但是更快些
    if (masterGain) {
      masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      masterGain.gain.linearRampToValueAtTime(score.masterGain || 0.7, this.audioContext.currentTime + 0.5); // 更快的淡入
    }
  }

  // 停止播放
  public stop(): void {
    if (!this.isPlaying || !this.audioContext) return;

    // 渐出音量
    if (this.activeNodes.masterGain) {
      const currentGain = this.activeNodes.masterGain.gain.value;
      this.activeNodes.masterGain.gain.setValueAtTime(currentGain, this.audioContext.currentTime);
      this.activeNodes.masterGain.gain.linearRampToValueAtTime(0.001, this.audioContext.currentTime + 2);
    }

    // 清除所有定时器
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];

    // 2秒后停止所有声音
    const timer = setTimeout(() => {
      this.stopAllNodes();
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
      this.isPlaying = false;
    }, 2000);

    this.timers.push(timer);
  }

  // 是否正在播放
  public isActive(): boolean {
    return this.isPlaying;
  }

  // 停止所有音频节点
  private stopAllNodes(): void {
    // 停止所有振荡器
    this.activeNodes.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // 忽略已停止的节点
        console.error("Error stopping oscillator:", e);
      }
    });

    // 停止所有缓冲源
    this.activeNodes.bufferSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // 忽略已停止的节点
        console.error("Error stopping buffer source:", e);
      }
    });

    // 断开所有其他节点
    this.activeNodes.gainNodes.forEach(node => {
      try { node.disconnect(); } catch (e) {
        console.error("Error disconnecting gain node:", e);
      }
    });
    this.activeNodes.filters.forEach(node => {
      try { node.disconnect(); } catch (e) {
        console.error("Error disconnecting filter node:", e);
      }
    });
    this.activeNodes.lfoNodes.forEach(node => {
      try { 
        node.stop();
        node.disconnect(); 
      } catch (e) {
        console.error("Error stopping LFO node:", e);
      }
    });

    // 重置节点列表
    this.activeNodes = {
      oscillators: [],
      gainNodes: [],
      filters: [],
      lfoNodes: [],
      bufferSources: []
    };
  }

  // 创建混响效果
  private createReverb(reverbTime: number, decayRate: number): ConvolverNode {
    if (!this.audioContext) throw new Error("AudioContext not initialized");
    
    const convolver = this.audioContext.createConvolver();
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * reverbTime;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const impulseData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate);
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  // 播放音符序列
  private playNotes(notes: Note[]): void {
    if (!this.audioContext || !this.activeNodes.masterGain) return;
    
    const destination = this.activeNodes.convolver || this.activeNodes.masterGain;
    
    notes.forEach(note => {
      const oscillator = this.audioContext!.createOscillator();
      oscillator.type = note.type || "sine";
      oscillator.frequency.value = note.freq;
      
      const noteGain = this.audioContext!.createGain();
      noteGain.gain.value = 0;
      
      oscillator.connect(noteGain);
      noteGain.connect(destination);
      
      // 如果有直连主增益，保留部分干声
      if (this.activeNodes.convolver && this.activeNodes.masterGain) {
        noteGain.connect(this.activeNodes.masterGain);
      }
      
      // Near line 683, where startTime is first calculated
      const startTime = Math.max(0, this.audioContext!.currentTime + note.time);
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(note.gain || 0.3, startTime + 0.02);
      
      // 设置颤音
      if (note.vibrato) {
        const vibrato = this.audioContext!.createOscillator();
        vibrato.type = "sine";
        vibrato.frequency.value = note.vibrato.freq;
        
        const vibratoGain = this.audioContext!.createGain();
        vibratoGain.gain.value = note.vibrato.depth;
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(oscillator.frequency);
        
        vibrato.start(startTime);
        vibrato.stop(startTime + note.duration);
        
        this.activeNodes.lfoNodes.push(vibrato);
      }
      
      // 淡出
      const fadeOutStartTime = Math.max(0, startTime + note.duration - 0.05);
      const fadeOutEndTime = Math.max(fadeOutStartTime + 0.01, startTime + note.duration);

      noteGain.gain.setValueAtTime(note.gain || 0.3, fadeOutStartTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, fadeOutEndTime);

      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration + 0.1);
      
      this.activeNodes.oscillators.push(oscillator);
      this.activeNodes.gainNodes.push(noteGain);
    });
  }

  // 播放和弦
  private playChords(chords: { time: number; duration: number; notes: ChordNote[] }[]): void {
    if (!this.audioContext || !this.activeNodes.masterGain) return;
    
    const destination = this.activeNodes.convolver || this.activeNodes.masterGain;
    
    chords.forEach(chord => {
      const chordTime = this.audioContext!.currentTime + chord.time;
      
      chord.notes.forEach(chordNote => {
        const chordOsc = this.audioContext!.createOscillator();
        chordOsc.type = chordNote.type || "triangle";
        chordOsc.frequency.value = chordNote.freq;
        
        const chordGain = this.audioContext!.createGain();
        chordGain.gain.value = 0;
        
        chordOsc.connect(chordGain);
        chordGain.connect(destination);
        
        // 设置音量包络
        chordGain.gain.setValueAtTime(0, chordTime);
        chordGain.gain.linearRampToValueAtTime(0.2 * (chordNote.ratio || 1.0), chordTime + 0.1);
        chordGain.gain.setValueAtTime(0.2 * (chordNote.ratio || 1.0), chordTime + chord.duration - 0.4);
        chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + chord.duration);
        
        chordOsc.start(chordTime);
        chordOsc.stop(chordTime + chord.duration + 0.1);
        
        this.activeNodes.oscillators.push(chordOsc);
        this.activeNodes.gainNodes.push(chordGain);
      });
    });
  }

  // 创建氛围层
  private createAmbientLayers(layers: AmbientLayer[]): void {
    if (!this.audioContext || !this.activeNodes.masterGain) return;
    
    const destination = this.activeNodes.convolver || this.activeNodes.masterGain;
    
    layers.forEach(layer => {
      layer.harmonics.forEach((harmonic, index) => {
        if (index >= layer.oscillatorTypes.length || index >= layer.gainValues.length) return;
        
        const oscGain = this.audioContext!.createGain();
        oscGain.gain.value = layer.gainValues[index];
        oscGain.connect(destination);
        
        // 创建LFO
        if (layer.lfoFreqs && layer.lfoDepths && index < layer.lfoFreqs.length && index < layer.lfoDepths.length) {
          const lfo = this.audioContext!.createOscillator();
          lfo.type = "sine";
          lfo.frequency.value = layer.lfoFreqs[index];
          
          const lfoGain = this.audioContext!.createGain();
          lfoGain.gain.value = layer.lfoDepths[index];
          
          lfo.connect(lfoGain);
          lfoGain.connect(oscGain.gain);
          
          lfo.start();
          this.activeNodes.lfoNodes.push(lfo);
          this.activeNodes.gainNodes.push(lfoGain);
        }
        
        // 创建振荡器
        const osc = this.audioContext!.createOscillator();
        osc.type = layer.oscillatorTypes[index];
        osc.frequency.value = layer.baseFreq * harmonic;
        osc.connect(oscGain);
        
        osc.start();
        
        this.activeNodes.oscillators.push(osc);
        this.activeNodes.gainNodes.push(oscGain);
      });
    });
  }

  // 创建噪声效果
  private createNoiseEffects(noiseEffects: { config: NoiseConfig; duration: number; timeOffset?: number }[]): void {
    if (!this.audioContext || !this.activeNodes.masterGain) return;
    
    const destination = this.activeNodes.convolver || this.activeNodes.masterGain;
    
    noiseEffects.forEach(effect => {
      const startTime = this.audioContext!.currentTime + (effect.timeOffset || 0);
      
      // 创建噪声
      const bufferSize = this.audioContext!.sampleRate * (effect.duration === -1 ? 2 : effect.duration);
      const noiseBuffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      
      // 填充噪声数据
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      // 创建噪声源
      const noiseSource = this.audioContext!.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      if (effect.duration === -1) {
        noiseSource.loop = true;
      }
      
      // 创建滤波器（如果需要）
      if (effect.config.type === 'filtered' && effect.config.filterType) {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = effect.config.filterType;
        if (effect.config.filterFreq) filter.frequency.value = effect.config.filterFreq;
        if (effect.config.filterQ) filter.Q.value = effect.config.filterQ;
        
        const noiseGain = this.audioContext!.createGain();
        noiseGain.gain.value = effect.config.gain;
        
        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(destination);
        
        // 设置音量包络
        const env = effect.config.envelope;
        noiseGain.gain.setValueAtTime(0, startTime);
        noiseGain.gain.linearRampToValueAtTime(effect.config.gain, startTime + env.attack);
        noiseGain.gain.linearRampToValueAtTime(effect.config.gain * env.sustain, startTime + env.attack + env.decay);
        
        if (effect.duration !== -1) {
          noiseGain.gain.setValueAtTime(
            effect.config.gain * env.sustain,
            startTime + effect.duration - env.release
          );
          noiseGain.gain.linearRampToValueAtTime(0, startTime + effect.duration);
        }
        
        this.activeNodes.filters.push(filter);
        this.activeNodes.gainNodes.push(noiseGain);
      } else {
        // 直接连接噪声和增益
        const noiseGain = this.audioContext!.createGain();
        noiseGain.gain.value = effect.config.gain;
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(destination);
        
        this.activeNodes.gainNodes.push(noiseGain);
      }
      
      noiseSource.start(startTime);
      if (effect.duration !== -1) {
        noiseSource.stop(startTime + effect.duration);
      }
      
      this.activeNodes.bufferSources.push(noiseSource);
    });
  }

  // 设置随机效果
  private setupRandomEffects(randomEffects: { interval: number; probability: number; generator: () => Note[] }[]): void {
    if (!this.audioContext) return;
    
    randomEffects.forEach(effect => {
      const scheduleNext = () => {
        if (!this.isPlaying) return;
        
        const timer = setTimeout(() => {
          if (Math.random() <= effect.probability && this.isPlaying) {
            const notes = effect.generator();
            this.playNotes(notes);
          }
          scheduleNext();
        }, effect.interval * (0.5 + Math.random()));
        
        this.timers.push(timer);
      };
      
      scheduleNext();
    });
  }
}








// 星际旅行背景音乐曲谱
const 星际旅行背景音乐曲谱: SoundScore = {
  masterGain: 0.75,
  reverb: {
    time: 5,
    decayRate: 0.1
  },
  delay: {
    time: 0.4,
    feedback: 0.2
  },
  ambientLayers: [
    {
      baseFreq: 65.41, // C2
      harmonics: [1, 1.5, 2, 2.5, 3],
      oscillatorTypes: ['sine', 'triangle', 'sine', 'triangle', 'sine'],
      gainValues: [0.08, 0.05, 0.04, 0.03, 0.02],
      lfoFreqs: [0.05, 0.08, 0.11, 0.14, 0.17],
      lfoDepths: [0.05, 0.05, 0.05, 0.05, 0.05]
    }
  ],
  noiseEffects: [
    {
      config: {
        type: 'filtered',
        filterType: 'lowpass',
        filterFreq: 120,
        filterQ: 10,
        gain: 0.15,
        envelope: {
          attack: 0.1,
          decay: 0.1,
          sustain: 1.0,
          release: 0.5
        }
      },
      duration: -1, // -1表示持续播放
    }
  ],
  randomEffects: [
    {
      interval: 5000,
      probability: 0.2,
      generator: () => {
        // 生成随机信号音效
        if (Math.random() > 0.5) {
          // 扫频信号（雷达信号）
          const startFreq = 2000 + Math.random() * 3000;
          return [{
            freq: startFreq,
            time: 0,
            duration: 1.5,
            type: 'sine',
            gain: 0.1, // 增加音量
          }];
        } else {
          // 脉冲信号（通信信号）
          const baseFreq = 1500 + Math.random() * 1000;
          const pulseCount = 2 + Math.floor(Math.random() * 4);
          const notes: Note[] = [];
          
          for (let i = 0; i < pulseCount; i++) {
            notes.push({
              freq: baseFreq,
              time: i * (0.1 + Math.random() * 0.2),
              duration: 0.04,
              type: 'square',
              gain: 0.06 // 增加音量
            });
          }
          
          return notes;
        }
      }
    }
  ]
};




// 播放器控制函数
export const 星际旅行背景音乐 = {
  开始: (): void => {
    const player = AudioPlayer.getInstance();
    player.play(星际旅行背景音乐曲谱);
  },
  停止: (): void => {
    const player = AudioPlayer.getInstance();
    player.stop();
  },
  正在播放: (): boolean => {
    const player = AudioPlayer.getInstance();
    return player.isActive();
  }
};

export const 播放星际旅行音乐 = (): void => {
  try {
    // 检查是否已有正在播放的音乐
    const playerInstance = AudioPlayer.getInstance();
    if (playerInstance.isActive()) {
      // 如果已经在播放，则不重复播放
      console.log("星际旅行音乐已在播放中");
      return;
    }

    // 播放音乐
    星际旅行背景音乐.开始();
    console.log("开始播放星际旅行背景音乐");
  } catch (error) {
    console.error("播放星际旅行背景音乐时出错:", error);
  }
};

export const 停止星际旅行音乐 = (): void => {
  try {
    星际旅行背景音乐.停止();
    console.log("已停止播放星际旅行背景音乐");
  } catch (error) {
    console.error("停止星际旅行背景音乐时出错:", error);
  }
};








// 森林动物历险记背景音乐曲谱
const 森林动物历险记背景音乐曲谱: SoundScore = {
  masterGain: 0.7,
  reverb: {
    time: 3,
    decayRate: 0.2
  },
  delay: {
    time: 0.3,
    feedback: 0.15
  },
  ambientLayers: [
    {
      // 森林低频基底层
      baseFreq: 146.83, // D3
      harmonics: [1, 1.5, 2, 3, 3.5],
      oscillatorTypes: ['triangle', 'sine', 'triangle', 'sine', 'triangle'],
      gainValues: [0.06, 0.04, 0.05, 0.03, 0.02],
      lfoFreqs: [0.1, 0.13, 0.08, 0.15, 0.12],
      lfoDepths: [0.03, 0.04, 0.03, 0.02, 0.03]
    },
    {
      // 明亮的上层风声
      baseFreq: 587.33, // D5
      harmonics: [1, 1.2, 1.5, 2],
      oscillatorTypes: ['sine', 'sine', 'triangle', 'sine'],
      gainValues: [0.03, 0.02, 0.01, 0.01],
      lfoFreqs: [0.2, 0.3, 0.25, 0.4],
      lfoDepths: [0.1, 0.08, 0.12, 0.09]
    }
  ],
  noiseEffects: [
    {
      // 柔和的树叶沙沙声
      config: {
        type: 'filtered',
        filterType: 'bandpass',
        filterFreq: 3000,
        filterQ: 1.5,
        gain: 0.08,
        envelope: {
          attack: 0.2,
          decay: 0.3,
          sustain: 0.8,
          release: 0.5
        }
      },
      duration: -1, // 持续播放
    },
    {
      // 微风吹过的效果
      config: {
        type: 'filtered',
        filterType: 'highpass',
        filterFreq: 5000,
        filterQ: 2,
        gain: 0.05,
        envelope: {
          attack: 2,
          decay: 1,
          sustain: 0.6,
          release: 3
        }
      },
      duration: -1,
      timeOffset: 1.5 // 错开开始时间
    }
  ],
  notes: [
    // 主旋律动机（偶尔播放的森林主题）
    { freq: 392.00, time: 0.0, duration: 0.3, type: 'sine', gain: 0.2 },  // G4
    { freq: 440.00, time: 0.4, duration: 0.2, type: 'sine', gain: 0.2 },  // A4
    { freq: 493.88, time: 0.7, duration: 0.4, type: 'sine', gain: 0.2 },  // B4
    { freq: 587.33, time: 1.2, duration: 0.8, type: 'sine', gain: 0.2 },  // D5
  ],
  randomEffects: [
    {
      // 鸟类叫声
      interval: 8000,
      probability: 0.3,
      generator: () => {
        const birdType = Math.floor(Math.random() * 3); // 3种不同的鸟叫
        
        switch(birdType) {
          case 0: // 欢快的小鸟
            return [
              { freq: 1800 + Math.random() * 400, time: 0, duration: 0.08, type: 'sine', gain: 0.15 },
              { freq: 2000 + Math.random() * 400, time: 0.1, duration: 0.06, type: 'sine', gain: 0.15 },
              { freq: 1800 + Math.random() * 400, time: 0.2, duration: 0.1, type: 'sine', gain: 0.15 }
            ];
            
          case 1: { // 啁啾鸟
            const baseFreq = 1200 + Math.random() * 600;
            const notes: Note[] = [];
            const noteCount = 4 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < noteCount; i++) {
              const freqVariation = baseFreq * (0.9 + Math.random() * 0.2);
              notes.push({
                freq: freqVariation,
                time: i * 0.12,
                duration: 0.1,
                type: 'sine',
                gain: 0.12
              });
            }
            return notes;
          }
            
          case 2: // 猫头鹰
            return [
              { 
                freq: 500 + Math.random() * 200, 
                time: 0, 
                duration: 0.8, 
                type: 'sine', 
                gain: 0.10,
                vibrato: {
                  freq: 8,
                  depth: 20
                }
              }
            ];

          default:
            return [];
        }
      }
    },
    {
      // 动物声音和步伐
      interval: 12000,
      probability: 0.25,
      generator: () => {
        const animalSound = Math.floor(Math.random() * 3);
        
        switch(animalSound) {
          case 0: { // 松鼠/小动物跑动
            const steps: Note[] = [];
            const stepCount = 3 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < stepCount; i++) {
              steps.push({
                freq: 180 + Math.random() * 50,
                time: i * 0.15,
                duration: 0.05,
                type: 'triangle',
                gain: 0.12
              });
            }
            return steps;
          }
            
          case 1: // 远处的狼嚎
            return [{
              freq: 350 + Math.random() * 100,
              time: 0,
              duration: 1.5,
              type: 'triangle',
              gain: 0.08,
              vibrato: {
                freq: 4,
                depth: 30
              }
            }];
            
          case 2: // 树枝断裂
            return [{
              freq: 300,
              time: 0,
              duration: 0.15,
              type: 'sawtooth',
              gain: 0.13
            }, {
              freq: 200,
              time: 0.1,
              duration: 0.2,
              type: 'sawtooth',
              gain: 0.17
            }];

          default:
            return [];
        }
      }
    },
    {
      // 溪流声和环境效果
      interval: 15000,
      probability: 0.2,
      generator: () => {
        const effectType = Math.floor(Math.random() * 2);
        
        switch(effectType) {
          case 0: { // 溪流流水声
            const bubbles: Note[] = [];
            const bubbleCount = 5 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < bubbleCount; i++) {
              bubbles.push({
                freq: 1000 + Math.random() * 2000,
                time: i * (0.05 + Math.random() * 0.2),
                duration: 0.05 + Math.random() * 0.1,
                type: 'sine',
                gain: 0.04 + Math.random() * 0.03
              });
            }
            return bubbles;
          }
            
          case 1: // 微风吹过树叶声
            return [{
              freq: 4000 + Math.random() * 2000,
              time: 0,
              duration: 2.0 + Math.random() * 1.0,
              type: 'sine',
              gain: 0.04,
              vibrato: {
                freq: 0.5 + Math.random() * 1,
                depth: 100 + Math.random() * 100
              }
            }];

          // 其他
          default:
            return [];
        }
      }
    }
  ],
  chords: [
    {
      // 神秘森林和弦
      time: 5, // 开始于5秒后
      duration: 8,
      notes: [
        { freq: 196.00, ratio: 1.0, type: 'triangle' }, // G3
        { freq: 293.66, ratio: 0.7, type: 'sine' },     // D4
        { freq: 392.00, ratio: 0.5, type: 'triangle' }  // G4
      ]
    },
    {
      // 第二个和弦转换
      time: 15, // 15秒后
      duration: 7,
      notes: [
        { freq: 220.00, ratio: 1.0, type: 'triangle' }, // A3
        { freq: 293.66, ratio: 0.6, type: 'sine' },     // D4
        { freq: 349.23, ratio: 0.5, type: 'triangle' }, // F4
        { freq: 440.00, ratio: 0.4, type: 'sine' }      // A4
      ]
    }
  ]
};
export const 播放森林动物历险记背景音乐 = (): void => {
  console.log("hello");
  try {
    // 检查是否已有正在播放的音乐
    const playerInstance = AudioPlayer.getInstance();
    if (playerInstance.isActive()) {
      // 如果已经在播放，则不重复播放
      console.log("森林动物历险记背景音乐已在播放中");
      return;
    }

    // 播放音乐
    const player = AudioPlayer.getInstance();
    player.play(森林动物历险记背景音乐曲谱);
    console.log("开始播放森林动物历险记背景音乐");
  } catch (error) {
    console.error("播放森林动物历险记背景音乐时出错:", error);
  }
}



