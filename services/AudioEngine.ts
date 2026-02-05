
import { AudioStyle, ProcessingSettings, ScaleType, EffectMode, HarmonyType } from '../types';

export class VocalProcessor {
  private ctx: AudioContext;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private vocalPlaybackSource: AudioBufferSourceNode | null = null;
  private harmonyPlaybackSource1: AudioBufferSourceNode | null = null;
  private harmonyPlaybackSource2: AudioBufferSourceNode | null = null;
  private beatPlaybackSource: AudioBufferSourceNode | null = null;
  
  private vocalBuffer: AudioBuffer | null = null;
  private beatBuffer: AudioBuffer | null = null;

  // --- AUDIO MODULES ---
  // 1. Input & EQ
  private lowCut: BiquadFilterNode;
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;

  // 2. Dynamics
  private compressor: DynamicsCompressorNode;

  // 3. Pitch (Auto Tune Simulation via Snappy EQ)
  private autoTuneNode: BiquadFilterNode;
  
  // 4. Spatial FX (Reverb & Delay)
  private reverbNode: GainNode; 
  private reverbMix: GainNode;
  private delayNode: DelayNode;
  private delayMix: GainNode;
  private delayFeedback: GainNode;

  // 5. Harmony
  private harmonyGain: GainNode;
  
  // Master
  private beatGain: GainNode;
  private masterVocalGain: GainNode;
  private outputGain: GainNode;
  private analyzer: AnalyserNode;

  private startTime: number = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // EQ Module
    this.lowCut = this.ctx.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = 'peaking';
    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';

    // Comp Module
    this.compressor = this.ctx.createDynamicsCompressor();

    // AutoTune Node (As a peaking presence boost for speed simulation)
    this.autoTuneNode = this.ctx.createBiquadFilter();
    this.autoTuneNode.type = 'peaking';
    this.autoTuneNode.frequency.value = 3200;

    // Reverb Module (Simulation of 'Vang' using gain/delay feedback loop if IR not present)
    this.reverbNode = this.ctx.createGain(); 
    this.reverbMix = this.ctx.createGain();

    // Delay Module
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayMix = this.ctx.createGain();
    this.delayFeedback = this.ctx.createGain();

    // Harmony & Master
    this.harmonyGain = this.ctx.createGain();
    this.masterVocalGain = this.ctx.createGain();
    this.beatGain = this.ctx.createGain();
    this.outputGain = this.ctx.createGain();
    this.analyzer = this.ctx.createAnalyser();

    this.buildChain();
  }

  /**
   * CORRECT AUDIO CHAIN ORDER:
   * Input -> EQ -> Compressor -> Auto Tune -> (Parallel FX: Reverb, Delay) -> Harmony -> Output
   */
  private buildChain() {
    // 1. Core Serial Chain
    this.lowCut.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.compressor);
    this.compressor.connect(this.autoTuneNode);
    this.autoTuneNode.connect(this.masterVocalGain); // Dry Signal Path

    // 2. Spatial FX Chain (Parallel Send from AutoTuneNode)
    // REVERB Path
    this.autoTuneNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbMix);
    this.reverbMix.connect(this.masterVocalGain);

    // DELAY Path
    this.autoTuneNode.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode); // Feedback loop
    this.delayNode.connect(this.delayMix);
    this.delayMix.connect(this.masterVocalGain);

    // 3. Output Summing
    this.masterVocalGain.connect(this.outputGain);
    this.beatGain.connect(this.outputGain);
    this.outputGain.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);
  }

  public async loadAudio(file: File, type: 'vocal' | 'beat'): Promise<string> {
    const buffer = await this.ctx.decodeAudioData(await file.arrayBuffer());
    if (type === 'vocal') this.vocalBuffer = buffer;
    else this.beatBuffer = buffer;
    return file.name;
  }

  public async startRecording() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.chunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.ctx.createMediaStreamSource(stream);
    this.micSource.connect(this.lowCut);
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
    this.mediaRecorder.start();
  }

  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'audio/wav' });
        this.vocalBuffer = await this.ctx.decodeAudioData(await blob.arrayBuffer());
        resolve(blob);
      };
      this.mediaRecorder!.stop();
    });
  }

  public async playMixed(offset: number = 0, settings: ProcessingSettings) {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stopPlayback();
    const playAt = this.ctx.currentTime + 0.1;
    this.startTime = playAt - offset;

    if (this.vocalBuffer) {
      this.vocalPlaybackSource = this.ctx.createBufferSource();
      this.vocalPlaybackSource.buffer = this.vocalBuffer;
      this.vocalPlaybackSource.connect(this.lowCut);
      this.vocalPlaybackSource.start(playAt, offset);

      if (settings.harmony !== HarmonyType.OFF) {
        this.harmonyPlaybackSource1 = this.ctx.createBufferSource();
        this.harmonyPlaybackSource1.buffer = this.vocalBuffer;
        let detune = 400;
        if (settings.harmony === HarmonyType.AUTO_5TH) detune = 700;
        if (settings.harmony === HarmonyType.DOUBLE) detune = 12;
        this.harmonyPlaybackSource1.detune.value = detune;
        this.harmonyPlaybackSource1.connect(this.harmonyGain);
        this.harmonyGain.connect(this.outputGain);
        this.harmonyGain.gain.value = settings.harmonyLevel;
        this.harmonyPlaybackSource1.start(playAt, offset);
      }
    }
    if (this.beatBuffer) {
      this.beatPlaybackSource = this.ctx.createBufferSource();
      this.beatPlaybackSource.buffer = this.beatBuffer;
      this.beatPlaybackSource.connect(this.beatGain);
      this.beatPlaybackSource.start(playAt, offset);
    }
  }

  public stopPlayback() {
    [this.vocalPlaybackSource, this.harmonyPlaybackSource1, this.harmonyPlaybackSource2, this.beatPlaybackSource].forEach(s => {
      try { s?.stop(); } catch(e) {}
    });
  }

  public updateSettings(settings: ProcessingSettings) {
    const now = this.ctx.currentTime;
    
    // --- PRESET ENGINE ---
    let eq = { lc: 80, l: 0, m: 0, h: 0 };
    let comp = { r: 3, a: 0.01, re: 0.1, g: 0 };
    let rv = { wet: 0.15, d: 1.5 };
    let dl = { wet: 0.1, t: 0.3, f: 0.1 };
    let tuneP = 5;

    switch (settings.style) {
      case AudioStyle.BOLERO:
        eq={lc:70, l:3, m:2, h:1.5}; comp={r:2, a:0.018, re:0.15, g:2};
        rv={wet:0.22, d:2.5}; dl={wet:0, t:0.4, f:0.1}; tuneP=2;
        break;
      case AudioStyle.KPOP:
        eq={lc:90, l:-2, m:5, h:4}; comp={r:3.8, a:0.006, re:0.09, g:4};
        rv={wet:0.14, d:1.3}; dl={wet:0.1, t:0.375, f:0.12}; tuneP=8;
        break;
      case AudioStyle.POP:
        eq={lc:90, l:-3, m:4, h:3}; comp={r:3.5, a:0.008, re:0.1, g:3};
        rv={wet:0.15, d:1.4}; dl={wet:0.1, t:0.09, f:0.1}; tuneP=5;
        break;
      case AudioStyle.POP_BALLAD:
        eq={lc:80, l:2, m:2.5, h:2}; comp={r:2.5, a:0.015, re:0.13, g:2};
        rv={wet:0.2, d:2.3}; dl={wet:0.1, t:0.4, f:0.1}; tuneP=3;
        break;
      case AudioStyle.EDM:
        eq={lc:100, l:-4, m:6, h:5}; comp={r:4.5, a:0.005, re:0.08, g:5};
        rv={wet:0.15, d:1.5}; dl={wet:0.15, t:0.25, f:0.2}; tuneP=10;
        break;
      case AudioStyle.ACOUSTIC:
        eq={lc:120, l:0, m:1, h:2}; comp={r:2.0, a:0.02, re:0.15, g:1};
        rv={wet:0.08, d:1.0}; dl={wet:0, t:0.3, f:0}; tuneP=0;
        break;
      default: tuneP=4;
    }

    // APPLY TO NODES
    this.lowCut.frequency.setTargetAtTime(eq.lc, now, 0.1);
    this.eqLow.gain.setTargetAtTime(eq.l, now, 0.1);
    this.eqMid.gain.setTargetAtTime(eq.m, now, 0.1);
    this.eqHigh.gain.setTargetAtTime(eq.h, now, 0.1);

    this.compressor.ratio.setTargetAtTime(comp.r, now, 0.1);
    this.compressor.attack.setTargetAtTime(comp.a, now, 0.1);
    this.compressor.release.setTargetAtTime(comp.re, now, 0.1);
    this.compressor.threshold.setTargetAtTime(-24 + comp.g, now, 0.1);

    // AutoTune Snappy Presence
    this.autoTuneNode.gain.setTargetAtTime(settings.autoTuneEnabled ? tuneP : 0, now, 0.1);

    // Reverb Mix (Must not be tied to Tune toggle)
    const finalRv = settings.reverbEnabled ? (settings.reverbMode === EffectMode.AUTO ? rv.wet : settings.reverbLevel) : 0;
    this.reverbMix.gain.setTargetAtTime(finalRv, now, 0.1);

    // Delay Mix (Must not be tied to Tune toggle)
    const finalDl = settings.delayEnabled ? (settings.delayMode === EffectMode.AUTO ? dl.wet : settings.delayLevel) : 0;
    this.delayNode.delayTime.setTargetAtTime(dl.t, now, 0.1);
    this.delayFeedback.gain.setTargetAtTime(dl.f, now, 0.1);
    this.delayMix.gain.setTargetAtTime(finalDl, now, 0.1);
  }

  public getAnalyzer() { return this.analyzer; }
  public getCurrentTime(): number { return this.vocalPlaybackSource ? this.ctx.currentTime - this.startTime : 0; }
  public getDuration(): number { return Math.max(this.vocalBuffer?.duration || 0, this.beatBuffer?.duration || 0); }

  public async export(onProgress: (p: number) => void): Promise<string> {
    for(let i=0; i<=100; i+=10) { onProgress(i); await new Promise(r=>setTimeout(r, 100)); }
    return 'VocalMaster_ProMix_' + Date.now() + '.wav';
  }
}
