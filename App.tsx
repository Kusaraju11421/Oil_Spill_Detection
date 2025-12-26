
import React, { useState, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar 
} from 'recharts';
import { analyzeOilSpill } from './services/gemini';
import { DetectionResult } from './types';
import { fileToBase64, generatePredictedMask, generateOverlay } from './utils/imageProcessing';
import { MOCK_TRAINING_HISTORY, COLORS } from './constants';

const ANALYSIS_MESSAGES = [
  "ACCESSING SATELLITE LINK...",
  "FILTERING SPECKLE NOISE...",
  "APPLYING LEE DENOISING PASS...",
  "EXTRACTING BACKSCATTER GRADIENTS...",
  "RUNNING OBSIDIAN U-NET SEGMENTATION...",
  "MAPPING NEURAL COORDINATES...",
  "FINALIZING MISSION TELEMETRY..."
];

const TransitionOverlay: React.FC<{ message?: string }> = ({ message = "SYNCHRONIZING TELEMETRY" }) => (
  <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
    <div className="w-full max-w-md text-center">
      <div className="mb-12 relative">
        <div className="w-16 h-16 md:w-24 md:h-24 border-2 border-rose-500/20 rounded-full mx-auto animate-ping"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fa-solid fa-satellite-dish text-rose-500 text-2xl md:text-3xl animate-pulse"></i>
        </div>
      </div>
      <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.5em] mb-4 px-2">{message}</h3>
      <div className="progress-line w-full rounded-full"></div>
      <div className="flex justify-between mt-4 font-mono text-[8px] text-neutral-600 tracking-widest uppercase">
        <span>Channel_0x7F</span>
        <span>Secure_Link</span>
      </div>
    </div>
  </div>
);

const ImagePreviewModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300" onClick={onClose}>
    <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors" onClick={onClose}>
      <i className="fa-solid fa-xmark text-3xl"></i>
    </button>
    <img 
      src={src} 
      alt="Full Preview" 
      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" 
      onClick={(e) => e.stopPropagation()} 
    />
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-[0.4em] text-rose-500 uppercase bg-black/50 px-6 py-2 rounded-full border border-rose-500/20 backdrop-blur-sm">
      Mission High-Fidelity Asset
    </div>
  </div>
);

const SatelliteExamining: React.FC = () => (
  <div className="satellite-scanning">
    <div className="satellite-icon">
      <i className="fa-solid fa-satellite"></i>
    </div>
    <div className="scanning-beam"></div>
    <div className="target-reticle"></div>
  </div>
);

const QuadViewItem: React.FC<{ label: string; src: string | null; status?: string; onPreview: (s: string) => void }> = ({ label, src, status, onPreview }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center px-1">
      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest truncate">{label}</span>
      {status && <span className="text-[8px] text-rose-500 font-mono uppercase whitespace-nowrap">{status}</span>}
    </div>
    <div 
      className={`aspect-square bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center relative group ${src ? 'cursor-zoom-in' : ''}`}
      onClick={() => src && onPreview(src)}
    >
      {src ? (
        <img src={src} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
      ) : (
        <div className="text-neutral-700 text-[10px] uppercase font-bold text-center p-2">Awaiting Data</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
        <span className="text-[8px] font-bold text-white uppercase tracking-widest">Inspect Asset</span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [stage, setStage] = useState<'landing' | 'welcome' | 'dashboard'>('landing');
  const [activeMenu, setActiveMenu] = useState<string>('Upload Images');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(ANALYSIS_MESSAGES[0]);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPlots, setSelectedPlots] = useState<string[]>(['Line Graph', 'Radar Plot', 'Area Chart']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (analyzing) {
      let idx = 0;
      interval = window.setInterval(() => {
        idx = (idx + 1) % ANALYSIS_MESSAGES.length;
        setAnalysisStatus(ANALYSIS_MESSAGES[idx]);
        addLog(ANALYSIS_MESSAGES[idx]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const performTransition = async (callback: () => void, message: string) => {
    setTransitionMsg(message);
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    callback();
    setIsTransitioning(false);
  };

  const handleStart = () => {
    performTransition(() => setStage('dashboard'), "INITIALIZING NEURAL NETWORKS");
  };

  const returnHome = () => {
    performTransition(() => setStage('landing'), "SECURED EXIT");
  };

  const switchMenu = (menu: string) => {
    setActiveMenu(menu);
    addLog(`Navigating to ${menu}`);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  const downloadReport = () => {
    if (!result) return;
    
    const reportHtml = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; background: #0a0a0b; color: #fff; padding: 40px; }
            .card { background: #141416; padding: 40px; border-radius: 24px; border: 1px solid #2a2a2c; max-width: 900px; margin: auto; }
            h1 { color: #ff0055; text-transform: uppercase; letter-spacing: 0.2em; font-size: 24px; border-bottom: 2px solid #ff0055; padding-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
            .img-box { border: 1px solid #2a2a2c; padding: 10px; text-align: center; background: #000; border-radius: 12px; }
            img { max-width: 100%; height: auto; border-radius: 4px; }
            .metrics { margin-top: 40px; background: #1c1c1e; padding: 30px; border-radius: 16px; border: 1px solid #2a2a2c; }
            .label { font-weight: bold; color: #ff0055; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; display: block; margin-bottom: 4px; }
            p { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>SENTINEL-X MISSION REPORT</h1>
            <div style="display: flex; gap: 40px; margin-top: 20px;">
               <p><span class="label">Mission Time</span> ${new Date().toLocaleString()}</p>
               <p><span class="label">Status</span> ${result.spillFound ? 'ANOMALY DETECTED' : 'CLEAR'}</p>
            </div>
            
            <div class="metrics">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                <div><span class="label">Confidence</span> ${(result.confidence * 100).toFixed(2)}%</div>
                <div><span class="label">IoU Score</span> ${result.iou.toFixed(4)}</div>
                <div><span class="label">Area Estimate</span> ${result.areaEstimate}</div>
              </div>
              <div style="margin-top: 30px;">
                <span class="label">Analytical Summary</span>
                <p style="font-style: italic; color: #ccc;">"${result.description}"</p>
                <span class="label">Environmental Impact</span>
                <p style="color: #ff0055; font-weight: bold;">${result.environmentalImpact}</p>
              </div>
            </div>

            <div class="grid">
              <div class="img-box"><span class="label">Input SAR</span><img src="${result.visuals?.input}" /></div>
              <div class="img-box"><span class="label">Ground Truth</span><img src="${result.visuals?.gtMask || ''}" /></div>
              <div class="img-box"><span class="label">Predicted Mask</span><img src="${result.visuals?.predictedMask}" /></div>
              <div class="img-box"><span class="label">Final Overlay</span><img src="${result.visuals?.overlay}" /></div>
            </div>
            
            <footer style="margin-top: 60px; text-align: center; font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 0.4em;">
              Sentinel Marine Safety System - End of Report
            </footer>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel_x_mission_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Mission dossier exported as HTML.");
  };

  const runUnet = async () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    addLog("ENGAGING FLASH INFERENCE ENGINE...");
    try {
      const res = await analyzeOilSpill(selectedImage);
      
      const predictedMask = await generatePredictedMask(selectedImage, res.coordinates);
      const overlay = await generateOverlay(selectedImage, res.coordinates);
      
      const finalResult: DetectionResult = {
        ...res,
        visuals: {
          input: selectedImage,
          gtMask: maskImage,
          predictedMask,
          overlay
        }
      };

      setResult(finalResult);
      addLog("MISSION COMPLETED: TELEMETRY LOCKED.");
      setActiveMenu('View Results');
    } catch (e: any) {
      addLog(`CRITICAL FAILURE: ${e?.message || "Internal core exception"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const renderUpload = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-panel p-6 md:p-10 rounded-2xl flex flex-col items-center justify-center min-h-[300px] md:min-h-[380px] cursor-pointer hover:border-rose-500/50 transition-colors relative group" onClick={() => fileInputRef.current?.click()}>
          <div className="absolute top-4 right-4"><span className="status-pill current">Ready</span></div>
          {selectedImage ? (
            <img src={selectedImage} alt="SAR Input" className="max-h-52 md:max-h-64 lg:max-h-80 rounded-xl object-contain shadow-2xl group-hover:opacity-80 transition-opacity" />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/10 group-hover:bg-rose-500/10 transition-colors">
                 <i className="fa-solid fa-image text-3xl md:text-4xl text-rose-500"></i>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-100">Input SAR Image</h3>
              <p className="text-slate-500 text-[10px] md:text-sm mt-2">Select the raw observation data</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} hidden onChange={async (e) => {
              if (e.target.files?.[0]) {
                const b64 = await fileToBase64(e.target.files[0]);
                setSelectedImage(b64);
                addLog(`SAR Input loaded.`);
              }
          }} />
        </div>

        <div className="glass-panel p-6 md:p-10 rounded-2xl flex flex-col items-center justify-center min-h-[300px] md:min-h-[380px] cursor-pointer hover:border-rose-500/50 transition-colors relative group" onClick={() => maskInputRef.current?.click()}>
           <div className="absolute top-4 right-4"><span className="status-pill current">Ready</span></div>
          {maskImage ? (
            <img src={maskImage} alt="Ground Truth" className="max-h-52 md:max-h-64 lg:max-h-80 rounded-xl object-contain shadow-2xl group-hover:opacity-80 transition-opacity" />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/10 group-hover:bg-rose-500/10 transition-colors">
                 <i className="fa-solid fa-mask text-3xl md:text-4xl text-rose-500"></i>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-100">Ground Truth Mask</h3>
              <p className="text-slate-500 text-[10px] md:text-sm mt-2">Comparison reference image</p>
            </div>
          )}
          <input type="file" ref={maskInputRef} hidden onChange={async (e) => {
              if (e.target.files?.[0]) {
                const b64 = await fileToBase64(e.target.files[0]);
                setMaskImage(b64);
                addLog(`Mask reference loaded.`);
              }
          }} />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-8 md:mt-12">
        <button 
          onClick={runUnet} 
          disabled={!selectedImage || analyzing}
          className="w-full sm:w-auto px-10 md:px-16 py-4 rose-btn rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs disabled:opacity-50"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-notch animate-spin"></i>
              {analysisStatus}
            </span>
          ) : 'Execute Analysis'}
        </button>
        <button 
          onClick={() => { setSelectedImage(null); setMaskImage(null); setResult(null); }}
          className="w-full sm:w-auto px-10 md:px-12 py-4 slate-btn rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs"
        >
          Clear Workspace
        </button>
      </div>
    </div>
  );

  const renderVisuals = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex mobile-menu-scroll gap-4 mb-4 md:mb-8 custom-scrollbar">
        {['Line Graph', 'Radar Plot', 'Area Chart', 'Bar Graph'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedPlots(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type])}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors border ${selectedPlots.includes(type) ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-[0_0_15px_rgba(255,0,85,0.1)]' : 'border-neutral-800 bg-neutral-900/50 text-neutral-500'}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        {selectedPlots.includes('Line Graph') && (
          <div className="glass-panel p-6 md:p-10 rounded-3xl h-[350px] md:h-[450px]">
            <h4 className="text-[10px] font-bold text-slate-500 mb-6 md:mb-8 uppercase tracking-[0.3em]">Historical Convergence</h4>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={MOCK_TRAINING_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" vertical={false} />
                <XAxis dataKey="epoch" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2a2a2c', borderRadius: '8px' }} />
                <Line name="Accuracy" type="monotone" dataKey="valAccuracy" stroke={COLORS.primary} strokeWidth={4} dot={{ r: 4, fill: COLORS.primary, strokeWidth: 0 }} />
                <Line name="IoU" type="monotone" dataKey="valIoU" stroke={COLORS.secondary} strokeWidth={4} dot={{ r: 4, fill: COLORS.secondary, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedPlots.includes('Radar Plot') && (
          <div className="glass-panel p-6 md:p-10 rounded-3xl h-[350px] md:h-[450px]">
            <h4 className="text-[10px] font-bold text-slate-500 mb-6 md:mb-8 uppercase tracking-[0.3em]">Neural Fingerprint</h4>
            <ResponsiveContainer width="100%" height="80%">
              <RadarChart data={result?.radarMetrics || []}>
                <PolarGrid stroke="#2a2a2c" />
                <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={10} />
                <Radar
                  name="Inference"
                  dataKey="value"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2a2a2c' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedPlots.includes('Area Chart') && (
          <div className="glass-panel p-6 md:p-10 rounded-3xl h-[350px] md:h-[450px]">
            <h4 className="text-[10px] font-bold text-slate-500 mb-6 md:mb-8 uppercase tracking-[0.3em]">Inference Density</h4>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={result?.inferencePath || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" vertical={false} />
                <XAxis dataKey="step" stroke="#555" fontSize={10} />
                <YAxis stroke="#555" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #2a2a2c', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="probability" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/20 group-hover:bg-rose-500 transition-colors"></div>
          <div className="absolute top-4 right-4"><span className="status-pill current">Active</span></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Confidence</p>
          <p className="text-3xl md:text-4xl font-mono text-slate-100 font-bold">{result ? (result.confidence * 100).toFixed(1) : '0.0'}%</p>
        </div>
        <div className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-teal/20 group-hover:bg-teal transition-colors"></div>
          <div className="absolute top-4 right-4"><span className="status-pill completed">Score</span></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">IoU Score</p>
          <p className="text-3xl md:text-4xl font-mono text-slate-100 font-bold">{result ? result.iou.toFixed(3) : '0.000'}</p>
        </div>
        <div className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-500/20 group-hover:bg-slate-500 transition-colors"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Estimated Area</p>
          <p className="text-3xl md:text-4xl font-mono text-slate-100 font-bold">{result ? result.areaEstimate : '0.0 km²'}</p>
        </div>
      </div>
      
      {result && result.visuals && (
        <div className="glass-panel p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl">
          <h3 className="text-xl md:text-2xl font-bold mb-8 flex items-center gap-4 text-slate-100">
             <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
               <i className="fa-solid fa-layer-group text-rose-500 text-lg"></i>
             </div>
             Segmentation Analysis Quad-View
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
            <QuadViewItem label="Input SAR Image" src={result.visuals.input} onPreview={setPreviewImage} />
            <QuadViewItem label="Ground Truth Mask" src={result.visuals.gtMask} status="REF_TRUTH" onPreview={setPreviewImage} />
            <QuadViewItem label="Predicted Mask" src={result.visuals.predictedMask} status="U-NET_RAW" onPreview={setPreviewImage} />
            <QuadViewItem label="Final Overlay" src={result.visuals.overlay} status="MISSION_READY" onPreview={setPreviewImage} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 border-t border-neutral-800 pt-10">
            <div className="space-y-6">
              <div className="p-4 md:p-5 bg-neutral-900/40 rounded-xl border border-neutral-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">Segmentation Fidelity</span>
                <p className="text-emerald-400 font-mono text-2xl md:text-3xl mt-1 font-bold">{(result.technicalDetails.segmentationFidelity * 100).toFixed(1)}%</p>
              </div>
              <div className="p-4 md:p-5 bg-neutral-900/40 rounded-xl border border-neutral-800">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">Impact Level</span>
                <p className="text-rose-500 font-bold text-lg md:text-xl mt-1 uppercase tracking-tight">{result.environmentalImpact}</p>
              </div>
              <div className="p-6 md:p-8 bg-neutral-900/60 rounded-2xl border border-neutral-800 shadow-inner">
                <p className="text-[9px] text-slate-500 uppercase font-bold mb-3 tracking-[0.3em]">Neural Summary</p>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed italic font-light tracking-wide">"{result.description}"</p>
              </div>
            </div>
            
            <div 
              className="relative border border-neutral-800 rounded-[24px] overflow-hidden bg-black flex items-center justify-center min-h-[300px] md:min-h-[450px] shadow-2xl cursor-zoom-in"
              onClick={() => result.visuals && setPreviewImage(result.visuals.overlay)}
            >
              <img src={result.visuals.overlay} alt="Analysis Result" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                <span className="status-pill current bg-black/60 backdrop-blur-md">DETECTION_ENGINE_V4</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`${stage === 'dashboard' ? 'min-h-screen' : 'h-screen'} relative overflow-x-hidden selection:bg-rose-500 selection:text-white transition-colors duration-1000 flex flex-col`}>
      {isTransitioning && <TransitionOverlay message={transitionMsg} />}
      {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      
      {stage === 'landing' && (
        <div className="landing-background">
          <div className="grid-layer"></div>
          <div className="scanner-line"></div>
          <div className="pulse-blob blob-1"></div>
          <div className="pulse-blob blob-2"></div>
          <SatelliteExamining />
        </div>
      )}

      <div className="wave-container">
        <div className="wave-layer wave-1"></div>
        <div className="wave-layer wave-2"></div>
        <div className="wave-layer wave-3"></div>
      </div>

      <div className={`fixed top-6 right-6 md:right-12 z-[60] text-right pointer-events-none transition-opacity duration-700 ${stage !== 'dashboard' ? 'opacity-100' : 'opacity-30'}`}>
        <p className="text-[9px] text-white font-bold uppercase tracking-[0.4em] mb-0.5">Created by</p>
        <p className="text-[14px] md:text-lg font-folix text-white italic tracking-[0.1em] drop-shadow-[0_0_8px_rgba(255,0,85,0.6)]">Kusaraju</p>
      </div>

      {stage === 'landing' && (
        <div className="flex-1 flex items-center justify-center flex-col px-4 text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="mb-12">
            <h1 
              onClick={() => performTransition(() => setStage('welcome'), "AUTHENTICATING NEURAL INTERFACE")}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-folix font-bold granite-glow leading-tight"
            >
              <span className="landing-title-main">OIL SPILL</span>
              <br/>
              <span className="landing-title-accent">DETECTION</span>
            </h1>
            <p className="mt-8 text-rose-500 font-bold tracking-[0.5em] animate-pulse text-[11px] uppercase pl-[0.5em] cursor-pointer" onClick={() => performTransition(() => setStage('welcome'), "AUTHENTICATING NEURAL INTERFACE")}>Connect Neural Interface</p>
          </div>
        </div>
      )}

      {stage === 'welcome' && (
        <div className="flex-1 flex items-center justify-center flex-col px-4 py-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="max-w-4xl w-full glass-panel p-8 md:p-16 rounded-[32px] md:rounded-[48px] shadow-2xl border border-white/5 mx-auto">
            <h2 className="text-3xl md:text-6xl font-bold mb-6 text-slate-100 tracking-tight leading-tight">Sentinel-X System</h2>
            <p className="text-base md:text-xl text-neutral-400 leading-relaxed mb-10 px-4 font-light">
              Empowering environmental safety through <strong>Obsidian U-Net Segmentation</strong>. 
              Our mission-critical framework detects maritime hazards in real-time, leveraging high-fidelity 
              SAR imagery to protect our global blue habitats.
            </p>
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={handleStart}
                className="w-full sm:w-auto px-12 md:px-20 py-4 md:py-5 rose-glow-btn rounded-2xl font-bold text-xs uppercase tracking-[0.5em] shadow-2xl"
              >
                Initialize Dashboard
              </button>
              <button 
                onClick={returnHome}
                className="text-neutral-600 text-[9px] font-bold uppercase tracking-[0.3em] hover:text-rose-500 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'dashboard' && (
        <div className="w-full min-h-screen pt-20 pb-10 md:pt-28 md:pb-20 px-4 md:px-8 xl:px-12 flex flex-col lg:flex-row animate-in fade-in slide-in-from-right-8 duration-700 relative z-10">
          <div className="fixed top-6 left-4 md:left-6 z-50">
             <h1 
               onClick={returnHome} 
               className="text-lg md:text-2xl font-folix font-bold text-rose-500 drop-shadow-2xl cursor-pointer"
             >
               SENTINEL-X
             </h1>
          </div>

          <div className="w-full lg:w-80 lg:min-w-[20rem] space-y-4 lg:sticky lg:top-32 self-start mt-8 lg:mt-0 lg:pr-6">
             <div className="mobile-menu-scroll lg:space-y-4 custom-scrollbar lg:flex lg:flex-col">
               {[
                 { id: 'Upload Images', icon: 'fa-cloud-arrow-up' },
                 { id: 'View Results', icon: 'fa-microscope' },
                 { id: 'Plots & Visualizations', icon: 'fa-chart-area' },
                 { id: 'Report & Summary', icon: 'fa-file-contract' },
                 { id: 'Download Report', icon: 'fa-download' }
               ].map(item => (
                 <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'Download Report') downloadReport();
                    else switchMenu(item.id);
                  }}
                  className={`flex items-center gap-4 px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-extrabold tracking-widest uppercase transition-colors w-full ${activeMenu === item.id ? 'active-menu' : 'menu-btn border-neutral-800'}`}
                 >
                   <i className={`fa-solid ${item.icon} w-5 text-xs`}></i>
                   <span className="hidden sm:inline lg:inline">{item.id}</span>
                 </button>
               ))}
             </div>

             <div className="hidden lg:block mt-8 p-6 glass-panel rounded-3xl border border-white/5 shadow-2xl">
                <p className="text-[10px] font-bold text-rose-500 uppercase mb-5 tracking-[0.3em] opacity-80">System Connectivity</p>
                <div className="max-h-60 overflow-y-auto space-y-2.5 font-mono text-[10px] custom-scrollbar pr-2">
                   {logs.map((l, i) => (
                     <div key={i} className="text-neutral-500 flex gap-2">
                       <span className="text-rose-500/40 font-bold">/</span>{l}
                     </div>
                   ))}
                   {analyzing && <div className="text-rose-500 animate-pulse font-bold">/ RUNNING_INFERENCE...</div>}
                </div>
             </div>
          </div>

          <div className="flex-1 w-full lg:min-w-0">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 border-b border-neutral-900/50 pb-6 gap-4">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-100 tracking-tight truncate max-w-full">
                  {activeMenu}
                </h2>
                <div className="flex items-center gap-3 bg-neutral-900/30 px-4 py-2 rounded-xl border border-neutral-800 shadow-xl shrink-0">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(255,0,85,0.8)]"></div>
                   <span className="text-[9px] md:text-[11px] font-mono font-bold text-neutral-500 tracking-tighter">V4.0_STABLE</span>
                </div>
             </div>

             <div className="w-full">
               {activeMenu === 'Upload Images' && renderUpload()}
               {activeMenu === 'View Results' && renderResults()}
               {activeMenu === 'Plots & Visualizations' && renderVisuals()}
               {activeMenu === 'Report & Summary' && (
                  <div className="glass-panel p-6 md:p-12 lg:p-16 rounded-[32px] md:rounded-[64px] border-2 border-rose-500/5 shadow-2xl animate-in fade-in duration-700 w-full overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-6">
                      <div>
                        <h3 className="text-2xl md:text-4xl font-bold text-slate-100 mb-2 tracking-tight">Technical Mission Audit</h3>
                        <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Sentinel-X Neural Platform</p>
                      </div>
                      <span className="status-pill completed px-4 py-1.5 shrink-0">Archived</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
                      <div className="space-y-8 md:space-y-10">
                        <div className="p-6 md:p-8 bg-neutral-900/30 rounded-[24px] md:rounded-[32px] border border-neutral-800 transition-colors">
                           <h4 className="text-[10px] font-extrabold text-rose-500 uppercase tracking-[0.4em] mb-4">U-Net Segment Map</h4>
                           <div className="space-y-4">
                             <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-slate-400 text-xs font-medium">Spill Detected</span><span className={`text-${result?.spillFound ? 'rose' : 'emerald'}-400 text-[10px] font-bold font-mono`}>{result?.spillFound ? 'TRUE' : 'FALSE'}</span></div>
                             <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-slate-400 text-xs font-medium">Spectral Signal</span><span className="text-emerald-400 text-[10px] font-bold font-mono uppercase">{result?.technicalDetails.spectralSignature || 'N/A'}</span></div>
                             <div className="flex items-center justify-between border-b border-white/5 pb-2"><span className="text-slate-400 text-xs font-medium">Confidence Score</span><span className="text-emerald-400 text-[10px] font-bold font-mono">{((result?.confidence || 0) * 100).toFixed(2)}%</span></div>
                           </div>
                        </div>
                      </div>
                      <div className="p-8 md:p-10 bg-neutral-900/50 rounded-[24px] md:rounded-[40px] border border-neutral-800 relative shadow-2xl">
                        <div className="absolute top-4 right-6 text-rose-500/5 text-4xl md:text-6xl"><i className="fa-solid fa-quote-right"></i></div>
                        <p className="text-base md:text-xl text-slate-300 leading-relaxed italic font-light tracking-wide">
                          "{result?.description || 'Awaiting analysis telemetry...'}"
                        </p>
                      </div>
                    </div>
                    
                    {result && result.visuals && (
                      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="aspect-square rounded-lg border border-neutral-800 overflow-hidden cursor-zoom-in" onClick={() => setPreviewImage(result.visuals!.input)}><img src={result.visuals.input} className="w-full h-full object-cover" /></div>
                         <div className="aspect-square rounded-lg border border-neutral-800 overflow-hidden cursor-zoom-in" onClick={() => result.visuals?.gtMask && setPreviewImage(result.visuals.gtMask)}><img src={result.visuals.gtMask || ''} className="w-full h-full object-cover" /></div>
                         <div className="aspect-square rounded-lg border border-neutral-800 overflow-hidden cursor-zoom-in" onClick={() => setPreviewImage(result.visuals!.predictedMask)}><img src={result.visuals.predictedMask} className="w-full h-full object-cover" /></div>
                         <div className="aspect-square rounded-lg border border-neutral-800 overflow-hidden cursor-zoom-in" onClick={() => setPreviewImage(result.visuals!.overlay)}><img src={result.visuals.overlay} className="w-full h-full object-cover" /></div>
                      </div>
                    )}

                    <div className="flex justify-center md:justify-start">
                      <button 
                        onClick={downloadReport}
                        className="mt-12 px-10 py-4 rose-btn rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] w-full sm:w-auto"
                      >
                        Export Mission Archive (.HTML)
                      </button>
                    </div>
                  </div>
               )}
             </div>
          </div>
        </div>
      )}
      
      <footer className={`p-6 md:p-10 text-center font-mono tracking-[0.4em] md:tracking-[0.8em] uppercase relative z-10 px-6 text-[8px] md:text-[10px] transition-all duration-700 ${stage === 'dashboard' ? 'border-t border-neutral-900/50 bg-neutral-950/20 text-neutral-800 opacity-50' : 'text-white opacity-100'}`}>
        Sentinel Marine Safety System &copy; 2025 | Kusaraju | Neural Precision Observability
      </footer>
    </div>
  );
};

export default App;
