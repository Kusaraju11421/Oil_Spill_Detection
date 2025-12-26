
import React, { useState, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Cell, 
  ComposedChart, ScatterChart, Scatter, ZAxis, Legend, PieChart, Pie
} from 'recharts';
import { analyzeOilSpill } from './services/gemini';
import { DetectionResult } from './types';
import { fileToBase64, generatePredictedMask, generateOverlay } from './utils/imageProcessing';
import { MOCK_TRAINING_HISTORY, COLORS } from './constants';

const ANALYSIS_MESSAGES = [
  "CONNECTING TO ORBITAL NODE...",
  "EXTRACTING SAR BACKSCATTER...",
  "DENOISING NEURAL LAYERS...",
  "SEGMENTING OIL ANOMALIES...",
  "CALIBRATING IOU SCORES...",
  "MAPPING SPECTRAL SIGNATURE...",
  "FINALIZING MARITIME DATA..."
];

const CHART_TYPES = [
  'History', 
  'Metrics', 
  'Radar Signature', 
  'Scatter Path', 
  'Hybrid View', 
  'Area Density', 
  'Inference Pie'
];

const TransitionOverlay: React.FC<{ message?: string }> = ({ message = "SYNCHRONIZING TELEMETRY" }) => (
  <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
    <div className="w-full max-w-md text-center px-4">
      <div className="mb-8 relative flex justify-center">
        <div className="w-12 h-12 md:w-16 md:h-16 border border-[#0055FF]/40 rounded-full animate-ping absolute"></div>
        <i className="fa-solid fa-satellite-dish text-[#0055FF] text-2xl md:text-3xl shadow-[0_0_20px_#0055FF]"></i>
      </div>
      <h3 className="text-[10px] md:text-[12px] font-normal text-[#0055FF] font-cinzel uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">{message}</h3>
      <div className="w-full h-[2px] bg-white/5 overflow-hidden rounded-full">
          <div className="h-full bg-[#0055FF] shadow-[0_0_10px_#0055FF] animate-[progress_2s_linear_infinite]"></div>
      </div>
    </div>
  </div>
);

const ImagePreviewModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[150] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
    <button className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white transition-colors z-[160]" onClick={onClose}>
      <i className="fa-solid fa-xmark text-3xl md:text-4xl"></i>
    </button>
    <img src={src} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg md:rounded-xl border border-white/5 shadow-[0_0_100px_rgba(0,85,255,0.1)]" onClick={(e) => e.stopPropagation()} />
  </div>
);

const App: React.FC = () => {
  const [stage, setStage] = useState<'landing' | 'welcome' | 'dashboard'>('landing');
  const [activeMenu, setActiveMenu] = useState<string>('Upload Images');
  const [activeCharts, setActiveCharts] = useState<string[]>(['History']);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(ANALYSIS_MESSAGES[0]);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

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
    await new Promise(resolve => setTimeout(resolve, 800));
    callback();
    setIsTransitioning(false);
  };

  const handleStart = () => performTransition(() => setStage('dashboard'), "INITIALIZING NEURAL NETWORKS");
  const returnHome = () => performTransition(() => setStage('landing'), "SECURED EXIT");

  const switchMenu = (menu: string) => {
    setActiveMenu(menu);
    // addLog(`Navigating to ${menu}`);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 15));
  };

  const toggleChart = (chart: string) => {
    setActiveCharts(prev => 
      prev.includes(chart) 
        ? prev.filter(c => c !== chart) 
        : [...prev, chart]
    );
  };

  const runUnet = async () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    setLogs(["INITIATING NEURAL CORE..."]);
    try {
      const res = await analyzeOilSpill(selectedImage);
      const predictedMask = await generatePredictedMask(selectedImage, res.coordinates);
      const overlay = await generateOverlay(selectedImage, res.coordinates);
      setResult({ ...res, visuals: { input: selectedImage, gtMask: maskImage, predictedMask, overlay } });
      setActiveMenu('View Results');
      addLog("DETECTION SUCCESSFUL. MISSION DATA LOADED.");
    } catch (e: any) {
      console.error(e);
      addLog(`FATAL ERROR: ${e.message || "Unknown error occurred during analysis."}`);
      alert(`Fault in Analysis Engine: ${e.message || "Please check connection or API status."}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  };

  const downloadImage = (base64: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = base64;
    a.download = fileName;
    a.click();
  };

  const exportReport = () => {
    if (!result) return alert("MISSION DATA UNAVAILABLE. PLEASE COMPLETE DETECTION FIRST.");
    
    const timestamp = new Date().toLocaleString();
    const historyTable = MOCK_TRAINING_HISTORY.map(h => 
      `<tr><td>${h.epoch}</td><td>${h.trainLoss.toFixed(4)}</td><td>${h.valIoU.toFixed(4)}</td><td>${h.valAccuracy.toFixed(2)}%</td></tr>`
    ).join('');

    const radarTable = result.radarMetrics.map(m => 
      `<tr><td>${m.subject}</td><td>${m.value}</td><td>${m.fullMark}</td></tr>`
    ).join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Mission Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #050505; color: #e2e8f0; margin: 0; padding: 40px; }
        .container { max-width: 1000px; margin: auto; background: #0a0a0a; border: 1px solid #1e293b; padding: 40px; border-radius: 20px; }
        h1 { font-family: 'Cinzel', serif; color: #0055FF; letter-spacing: 4px; border-bottom: 2px solid #0055FF; padding-bottom: 10px; }
        h2 { color: #94a3b8; text-transform: uppercase; font-size: 14px; letter-spacing: 2px; margin-top: 40px; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 20px; }
        .card { background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222; }
        .metric { font-size: 32px; font-weight: bold; color: #fff; }
        .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
        .img-box { width: 100%; border-radius: 12px; margin-top: 10px; border: 1px solid #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #222; font-size: 13px; }
        th { color: #0055FF; text-transform: uppercase; font-size: 11px; }
        .briefing { font-style: italic; border-left: 4px solid #0055FF; padding-left: 20px; margin: 20px 0; color: #cbd5e1; line-height: 1.6; }
        .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #475569; letter-spacing: 2px; }
    </style>
</head>
<body>
    <div class="container">
        <p class="label">CLASSIFIED // MISSION DOSSIER</p>
        <h1>MISSION REPORT</h1>
        <p class="label">TIMESTAMP: ${timestamp}</p>

        <div class="grid">
            <div class="card">
                <p class="label">Mission Status</p>
                <p class="metric">${result.spillFound ? 'DETECTED' : 'CLEAN'}</p>
            </div>
            <div class="card">
                <p class="label">Confidence Index</p>
                <p class="metric">${(result.confidence * 100).toFixed(2)}%</p>
            </div>
            <div class="card">
                <p class="label">Intersection over Union</p>
                <p class="metric">${result.iou.toFixed(4)}</p>
            </div>
            <div class="card">
                <p class="label">Estimated Area</p>
                <p class="metric">${result.areaEstimate}</p>
            </div>
        </div>

        <h2>Visual Intelligence</h2>
        <div class="grid">
            <div>
                <p class="label">SAR Source Imagery</p>
                <img class="img-box" src="${result.visuals?.input}" />
            </div>
            <div>
                <p class="label">U-Net Segmentation Mask</p>
                <img class="img-box" src="${result.visuals?.predictedMask}" />
            </div>
            <div style="grid-column: span 2;">
                <p class="label">Composite Mission Overlay</p>
                <img class="img-box" src="${result.visuals?.overlay}" />
            </div>
        </div>

        <h2>Analytical Briefing</h2>
        <div class="briefing">${result.description}</div>
        <div class="card">
            <p class="label">Environmental Impact Assessment</p>
            <p style="color: ${result.environmentalImpact === 'Critical' ? '#ff0000' : '#0055ff'}; font-weight: bold; font-size: 24px;">${result.environmentalImpact.toUpperCase()}</p>
        </div>

        <h2>Technical Telemetry</h2>
        <div class="grid">
            <div class="card">
                <p class="label">Spectral Signature</p>
                <p>${result.technicalDetails.spectralSignature}</p>
            </div>
            <div class="card">
                <p class="label">Denoising Status</p>
                <p>${result.technicalDetails.denoisingStatus}</p>
            </div>
        </div>

        <h2>Training History Data</h2>
        <table>
            <thead><tr><th>Epoch</th><th>Loss</th><th>valIoU</th><th>Accuracy</th></tr></thead>
            <tbody>${historyTable}</tbody>
        </table>

        <h2>Radar Metrics (Live Signature)</h2>
        <table>
            <thead><tr><th>Subject</th><th>Value</th><th>Full Mark</th></tr></thead>
            <tbody>${radarTable}</tbody>
        </table>

        <div class="footer">Surveillance Core &copy; 2025 // SECURE OUTPUT</div>
    </div>
</body>
</html>`;

    downloadFile(htmlContent, `Mission_Report_${Date.now()}.html`, "text/html");
    addLog("FULL MISSION DOC EXPORTED.");
  };

  const exportAssets = () => {
    if (!result || !result.visuals) return alert("No mission assets found.");
    if (result.visuals.input) downloadImage(result.visuals.input, "SAR_Input.png");
    if (result.visuals.predictedMask) downloadImage(result.visuals.predictedMask, "Prediction_Mask.png");
    if (result.visuals.overlay) downloadImage(result.visuals.overlay, "Mission_Overlay.png");
  };

  const renderChart = (type: string) => {
    const barData = [
      { name: 'IoU', value: result?.iou || 0 },
      { name: 'Conf', value: result?.confidence || 0 },
      { name: 'Fid', value: result?.technicalDetails.segmentationFidelity || 0 }
    ];

    const scatterData = (result?.inferencePath || []).map(p => ({
      x: p.step,
      y: p.probability,
      z: p.probability * 100
    }));

    const pieData = [
      { name: 'Oil Detected', value: (result?.iou || 0) * 100, fill: '#0055FF' },
      { name: 'Clean Water', value: (1 - (result?.iou || 0)) * 100, fill: 'rgba(255,255,255,0.05)' }
    ];

    switch (type) {
      case 'History':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={MOCK_TRAINING_HISTORY}>
              <defs>
                <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0055FF" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#0055FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222' }} />
              <Area type="monotone" dataKey="valIoU" stroke="#0055FF" strokeWidth={3} fill="url(#neonGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'Metrics':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={11} width={100} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#000', border: 'none' }} />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={50}>
                {barData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0055FF" : "#E4E4E4"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'Radar Signature':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={result?.radarMetrics || []}>
              <PolarGrid stroke="rgba(255,255,255,0.15)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Radar name="SAR" dataKey="value" stroke="#0055FF" fill="#0055FF" fillOpacity={0.4} strokeWidth={3} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'Scatter Path':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="x" name="Step" stroke="rgba(255,255,255,0.3)" />
              <YAxis type="number" dataKey="y" name="Probability" stroke="rgba(255,255,255,0.3)" />
              <ZAxis type="number" dataKey="z" range={[60, 400]} name="Confidence" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000' }} />
              <Scatter name="Inference Path" data={scatterData} fill="#0055FF" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'Hybrid View':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={MOCK_TRAINING_HISTORY}>
              <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip contentStyle={{ backgroundColor: '#000' }} />
              <Legend />
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <Area type="monotone" dataKey="valAccuracy" fill="#0055FF" stroke="#0055FF" fillOpacity={0.1} />
              <Bar dataKey="valIoU" barSize={20} fill="#E4E4E4" opacity={0.3} />
              <Line type="monotone" dataKey="trainLoss" stroke="#FF0000" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'Area Density':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={MOCK_TRAINING_HISTORY}>
              <XAxis dataKey="epoch" stroke="rgba(255,255,255,0.2)" />
              <YAxis stroke="rgba(255,255,255,0.2)" />
              <Tooltip contentStyle={{ backgroundColor: '#000' }} />
              <Area type="step" dataKey="valIoU" stroke="#0055FF" fill="#0055FF" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'Inference Pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderVisuals = () => {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex gap-3 md:gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar">
          {CHART_TYPES.map(sub => (
            <button 
              key={sub}
              onClick={() => toggleChart(sub)}
              className={`px-6 md:px-8 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-lexend tracking-widest uppercase transition-all whitespace-nowrap ${activeCharts.includes(sub) ? 'neon-btn-blue' : 'bg-white/5 text-white/40'}`}
            >
              {activeCharts.includes(sub) && <i className="fa-solid fa-check mr-2"></i>}
              {sub}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {activeCharts.map(chartType => (
            <div key={chartType} className="glass-panel p-6 md:p-10 rounded-3xl md:rounded-[3rem] flex flex-col animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[9px] md:text-[10px] font-lexend font-bold text-white/40 uppercase tracking-[0.2em] md:tracking-[0.3em]">{chartType}</h3>
                 <button onClick={() => toggleChart(chartType)} className="text-white/20 hover:text-white/60 transition-colors">
                    <i className="fa-solid fa-xmark"></i>
                 </button>
              </div>
              <div className="flex-1 w-full min-h-[250px] md:min-h-[300px]">
                {renderChart(chartType)}
              </div>
            </div>
          ))}
          
          {activeCharts.length === 0 && (
            <div className="col-span-full py-20 md:py-32 glass-panel rounded-3xl md:rounded-[3rem] flex flex-col items-center justify-center opacity-20">
               <i className="fa-solid fa-chart-line text-4xl md:text-6xl mb-4 md:mb-6"></i>
               <p className="text-[10px] md:text-xs font-lexend tracking-widest uppercase">Select visualizations to compare data</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-black">
      {isTransitioning && <TransitionOverlay message={transitionMsg} />}
      {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      
      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="landing-background pointer-events-none">
        <div className="glow-mesh"></div>
        <div className="grid-layer"></div>
        
        {/* Spreaded Wave / Ripple Elements */}
        <div className="spread-ripple opacity-50 md:opacity-100"></div>
        <div className="spread-ripple spread-ripple-2 opacity-50 md:opacity-100"></div>
        <div className="spread-ripple spread-ripple-3 opacity-50 md:opacity-100"></div>
        
        {/* Thin Wave Animation Layers */}
        <div className="wave-container">
          <div className="fluid-wave fluid-wave-3"></div>
          <div className="fluid-wave fluid-wave-1"></div>
          <div className="fluid-wave fluid-wave-2"></div>
          <div className="fluid-wave fluid-wave-4"></div>
        </div>
      </div>

      {/* FIXED ELEMENTS - Top Right Attribution (Always visible in Top Right) */}
      <div className="fixed top-4 right-4 md:top-10 md:right-12 z-[60] pointer-events-none">
        <span className="text-[7px] md:text-[10px] font-lexend font-medium text-white/40 tracking-[0.3em] md:tracking-[0.6em] uppercase whitespace-nowrap bg-black/20 backdrop-blur-sm px-2 py-1 rounded md:bg-transparent">
          CREATED BY <span className="text-[#0055FF] font-bold border-b border-[#0055FF]/30 pb-0.5">KUSARAJU</span>
        </span>
      </div>

      {/* Top Left Logo (Conditionally Logo text) */}
      {(stage === 'dashboard' || stage === 'welcome') && (
        <div className="fixed top-4 left-4 md:top-10 md:left-12 z-50 flex items-center gap-3 md:gap-6">
           <h1 onClick={returnHome} className="text-lg md:text-2xl font-cinzel font-black text-[#0055FF] cursor-pointer tracking-[0.1em] md:tracking-[0.2em] uppercase">OIL DETECTOR</h1>
           <div className="h-4 md:h-6 w-[1px] bg-white/10 hidden sm:block"></div>
           <div className="hidden sm:flex items-center gap-3">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#0055FF] shadow-[0_0_12px_#0055FF]"></div>
              <span className="text-[8px] md:text-[10px] font-lexend font-bold text-[#94A3B8] tracking-[0.2em] uppercase">LINK_ACTIVE</span>
           </div>
        </div>
      )}

      {stage === 'landing' && (
        <div className="flex-1 min-h-screen flex items-center justify-center flex-col px-6 text-center relative z-10 page-transition cursor-pointer" onClick={() => performTransition(() => setStage('welcome'), "AUTHENTICATING")}>
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-cinzel leading-tight font-black landing-title uppercase">
            <span className="text-white opacity-95">OIL SPILL</span>
            <br/>
            <span className="branding-gradient-text">DETECTOR</span>
          </h1>
          <p className="mt-8 md:mt-16 text-[#94A3B8] font-lexend text-sm md:text-xl italic tracking-[0.2em] md:tracking-[0.4em] uppercase opacity-80 animate-pulse">
            Silent Guardians of Waves.
          </p>
        </div>
      )}

      {stage === 'welcome' && (
        <div className="flex-1 min-h-screen flex items-center justify-center flex-col px-6 py-12 text-center relative z-10 page-transition">
          <div className="max-w-4xl w-full glass-panel p-8 md:p-24 rounded-3xl md:rounded-[3.5rem] mx-auto relative overflow-hidden">
            <h2 className="text-3xl md:text-6xl font-cinzel font-bold mb-6 md:mb-10 text-white tracking-tighter uppercase">MISSION CORE</h2>
            <p className="text-[11px] md:text-lg text-[#94A3B8] leading-relaxed mb-12 md:mb-20 font-normal font-lexend tracking-widest max-w-2xl mx-auto">
              Advanced maritime anomaly tracking and environmental identification via <span className="text-[#0055FF] font-bold">Obsidian U-Net</span> synthetic aperture radar.
            </p>
            <div className="flex flex-col items-center gap-6 md:gap-10">
              <button onClick={handleStart} className="neon-btn-blue w-full max-w-xs md:max-w-none md:px-20 py-4 md:py-6 rounded-xl md:rounded-2xl font-bold text-[10px] md:text-[12px] uppercase tracking-[0.3em] md:tracking-[0.5em]">
                ACCESS DASHBOARD
              </button>
              <button onClick={returnHome} className="text-white/30 text-[9px] md:text-[11px] font-lexend uppercase tracking-[0.4em] hover:text-white transition-colors">
                RETURN TO CORE
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'dashboard' && (
        <div className="w-full min-h-screen pt-24 pb-20 md:pt-28 md:pb-32 px-4 md:px-16 flex flex-col lg:flex-row page-transition relative z-10">
          
          <aside className="w-full lg:w-80 space-y-4 lg:sticky lg:top-36 self-start mb-8 lg:mb-0 lg:pr-10">
             <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
               {[
                 { id: 'Upload Images', icon: 'fa-cloud-arrow-up' },
                 { id: 'View Results', icon: 'fa-microscope' },
                 { id: 'Visuals & Charts', icon: 'fa-chart-area' },
                 { id: 'Report & Summary', icon: 'fa-file-contract' },
                 { id: 'Download Options', icon: 'fa-download' }
               ].map(item => (
                 <button
                  key={item.id}
                  onClick={() => switchMenu(item.id)}
                  className={`flex items-center gap-3 md:gap-5 px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] tracking-[0.15em] md:tracking-[0.2em] uppercase menu-item whitespace-nowrap flex-shrink-0 ${activeMenu === item.id ? 'active' : 'hover:bg-white/5'}`}
                 >
                   <i className={`fa-solid ${item.icon} text-base md:text-lg w-5`}></i>
                   <span>{item.id}</span>
                 </button>
               ))}
             </div>
          </aside>

          <main className="flex-1 w-full lg:min-w-0">
             <header className="mb-8 md:mb-12 pb-4 md:pb-8 border-b border-white/5 flex flex-col md:flex-row md:justify-between md:items-end gap-2">
                <h2 className="text-xl md:text-5xl font-cinzel font-black text-white tracking-[0.05em] md:tracking-[0.1em] uppercase">{activeMenu}</h2>
                <div className="text-[8px] md:text-[10px] font-lexend text-white/20 uppercase tracking-widest">Tactical Node 04</div>
             </header>

             <div className="w-full">
               {activeMenu === 'Upload Images' && (
                 <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                     <div 
                       className="glass-panel p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] cursor-pointer group hover:border-[#0055FF]/40 transition-all" 
                       onClick={() => fileInputRef.current?.click()}
                     >
                       {selectedImage ? <img src={selectedImage} className="max-h-64 md:max-h-96 rounded-xl md:rounded-2xl object-contain shadow-2xl" /> : (
                         <div className="text-center opacity-30 group-hover:opacity-80 transition-opacity">
                           <i className="fa-solid fa-satellite text-4xl md:text-7xl mb-4 md:mb-8 text-[#0055FF]"></i>
                           <h3 className="text-sm md:text-lg font-cinzel font-bold text-white uppercase tracking-widest">Input SAR Sensor</h3>
                           <p className="text-[8px] md:text-[10px] mt-2 md:mt-4 text-[#94A3B8] tracking-[0.2em]">Awaiting Uplink</p>
                         </div>
                       )}
                       <input type="file" ref={fileInputRef} hidden onChange={async e => e.target.files?.[0] && setSelectedImage(await fileToBase64(e.target.files[0]))} />
                     </div>
                     <div 
                       className="glass-panel p-6 md:p-12 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] cursor-pointer group hover:border-white/40 transition-all" 
                       onClick={() => maskInputRef.current?.click()}
                     >
                       {maskImage ? <img src={maskImage} className="max-h-64 md:max-h-96 rounded-xl md:rounded-2xl object-contain shadow-2xl" /> : (
                         <div className="text-center opacity-30 group-hover:opacity-80 transition-opacity">
                           <i className="fa-solid fa-file-shield text-4xl md:text-7xl mb-4 md:mb-8 text-[#E4E4E4]"></i>
                           <h3 className="text-sm md:text-lg font-cinzel font-bold text-white uppercase tracking-widest">Reference Truth</h3>
                           <p className="text-[8px] md:text-[10px] mt-2 md:mt-4 text-[#94A3B8] tracking-[0.2em]">Validation Layer</p>
                         </div>
                       )}
                       <input type="file" ref={maskInputRef} hidden onChange={async e => e.target.files?.[0] && setMaskImage(await fileToBase64(e.target.files[0]))} />
                     </div>
                   </div>

                   <div className="flex flex-col items-center gap-8">
                     <button 
                       onClick={runUnet} 
                       disabled={!selectedImage || analyzing} 
                       className="neon-btn-blue w-full md:w-auto md:px-32 py-4 md:py-6 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-[10px] md:text-[12px] disabled:opacity-20"
                     >
                       {analyzing ? analysisStatus : "START MISSION CORE"}
                     </button>

                     {/* Tactical Console for Logs & Errors */}
                     <div className="w-full glass-panel p-6 rounded-2xl bg-black/80 border border-white/5 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                           <span className="text-[10px] font-bold text-[#0055FF] uppercase tracking-widest">Tactical Console</span>
                           <span className="text-[8px] text-white/20 uppercase">Realtime Feed</span>
                        </div>
                        <div className="space-y-1.5 h-32 overflow-y-auto custom-scrollbar font-mono text-[9px] md:text-[11px]">
                           {logs.length > 0 ? logs.map((log, idx) => (
                             <div key={idx} className={`${log.includes('FATAL ERROR') || log.includes('ERROR') ? 'text-red-500' : 'text-blue-400'} opacity-90`}>
                               <span className="text-white/20 mr-2">[{new Date().toLocaleTimeString()}]</span>
                               <span>{log}</span>
                             </div>
                           )) : (
                             <div className="text-white/10 italic">Awaiting instructions...</div>
                           )}
                        </div>
                     </div>
                   </div>
                 </div>
               )}

               {activeMenu === 'View Results' && result && (
                 <div className="space-y-6 md:space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                     <div className="glass-panel p-6 md:p-10 rounded-2xl md:rounded-[2rem] border-l-4 border-[#0055FF]">
                       <p className="text-[9px] md:text-[11px] font-lexend font-bold text-white/30 uppercase mb-2 md:mb-3 tracking-widest">Confidence</p>
                       <p className="text-2xl md:text-5xl font-cinzel text-white font-black">{(result.confidence * 100).toFixed(0)}%</p>
                     </div>
                     <div className="glass-panel p-6 md:p-10 rounded-2xl md:rounded-[2rem] border-l-4 border-white/20">
                       <p className="text-[9px] md:text-[11px] font-lexend font-bold text-white/30 uppercase mb-2 md:mb-3 tracking-widest">IoU Fidelity</p>
                       <p className="text-2xl md:text-5xl font-cinzel text-white font-black">{result.iou.toFixed(3)}</p>
                     </div>
                     <div className="glass-panel p-6 md:p-10 rounded-2xl md:rounded-[2rem] border-l-4 border-white/10">
                       <p className="text-[9px] md:text-[11px] font-lexend font-bold text-white/30 uppercase mb-2 md:mb-3 tracking-widest">Spill Area</p>
                       <p className="text-2xl md:text-5xl font-cinzel text-white font-black">{result.areaEstimate}</p>
                     </div>
                   </div>
                   
                   <div className="glass-panel p-6 md:p-12 rounded-3xl md:rounded-[3.5rem]">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-16">
                       {[
                         { label: 'SAR SOURCE', src: result.visuals?.input },
                         { label: 'TRUTH REF', src: result.visuals?.gtMask, status: 'GROUND' },
                         { label: 'PREDICTION', src: result.visuals?.predictedMask, status: 'U-NET' },
                         { label: 'MISSION COMP', src: result.visuals?.overlay, status: 'COMBO' }
                       ].map((item, i) => (
                         <div key={i} className="flex flex-col gap-3 md:gap-4">
                           <div className="flex justify-between items-center px-1">
                             <span className="text-[9px] md:text-[10px] font-normal text-white/40 font-lexend uppercase tracking-[0.2em]">{item.label}</span>
                             {item.status && <span className="text-[8px] md:text-[9px] text-[#0055FF] font-lexend uppercase tracking-widest">{item.status}</span>}
                           </div>
                           <div 
                             className="aspect-square bg-black border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden cursor-zoom-in relative group"
                             onClick={() => item.src && setPreviewImage(item.src)}
                           >
                             {item.src ? (
                               <img src={item.src} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                             ) : <div className="w-full h-full flex items-center justify-center text-white/10 text-[9px] md:text-[10px]">EMPTY</div>}
                           </div>
                         </div>
                       ))}
                     </div>
                     <div className="bg-black/90 p-6 md:p-12 rounded-2xl md:rounded-[2.5rem] border border-white/10">
                        <h4 className="text-[10px] md:text-[12px] font-lexend font-bold text-[#0055FF] uppercase tracking-[0.3em] md:tracking-[0.5em] mb-4 md:mb-6">Briefing</h4>
                        <p className="text-base md:text-xl text-white/90 font-normal leading-relaxed italic border-l-2 md:border-l-4 border-[#0055FF] pl-4 md:pl-10">"{result.description}"</p>
                        <div className="mt-8 md:mt-12 pt-6 md:pt-10 border-t border-white/10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                           <span className="text-[9px] md:text-[11px] font-lexend font-bold text-white/30 tracking-[0.2em] md:tracking-[0.3em] uppercase">Ecosystem Impact</span>
                           <span className={`text-xl md:text-2xl font-cinzel font-black uppercase tracking-widest ${result.environmentalImpact === 'Critical' ? 'text-[#FF0000]' : 'text-[#0055FF]'}`}>{result.environmentalImpact}</span>
                        </div>
                     </div>
                   </div>
                 </div>
               )}

               {activeMenu === 'Visuals & Charts' && renderVisuals()}

               {activeMenu === 'Report & Summary' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                   <div className="glass-panel p-10 md:p-16 rounded-3xl md:rounded-[3rem] flex flex-col items-center justify-center text-center">
                      <i className="fa-solid fa-file-shield text-5xl md:text-7xl mb-6 md:mb-10 text-[#0055FF]"></i>
                      <h3 className="text-xl md:text-2xl font-cinzel font-bold text-white mb-4 md:mb-6 uppercase tracking-widest">SECURE CACHE</h3>
                      <p className="text-[#94A3B8] max-w-sm mb-8 md:mb-12 text-[11px] md:text-sm">Summaries are synchronized with the tactical database.</p>
                      <button 
                        onClick={() => performTransition(() => addLog("SYNC_COMPLETE"), "SYNCHRONIZING SECURE CACHE")}
                        className="neon-btn-blue w-full md:w-auto px-10 md:px-12 py-3 md:py-4 rounded-xl font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                      >
                        RELOAD_STORAGE
                      </button>
                   </div>
                   <div className="glass-panel p-10 md:p-16 rounded-3xl md:rounded-[3rem] flex flex-col items-center justify-center text-center">
                      <i className="fa-solid fa-satellite text-5xl md:text-7xl mb-6 md:mb-10 text-white/20"></i>
                      <h3 className="text-xl md:text-2xl font-cinzel font-bold text-white mb-4 md:mb-6 uppercase tracking-widest">MISSION STATUS</h3>
                      <p className="text-[#94A3B8] max-w-sm mb-8 md:mb-12 text-[11px] md:text-sm">Targeting complete. Orbital stability nominal.</p>
                      <button 
                        onClick={() => result ? setActiveMenu('View Results') : alert("No mission currently active.")}
                        className="neon-btn-blue w-full md:w-auto px-10 md:px-12 py-3 md:py-4 rounded-xl font-bold uppercase tracking-widest text-[9px] md:text-[10px]"
                      >
                        NODE_QUERY
                      </button>
                   </div>
                 </div>
               )}

               {activeMenu === 'Download Options' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                   <div className="glass-panel p-10 md:p-16 rounded-3xl md:rounded-[4rem] flex flex-col items-center text-center">
                     <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 md:mb-10 border border-white/10">
                        <i className="fa-solid fa-file-pdf text-2xl md:text-3xl text-white"></i>
                     </div>
                     <h3 className="text-xl md:text-2xl font-cinzel font-bold text-white mb-4 md:mb-6 uppercase tracking-widest">MISSION DOC</h3>
                     <p className="text-white/40 text-[11px] md:text-sm mb-8 md:mb-12 max-w-xs">Export the full mission report dossier (HTML format with images and data).</p>
                     <button 
                        onClick={exportReport}
                        className="neon-btn-blue w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-[0.3em] md:tracking-[0.5em] text-[10px] md:text-[11px]"
                     >
                        EXPORT_DOC
                     </button>
                   </div>
                   <div className="glass-panel p-10 md:p-16 rounded-3xl md:rounded-[4rem] flex flex-col items-center text-center">
                     <div className="w-16 h-16 md:w-20 md:h-20 bg-[#0055FF]/10 rounded-full flex items-center justify-center mb-6 md:mb-10 border border-[#0055FF]/20">
                        <i className="fa-solid fa-images text-2xl md:text-3xl text-[#0055FF]"></i>
                     </div>
                     <h3 className="text-xl md:text-2xl font-cinzel font-bold text-white mb-4 md:mb-6 uppercase tracking-widest">ASSETS</h3>
                     <p className="text-white/40 text-[11px] md:text-sm mb-8 md:mb-12 max-w-xs">Download high-res SAR imagery and masks.</p>
                     <button 
                        onClick={exportAssets}
                        className="neon-btn-blue w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-[0.3em] md:tracking-[0.5em] text-[10px] md:text-[11px]"
                      >
                        EXPORT_ASSETS
                      </button>
                   </div>
                 </div>
               )}
             </div>
          </main>
        </div>
      )}
      
      <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-10 text-center font-lexend font-bold uppercase z-[5] pointer-events-none opacity-20">
        <div className="text-[8px] md:text-[10px] text-white tracking-[1.5em] md:tracking-[2.5em]">Surveillance Core &copy; 2025</div>
      </footer>
    </div>
  );
};

export default App;
