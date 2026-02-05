
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Upload, 
  Music2, 
  Layers, 
  Play, 
  Square, 
  Download, 
  Activity,
  RotateCcw,
  Zap,
  Waves,
  Users,
  Mic2,
  Volume2
} from 'lucide-react';
import { 
  AudioStyle, 
  ScaleType, 
  EffectMode, 
  HarmonyType, 
  ProcessingSettings 
} from './types';
import { VocalProcessor } from './services/AudioEngine';
import { Visualizer } from './components/Visualizer';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVocal, setHasVocal] = useState(false);
  const [vocalName, setVocalName] = useState<string | null>(null);
  const [beatName, setBeatName] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [processor, setProcessor] = useState<VocalProcessor | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beatInputRef = useRef<HTMLInputElement>(null);
  const playbackIntervalRef = useRef<number | null>(null);

  const [settings, setSettings] = useState<ProcessingSettings>({
    style: AudioStyle.POP,
    autoTuneEnabled: true,
    scale: ScaleType.AUTO,
    reverbEnabled: true,
    reverbMode: EffectMode.AUTO,
    reverbLevel: 0.2,
    delayEnabled: true,
    delayMode: EffectMode.AUTO,
    delayLevel: 0.1,
    harmony: HarmonyType.OFF,
    harmonyLevel: 0.3
  });

  useEffect(() => {
    const vProcessor = new VocalProcessor();
    setProcessor(vProcessor);
    return () => vProcessor.stopPlayback();
  }, []);

  useEffect(() => {
    if (processor) processor.updateSettings(settings);
  }, [settings, processor]);

  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = window.setInterval(() => {
        if (processor) {
          const cur = processor.getCurrentTime();
          const dur = processor.getDuration();
          setCurrentTime(cur);
          setDuration(dur);
          if (cur >= dur && dur > 0) handleStop();
        }
      }, 100);
    } else if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    return () => { if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current); };
  }, [isPlaying, processor]);

  const handleStop = () => {
    processor?.stopPlayback();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRecordToggle = async () => {
    if (!processor) return;
    if (isRecording) {
      await processor.stopRecording();
      setIsRecording(false);
      setHasVocal(true);
      setVocalName("Vocal vừa ghi");
    } else {
      try {
        setHasVocal(false);
        await processor.startRecording();
        setIsRecording(true);
      } catch (err) { alert("Lỗi micro."); }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vocal' | 'beat') => {
    const file = e.target.files?.[0];
    if (file && processor) {
      const name = await processor.loadAudio(file, type);
      if (type === 'vocal') { setHasVocal(true); setVocalName(name); }
      else setBeatName(name);
    }
  };

  const handlePlaybackToggle = async () => {
    if (!processor) return;
    if (isPlaying) {
      handleStop();
    } else {
      setIsPlaying(true);
      await processor.playMixed(currentTime, settings);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (isPlaying && processor) {
      processor.playMixed(val, settings);
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white p-4 pb-32 md:p-8 flex flex-col items-center custom-scrollbar overflow-y-auto">
      <header className="w-full max-w-xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lime-400 rounded-lg neon-glow">
            <Mic2 className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Vocal Master Auto</h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Android Audio Engine v3.0 (Fixed Chain)</p>
          </div>
        </div>
        {(hasVocal || beatName) && (
          <button onClick={() => { setHasVocal(false); setBeatName(null); handleStop(); }} className="p-2 bg-white/5 rounded-full text-indigo-300 hover:text-white transition-colors border border-white/5">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </header>

      <main className="w-full max-w-xl space-y-5">
        {/* Main Console */}
        <section className="bg-indigo-950/20 rounded-3xl p-5 neon-border relative shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 p-3 flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-lime-400/10 rounded-full border border-lime-400/20">
              <Zap className="w-3 h-3 text-lime-400" />
              <span className="text-[9px] font-black text-lime-400 uppercase">Pro Audio Chain active</span>
            </div>
          </div>
          
          <Visualizer analyzer={processor?.getAnalyzer() || null} />
          
          <div className="mt-5 flex flex-col gap-2">
            {(hasVocal || beatName) && (
              <div className="flex flex-col gap-1 mb-2">
                <input 
                  type="range" min="0" max={duration || 100} step="0.1"
                  value={currentTime} onChange={handleSeek}
                  className="w-full h-1.5 bg-indigo-900 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-indigo-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={handleRecordToggle}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all text-xs tracking-wider ${
                  isRecording ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg'
                }`}
              >
                <Mic className={isRecording ? 'animate-pulse' : ''} />
                {isRecording ? 'DỪNG THU' : 'RECORD VOCAL'}
              </button>
              
              <button 
                onClick={handlePlaybackToggle}
                disabled={!hasVocal && !beatName}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all text-xs tracking-wider ${
                  isPlaying ? 'bg-white text-black' : 'bg-lime-400 text-black shadow-lg shadow-lime-400/20 disabled:opacity-30'
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                {isPlaying ? 'STOP' : 'PLAY PREVIEW'}
              </button>
            </div>
          </div>
        </section>

        {/* Style Selection Grid */}
        <section className="bg-white/5 rounded-3xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-lime-400 w-4 h-4" />
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-100">Chọn Style Auto Mix</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {Object.values(AudioStyle).map(s => (
              <button 
                key={s} onClick={() => setSettings({...settings, style: s, reverbMode: EffectMode.AUTO, delayMode: EffectMode.AUTO})}
                className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                  settings.style === s 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                  : 'bg-white/5 text-indigo-400 border-transparent hover:border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* FX Quick Toggles */}
        <div className="grid grid-cols-3 gap-3">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Layers className="text-lime-400 w-4 h-4" />
                <button 
                  onClick={() => setSettings({...settings, autoTuneEnabled: !settings.autoTuneEnabled})}
                  className={`w-8 h-4 rounded-full transition-colors ${settings.autoTuneEnabled ? 'bg-lime-400' : 'bg-indigo-900'}`}
                >
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all m-0.5 ${settings.autoTuneEnabled ? 'ml-5' : ''}`} />
                </button>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-300">Auto Tune</span>
           </div>

           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Waves className="text-lime-400 w-4 h-4" />
                <button 
                  onClick={() => setSettings({...settings, reverbEnabled: !settings.reverbEnabled})}
                  className={`w-8 h-4 rounded-full transition-colors ${settings.reverbEnabled ? 'bg-lime-400' : 'bg-indigo-900'}`}
                >
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all m-0.5 ${settings.reverbEnabled ? 'ml-5' : ''}`} />
                </button>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-300">Reverb (Vang)</span>
           </div>

           <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Volume2 className="text-lime-400 w-4 h-4" />
                <button 
                  onClick={() => setSettings({...settings, delayEnabled: !settings.delayEnabled})}
                  className={`w-8 h-4 rounded-full transition-colors ${settings.delayEnabled ? 'bg-lime-400' : 'bg-indigo-900'}`}
                >
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all m-0.5 ${settings.delayEnabled ? 'ml-5' : ''}`} />
                </button>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-300">Delay (Lặp)</span>
           </div>
        </div>

        {/* Manual FX Adjustments */}
        <div className="grid grid-cols-2 gap-4">
          <section className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase text-indigo-100">Reverb Wet</h2>
              <span className="text-[8px] bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-400 font-black">{settings.reverbMode}</span>
            </div>
            <input 
              type="range" min="0" max="0.8" step="0.01"
              value={settings.reverbLevel} onChange={(e) => setSettings({...settings, reverbLevel: parseFloat(e.target.value), reverbMode: EffectMode.MANUAL})}
              className="w-full"
            />
          </section>

          <section className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase text-indigo-100">Delay Mix</h2>
              <span className="text-[8px] bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-400 font-black">{settings.delayMode}</span>
            </div>
            <input 
              type="range" min="0" max="0.8" step="0.01"
              value={settings.delayLevel} onChange={(e) => setSettings({...settings, delayLevel: parseFloat(e.target.value), delayMode: EffectMode.MANUAL})}
              className="w-full"
            />
          </section>
        </div>

        {/* Input & Harmony */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2">
              <input type="file" hidden ref={beatInputRef} accept="audio/*" onChange={(e) => handleImport(e, 'beat')} />
              <button onClick={() => beatInputRef.current?.click()} className="flex flex-col items-center gap-1 text-indigo-300">
                <Music2 className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase">Nhạc Beat</span>
              </button>
           </div>

           <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-lime-400 w-3 h-3" />
                <span className="text-[9px] font-black uppercase">Tạo Bè</span>
              </div>
              <select 
                value={settings.harmony}
                onChange={(e) => setSettings({...settings, harmony: e.target.value as HarmonyType})}
                className="w-full bg-indigo-900/50 rounded p-1 text-[9px] text-white font-black border border-white/5"
              >
                {Object.values(HarmonyType).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
           </div>
        </div>

        {/* Master Export */}
        <div className="fixed bottom-0 left-0 right-0 bg-indigo-950/90 backdrop-blur-xl border-t border-white/10 p-5 flex justify-center z-40">
           <button 
            onClick={async () => {
              if (!processor) return;
              setExportProgress(0);
              const fn = await processor.export(p => setExportProgress(p));
              setTimeout(() => { setExportProgress(null); alert(`Xuất file thành công: ${fn}`); }, 500);
            }}
            disabled={!hasVocal || exportProgress !== null}
            className="w-full max-w-xl py-4 bg-lime-400 text-black rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-lime-400/20 disabled:opacity-30 flex items-center justify-center gap-2 uppercase"
          >
            <Download className="w-5 h-5" />
            {exportProgress !== null ? `Exporting ${exportProgress}%` : 'XUẤT BẢN MASTER'}
          </button>
        </div>

        {/* Progress Overlay */}
        {exportProgress !== null && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-indigo-950 w-full max-w-sm rounded-[40px] p-10 border border-lime-400/30 flex flex-col items-center shadow-2xl">
              <Activity className="text-lime-400 w-12 h-12 animate-pulse mb-6" />
              <h3 className="text-xl font-black tracking-tight uppercase text-center">Mastering Pro</h3>
              <div className="w-full bg-indigo-900 h-2 rounded-full overflow-hidden mt-6">
                <div className="bg-lime-400 h-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
              </div>
              <p className="text-lime-400 font-mono text-3xl font-black mt-4">{exportProgress}%</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
