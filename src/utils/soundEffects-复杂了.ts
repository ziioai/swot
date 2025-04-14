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
      gainNode.gain.linearRampToValueAtTime(point.value, startTime + point.time);
    });
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
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
      gainNode.gain.linearRampToValueAtTime(point.value, startTime + point.time);
    });
    
    noiseSource.start(startTime);
    noiseSource.stop(startTime + duration);
    
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
  
  // 播放一系列音符
  playSequence(sequence: SoundSequence) {
    sequence.play(this);
  }
}

// 音效序列的基础接口
export interface SoundSequence {
  play(engine: SoundEngine): void;
}

// 叮咚声音效
export const 叮咚声序列: SoundSequence = {
  play(engine: SoundEngine) {
    const audioContext = engine.getAudioContext();
    
    // 创建增益节点来控制音量
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    // 振荡器 1 - 高音
    engine.createTone({
      type: "sine",
      frequency: 1046.5, // 高音C (C6)
      startTime: audioContext.currentTime,
      duration: 0.35,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.4 },
        { time: 0.3, value: 0.01 }
      ],
      connect: gainNode
    });
    
    // 振荡器 2 - 和声
    engine.createTone({
      type: "sine",
      frequency: 1318.51, // 高音E (E6)
      startTime: audioContext.currentTime,
      duration: 0.35,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.4 },
        { time: 0.3, value: 0.01 }
      ],
      connect: gainNode
    });
  }
};

// 咕嘟声音效
export const 咕嘟声序列: SoundSequence = {
  play(engine: SoundEngine) {
    const audioContext = engine.getAudioContext();
    
    // 创建增益节点来控制音量
    const gainNode = audioContext.createGain();
    
    // 创建低通滤波器使声音更圆润
    const filter = engine.createFilter({
      type: "lowpass",
      frequency: 400,
      Q: 5
    });
    
    gainNode.connect(filter);
    filter.connect(audioContext.destination);
    
    // 主振荡器
    const oscillator = audioContext.createOscillator();
    oscillator.type = "triangle"; // 使用三角波获得更温和的音色
    oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(70, audioContext.currentTime + 0.2);
    oscillator.connect(gainNode);
    
    // 设置音量包络 - 模拟液体声音
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.02);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  }
};

// 咔哒声音效
export const 咔哒声序列: SoundSequence = {
  play(engine: SoundEngine) {
    const audioContext = engine.getAudioContext();
    
    // 创建增益节点
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    // 创建带通滤波器
    const bandpass = engine.createFilter({
      type: "bandpass",
      frequency: 2500,
      Q: 1
    });
    
    bandpass.connect(gainNode);
    
    // 创建噪声
    engine.createNoise({
      duration: 0.1,
      startTime: audioContext.currentTime,
      gainEnvelope: [
        { time: 0, value: 0 },
        { time: 0.005, value: 0.3 },
        { time: 0.07, value: 0.001 }
      ],
      connect: bandpass,
      decayRate: 0.1
    });
  }
};

// 胜利音效序列
export const 胜利音效序列: SoundSequence = {
  play(engine: SoundEngine) {
    const audioContext = engine.getAudioContext();
    
    // 创建主增益节点
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);
    
    // 创建混响效果
    const convolver = engine.createReverb({
      duration: 2,
      decayRate: 0.2
    });
    convolver.connect(masterGain);
    
    // 创建旋律音符序列
    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.15, duration: 0.15 },   // E5
      { freq: 783.99, time: 0.3, duration: 0.15 },    // G5
      { freq: 1046.50, time: 0.45, duration: 0.7 }    // C6 (持续更长)
    ];
    
    // 播放上升的音阶
    notes.forEach((note, index) => {
      const isLastNote = index === notes.length - 1;
      const startTime = audioContext.currentTime + note.time;
      
      const noteGain = audioContext.createGain();
      noteGain.gain.value = 0;
      noteGain.connect(convolver);
      noteGain.connect(masterGain);
      
      // 创建振荡器
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = note.freq;
      oscillator.connect(noteGain);
      
      // 设置音量包络
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      
      if (isLastNote) {
        // 为最后一个音符添加颤音
        const vibratoFreq = 6;
        const vibratoDepth = 5;
        
        const vibrato = audioContext.createOscillator();
        vibrato.type = "sine";
        vibrato.frequency.value = vibratoFreq;
        
        const vibratoGain = audioContext.createGain();
        vibratoGain.gain.value = vibratoDepth;
        
        vibrato.connect(vibratoGain);
        vibratoGain.connect(oscillator.frequency);
        
        vibrato.start(startTime + 0.2);
        vibrato.stop(startTime + note.duration);
        
        // 添加淡出效果
        noteGain.gain.setValueAtTime(0.3, startTime + note.duration - 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);
      } else {
        // 普通音符的淡出
        noteGain.gain.setValueAtTime(0.3, startTime + note.duration - 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);
      }
      
      // 启动和停止振荡器
      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration + 0.1);
    });
    
    // 添加结尾的和弦
    const chordTime = audioContext.currentTime + notes[notes.length - 1].time;
    const chordNotes = [
      { freq: 523.25, ratio: 1.0 },   // C5 (根音)
      { freq: 659.25, ratio: 0.7 },   // E5 (三度音)
      { freq: 783.99, ratio: 0.6 },   // G5 (五度音)
      { freq: 1046.50, ratio: 0.5 }   // C6 (高八度)
    ];
    
    // 播放和弦
    chordNotes.forEach(chordNote => {
      const chordOsc = audioContext.createOscillator();
      chordOsc.type = "triangle";
      chordOsc.frequency.value = chordNote.freq;
      
      const chordGain = audioContext.createGain();
      chordGain.gain.value = 0;
      
      chordOsc.connect(chordGain);
      chordGain.connect(convolver);
      
      // 设置音量包络
      chordGain.gain.setValueAtTime(0, chordTime);
      chordGain.gain.linearRampToValueAtTime(0.2 * chordNote.ratio, chordTime + 0.1);
      chordGain.gain.setValueAtTime(0.2 * chordNote.ratio, chordTime + 0.6);
      chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.0);
      
      chordOsc.start(chordTime);
      chordOsc.stop(chordTime + 1.1);
    });
    
    // 添加最后的闪亮音效
    setTimeout(() => {
      const shimmerTime = audioContext.currentTime;
      
      for (let i = 0; i < 8; i++) {
        const randomFreq = 2000 + Math.random() * 3000;
        const timeOffset = i * 0.08;
        
        const panner = audioContext.createStereoPanner();
        panner.pan.value = Math.random() * 2 - 1;
        panner.connect(masterGain);
        
        engine.createTone({
          type: "sine",
          frequency: randomFreq,
          startTime: shimmerTime + timeOffset,
          duration: 0.12,
          gainEnvelope: [
            { time: 0, value: 0 },
            { time: 0.01, value: 0.1 },
            { time: 0.1, value: 0.001 }
          ],
          connect: panner
        });
      }
    }, 700);
  }
};

// 统一的播放接口函数
export const 播放音效 = (序列: SoundSequence) => {
  const engine = new SoundEngine();
  engine.playSequence(序列);
};

// 原有函数的别名，保持向后兼容
export const 播放叮咚声 = () => 播放音效(叮咚声序列);
export const 播放咕嘟声 = () => 播放音效(咕嘟声序列);
export const 播放咔哒声 = () => 播放音效(咔哒声序列);
export const 播放胜利音效 = () => 播放音效(胜利音效序列);