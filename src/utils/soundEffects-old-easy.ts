
export const 播放叮咚声 = () => {
  // 使用 web api 实时创建声音 - 高音叮咚声（成功或提示音）
  const audioContext = new AudioContext();
  
  // 创建增益节点来控制音量
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // 振荡器 1 - 高音
  const oscillator1 = audioContext.createOscillator();
  oscillator1.type = "sine";
  oscillator1.frequency.setValueAtTime(1046.5, audioContext.currentTime); // 高音C (C6)
  oscillator1.connect(gainNode);
  
  // 振荡器 2 - 和声
  const oscillator2 = audioContext.createOscillator();
  oscillator2.type = "sine";  
  oscillator2.frequency.setValueAtTime(1318.51, audioContext.currentTime); // 高音E (E6)
  oscillator2.connect(gainNode);
  
  // 设置音量包络 - 更快的攻击和衰减，创造清脆的铃声
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator1.start();
  oscillator2.start();
  oscillator1.stop(audioContext.currentTime + 0.35);
  oscillator2.stop(audioContext.currentTime + 0.35);
}

export const 播放咕嘟声 = () => {
  // 使用 web api 实时创建声音 - 低沉咕嘟声（错误或警告音）
  const audioContext = new AudioContext();
  
  // 创建增益节点来控制音量
  const gainNode = audioContext.createGain();
  
  // 创建低通滤波器使声音更圆润
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.Q.value = 5;
  
  gainNode.connect(filter);
  filter.connect(audioContext.destination);
  
  // 主振荡器
  const oscillator = audioContext.createOscillator();
  oscillator.type = "triangle"; // 使用三角波获得更温和的音色
  oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // 低八度的A
  
  // 频率滑落，模拟"咕嘟"的感觉
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

export const 播放咔哒声 = () => {
  // 使用 web api 实时创建声音 - 咔哒声（点击或切换音效）
  const audioContext = new AudioContext();
  
  // 创建增益节点
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // 创建噪声（模拟咔哒声的瞬态特性）
  const bufferSize = audioContext.sampleRate * 0.1; // 100ms 缓冲区
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  
  // 填充噪声数据，但仅在开始时有强度，快速衰减以模拟咔哒声
  for (let i = 0; i < bufferSize; i++) {
    // 在前10ms内有强烈的噪声，然后迅速衰减
    if (i < audioContext.sampleRate * 0.01) {
      data[i] = Math.random() * 2 - 1;
    } else {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - (i / (bufferSize * 0.1)));
    }
  }
  
  // 创建噪声源
  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  // 创建带通滤波器，使噪声听起来更像咔哒声
  const bandpass = audioContext.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2500; // 中高频，典型的咔哒声频率
  bandpass.Q.value = 1;
  
  noiseSource.connect(bandpass);
  bandpass.connect(gainNode);
  
  // 设置音量包络 - 非常快的攻击和衰减
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.07);
  
  noiseSource.start();
  noiseSource.stop(audioContext.currentTime + 0.1);
}

export const 播放胜利音效 = () => {
  // 使用 web api 实时创建声音 - 胜利庆祝音效（游戏通关或完成挑战）
  const audioContext = new AudioContext();
  
  // 创建主增益节点
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(audioContext.destination);
  
  // 混响效果 - 让声音更加宏大
  const convolver = audioContext.createConvolver();
  const reverbTime = 2;
  const decayRate = 0.2;
  
  // 创建混响的脉冲响应
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * reverbTime;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  
  for (let channel = 0; channel < 2; channel++) {
    const impulseData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayRate);
    }
  }
  
  convolver.buffer = impulse;
  convolver.connect(masterGain);
  
  // 创建旋律音符序列（上升的音阶 + 和弦结尾）
  const notes = [
    { freq: 523.25, time: 0.0, duration: 0.15 },    // C5
    { freq: 659.25, time: 0.15, duration: 0.15 },   // E5
    { freq: 783.99, time: 0.3, duration: 0.15 },    // G5
    { freq: 1046.50, time: 0.45, duration: 0.7 }    // C6 (持续更长)
  ];
  
  // 播放上升的音阶
  notes.forEach(note => {
    // 为每个音符创建振荡器
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = note.freq;
    
    // 增益节点控制音符的音量包络
    const noteGain = audioContext.createGain();
    noteGain.gain.value = 0;
    
    // 连接：振荡器 -> 音符增益 -> 混响 -> 主增益 -> 输出
    oscillator.connect(noteGain);
    noteGain.connect(convolver);
    noteGain.connect(masterGain); // 同时直连主增益，保留部分干声
    
    // 设置音量包络
    const startTime = audioContext.currentTime + note.time;
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    
    // 最后一个音符有颤音效果
    if (note === notes[notes.length - 1]) {
      // 为最后一个音符添加颤音
      const vibratoFreq = 6; // 颤音频率
      const vibratoDepth = 5; // 颤音深度
      
      // 使用LFO创建颤音
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
  
  // 添加结尾的和弦（在最后一个音符开始时）
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
    chordOsc.type = "triangle"; // 使用三角波获得更丰富的泛音
    chordOsc.frequency.value = chordNote.freq;
    
    const chordGain = audioContext.createGain();
    chordGain.gain.value = 0;
    
    // 连接
    chordOsc.connect(chordGain);
    chordGain.connect(convolver);
    
    // 设置音量包络 - 和弦缓慢淡入淡出
    chordGain.gain.setValueAtTime(0, chordTime);
    chordGain.gain.linearRampToValueAtTime(0.2 * chordNote.ratio, chordTime + 0.1);
    chordGain.gain.setValueAtTime(0.2 * chordNote.ratio, chordTime + 0.6);
    chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.0);
    
    chordOsc.start(chordTime);
    chordOsc.stop(chordTime + 1.1);
  });
  
  // 添加最后的闪亮音效（类似星星闪烁）
  setTimeout(() => {
    const shimmerTime = audioContext.currentTime;
    
    // 创建几个短促的高频音符
    for (let i = 0; i < 8; i++) {
      const shimmerOsc = audioContext.createOscillator();
      shimmerOsc.type = "sine";
      
      // 随机高频
      const randomFreq = 2000 + Math.random() * 3000;
      shimmerOsc.frequency.value = randomFreq;
      
      const shimmerGain = audioContext.createGain();
      shimmerGain.gain.value = 0;
      
      // 添加立体声平移
      const panner = audioContext.createStereoPanner();
      panner.pan.value = Math.random() * 2 - 1; // -1到1之间的随机值
      
      // 连接
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(panner);
      panner.connect(masterGain);
      
      // 时间偏移
      const timeOffset = i * 0.08;
      
      // 音量包络 - 非常短促的闪烁声
      shimmerGain.gain.setValueAtTime(0, shimmerTime + timeOffset);
      shimmerGain.gain.linearRampToValueAtTime(0.1, shimmerTime + timeOffset + 0.01);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, shimmerTime + timeOffset + 0.1);
      
      shimmerOsc.start(shimmerTime + timeOffset);
      shimmerOsc.stop(shimmerTime + timeOffset + 0.12);
    }
  }, 700); // 在主旋律播放后添加闪烁音效
};

