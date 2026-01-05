
import React, { useState, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Cell, 
  ComposedChart, ScatterChart, Scatter, ZAxis, Legend, PieChart, Pie
} from 'recharts';
import { analyzeOilSpill } from './services/gemini';
import { DetectionResult } from './types';
import { fileToBase64, generateGTReferenceMask, generatePredictedMask, generateFinalOverlay } from './utils/imageProcessing';
import { MOCK_TRAINING_HISTORY, COLORS } from './constants';
import { 
  PerformanceChart, 
  MetricsBarChart, 
  ScatterPathChart, 
  HybridMetricChart, 
  AreaDensityChart 
} from './components/MetricsChart';
import { 
  generatePerformanceSvg, 
  generateMetricsBarSvg, 
  generateRadarSvg 
} from './utils/reportGenerator';

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
    <div className="w-full max-md text-center px-4">
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
  const [activeCharts, setActiveCharts] = useState<string[]>(['History', 'Metrics']);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(ANALYSIS_MESSAGES[0]);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 15));

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

  const switchMenu = (menu: string) => setActiveMenu(menu);
  
  const toggleChart = (chart: string) => {
    setActiveCharts(prev => 
      prev.includes(chart) ? prev.filter(c => c !== chart) : [...prev, chart]
    );
  };

  const runUnet = async () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    setLogs(["INITIATING MULTIMODAL DETECTION CORE..."]);
    try {
      const res = await analyzeOilSpill(selectedImage);
      
      addLog("GENERATING ORGANIC MASKS... (GT vs PRED)");
      
      const mask = await generateGTReferenceMask(selectedImage, res.groundTruthPolygons, res.landPolygons || []);
      const predicted = await generatePredictedMask(selectedImage, res.predictedPolygons);
      const overlay = await generateFinalOverlay(selectedImage, res.predictedPolygons);
      
      setResult({ 
        ...res, 
        visuals: { input: selectedImage, mask, predicted, overlay } 
      });
      
      setActiveMenu('View Results');
      addLog(res.spillFound ? "MISSION DATA SECURED. SPILL IDENTIFIED." : "ANALYSIS COMPLETE. CLEAN WATER DETECTED.");
    } catch (e: any) {
      console.error(e);
      addLog(`CRITICAL ERROR: ${e.message || "Uplink failure."}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const exportAssets = () => {
    if (!result || !result.visuals) return alert("No assets available for export.");
    const a = document.createElement("a");
    a.href = result.visuals.overlay; a.download = "Final_Overlay.png"; a.click();
  };

  const exportReport = () => {
    if (!result) return alert("No mission data found. Please run analysis first.");
    
    // Generate Charts for the Report
    const performanceSvg = generatePerformanceSvg(MOCK_TRAINING_HISTORY, result);
    const metricsSvg = generateMetricsBarSvg(result);
    const radarSvg = generateRadarSvg(result.radarMetrics);

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Oil Spill Detection Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000; color: #fff; padding: 40px; }
          .container { max-width: 900px; margin: 0 auto; border: 1px solid #0055FF; padding: 40px; border-radius: 20px; background: #050505; box-shadow: 0 0 50px rgba(0, 85, 255, 0.2); }
          h1 { color: #0055FF; text-transform: uppercase; letter-spacing: 5px; border-bottom: 2px solid #0055FF; padding-bottom: 20px; text-align: center; }
          .metrics { display: flex; justify-content: space-between; margin-top: 40px; }
          .metric-box { text-align: center; flex: 1; padding: 20px; border-right: 1px solid #222; }
          .metric-box:last-child { border-right: none; }
          .label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 2px; }
          .value { font-size: 32px; font-weight: bold; color: #fff; }
          .description { margin-top: 40px; background: #0A0A0A; padding: 30px; border-radius: 10px; line-height: 1.6; font-style: italic; border-left: 5px solid #0055FF; }
          .visuals { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; }
          .img-container { text-align: center; background: #050505; padding: 10px; border-radius: 10px; }
          img { width: 100%; border-radius: 10px; border: 1px solid #1A1A1A; margin-top: 10px; }
          .section-title { margin-top: 60px; font-size: 14px; text-transform: uppercase; letter-spacing: 4px; color: #0055FF; border-left: 3px solid #0055FF; padding-left: 15px; margin-bottom: 20px; }
          .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
          .chart-box { background: #050505; border: 1px solid #111; padding: 20px; border-radius: 15px; }
          .footer { margin-top: 80px; text-align: center; color: #333; font-size: 10px; letter-spacing: 5px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Mission Report Dossier</h1>
          
          <div class="metrics">
            <div class="metric-box"><div class="label">Confidence</div><div class="value">${(result.confidence * 100).toFixed(1)}%</div></div>
            <div class="metric-box"><div class="label">IoU Score</div><div class="value">${result.iou.toFixed(3)}</div></div>
            <div class="metric-box"><div class="label">Area Estimate</div><div class="value">${result.areaEstimate}</div></div>
          </div>

          <div class="section-title">Strategic Summary</div>
          <div class="description">"${result.description}"</div>

          <div class="section-title">Detection Analytics</div>
          <div class="charts-container">
            <div class="chart-box">
              <div class="label">Training Performance History (IoU)</div>
              ${performanceSvg}
            </div>
            <div class="chart-box">
              <div class="label">Mission Fidelity Comparison</div>
              ${metricsSvg}
            </div>
            <div class="chart-box" style="grid-column: span 2;">
              <div class="label">Radar Spectral Signature</div>
              <div style="display: flex; justify-content: center;">${radarSvg}</div>
            </div>
          </div>

          <div class="section-title">Tactical Imagery Assets</div>
          <div class="visuals">
            <div class="img-container"><div class="label">SAR Source Uplink</div><img src="${result.visuals?.input}"/></div>
            <div class="img-container"><div class="label">Ground Truth Reference</div><img src="${result.visuals?.mask}"/></div>
            <div class="img-container"><div class="label">AI Model Prediction</div><img src="${result.visuals?.predicted}"/></div>
            <div class="img-container"><div class="label">Neural Fusion Overlay</div><img src="${result.visuals?.overlay}"/></div>
          </div>

          <div class="footer">SENTINEL SURVEILLANCE CORE • CLASSIFIED DATA • &copy; 2025</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Oil_Spill_Mission_Report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col bg-black">
      {isTransitioning && <TransitionOverlay message={transitionMsg} />}
      {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      
      <div className="landing-background pointer-events-none">
        <div className="glow-mesh"></div><div className="grid-layer"></div>
        <div className="spread-ripple opacity-30"></div><div className="spread-ripple spread-ripple-2"></div>
        <div className="wave-container">
          <div className="fluid-wave fluid-wave-1"></div>
          <div className="fluid-wave fluid-wave-3"></div>
        </div>
      </div>

      {(stage === 'dashboard' || stage === 'welcome') && (
        <div className="fixed top-4 left-4 md:top-10 md:left-12 z-50 flex items-center gap-3">
           <h1 onClick={returnHome} className="text-lg md:text-2xl font-cinzel font-black text-[#0055FF] cursor-pointer tracking-widest uppercase">OIL DETECTOR</h1>
        </div>
      )}

      {stage === 'landing' && (
        <div className="flex-1 min-h-screen flex items-center justify-center flex-col px-6 text-center relative z-10 page-transition cursor-pointer" onClick={() => performTransition(() => setStage('welcome'), "AUTHENTICATING")}>
          <h1 className="text-5xl md:text-9xl font-cinzel leading-tight font-black landing-title uppercase">
            <span className="text-white opacity-95">OIL SPILL</span><br/><span className="branding-gradient-text">DETECTOR</span>
          </h1>
          <p className="mt-8 text-[#94A3B8] font-lexend text-sm md:text-xl italic tracking-widest uppercase animate-pulse">Silent Guardians of Waves.</p>
        </div>
      )}

      {stage === 'welcome' && (
        <div className="flex-1 min-h-screen flex items-center justify-center flex-col relative z-10 page-transition">
          <div className="max-w-4xl w-full glass-panel p-12 md:p-24 rounded-[3.5rem] text-center">
            <h2 className="text-4xl md:text-6xl font-cinzel font-bold mb-10 text-white tracking-tighter uppercase">MISSION CORE</h2>
            <p className="text-sm md:text-lg text-[#94A3B8] leading-relaxed mb-16 font-lexend tracking-widest max-w-2xl mx-auto">Organic anomaly tracking via <span className="text-[#0055FF] font-bold">Obsidian U-Net</span> synthetic aperture radar.</p>
            <button onClick={handleStart} className="neon-btn-blue px-20 py-6 rounded-2xl font-bold uppercase tracking-[0.5em]">ACCESS DASHBOARD</button>
          </div>
        </div>
      )}

      {stage === 'dashboard' && (
        <div className="w-full min-h-screen pt-28 pb-32 px-4 md:px-16 flex flex-col lg:flex-row page-transition relative z-10">
          <aside className="w-full lg:w-80 space-y-4 lg:sticky lg:top-36 self-start mb-8 lg:pr-10">
             <div className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2">
               {[{ id: 'Upload Images', icon: 'fa-cloud-arrow-up' }, { id: 'View Results', icon: 'fa-microscope' }, { id: 'Visuals & Charts', icon: 'fa-chart-area' }, { id: 'Download Options', icon: 'fa-download' }].map(item => (
                 <button key={item.id} onClick={() => switchMenu(item.id)} className={`flex items-center gap-5 px-8 py-5 rounded-2xl text-[11px] tracking-widest uppercase menu-item whitespace-nowrap ${activeMenu === item.id ? 'active' : 'hover:bg-white/5'}`}><i className={`fa-solid ${item.icon} text-lg w-5`}></i><span>{item.id}</span></button>
               ))}
             </div>
          </aside>

          <main className="flex-1 min-w-0">
             <header className="mb-12 pb-8 border-b border-white/5">
                <h2 className="text-3xl md:text-5xl font-cinzel font-black text-white tracking-widest uppercase">{activeMenu}</h2>
             </header>

             <div className="w-full">
               {activeMenu === 'Upload Images' && (
                 <div className="space-y-12">
                   <div className="flex justify-center">
                     <div className="w-full max-w-3xl glass-panel p-12 rounded-[2.5rem] flex flex-col items-center justify-center min-h-[500px] cursor-pointer group hover:border-[#0055FF]/40 transition-all" onClick={() => fileInputRef.current?.click()}>
                       {selectedImage ? <img src={selectedImage} className="max-h-[450px] rounded-2xl object-contain shadow-2xl" /> : (<div className="text-center opacity-30 group-hover:opacity-80 transition-opacity"><i className="fa-solid fa-satellite text-7xl mb-8 text-[#0055FF]"></i><h3 className="text-lg font-cinzel font-bold text-white uppercase tracking-widest">Input SAR/Drone Image</h3><p className="text-[10px] mt-4 text-[#94A3B8] tracking-widest uppercase">Awaiting Uplink</p></div>)}
                       <input type="file" ref={fileInputRef} hidden onChange={async e => e.target.files?.[0] && setSelectedImage(await fileToBase64(e.target.files[0]))} />
                     </div>
                   </div>

                   <div className="flex flex-col items-center gap-8">
                     <button onClick={runUnet} disabled={!selectedImage || analyzing} className="neon-btn-blue px-32 py-6 rounded-2xl font-black uppercase tracking-[0.6em] text-[12px] disabled:opacity-20">
                       {analyzing ? analysisStatus : "START MISSION CORE"}
                     </button>
                     <div className="w-full max-w-4xl glass-panel p-6 rounded-2xl bg-black/80 border border-white/5 overflow-hidden font-mono text-[11px]">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10 uppercase tracking-widest text-[#0055FF]">Tactical Console</div>
                        <div className="space-y-1.5 h-32 overflow-y-auto custom-scrollbar">{logs.map((log, idx) => (<div key={idx} className="text-blue-400 opacity-80"><span className="text-white/20 mr-2">[{new Date().toLocaleTimeString()}]</span>{log}</div>))}</div>
                     </div>
                   </div>
                 </div>
               )}

               {activeMenu === 'View Results' && result && result.visuals && (
                 <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className={`glass-panel p-10 rounded-[2rem] border-l-4 ${result.spillFound ? 'border-[#0055FF]' : 'border-green-500'}`}><p className="text-[11px] font-bold text-white/30 uppercase mb-3 tracking-widest">Confidence</p><p className="text-5xl font-cinzel text-white font-black">{(result.confidence * 100).toFixed(0)}%</p></div>
                     <div className="glass-panel p-10 rounded-[2rem] border-l-4 border-white/20"><p className="text-[11px] font-bold text-white/30 uppercase mb-3 tracking-widest">IoU Fidelity</p><p className="text-5xl font-cinzel text-white font-black">{result.iou.toFixed(3)}</p></div>
                     <div className="glass-panel p-10 rounded-[2rem] border-l-4 border-white/10"><p className="text-[11px] font-bold text-white/30 uppercase mb-3 tracking-widest">Spill Area</p><p className="text-5xl font-cinzel text-white font-black">{result.areaEstimate}</p></div>
                   </div>
                   
                   {!result.spillFound && (
                     <div className="glass-panel p-8 rounded-2xl bg-green-500/5 border border-green-500/20 text-green-400 flex items-center gap-4">
                       <i className="fa-solid fa-circle-check text-2xl"></i>
                       <span className="text-xs font-bold uppercase tracking-widest">MISSION STATUS: CLEAR WATER IDENTIFIED. NO OIL ANOMALIES DETECTED.</span>
                     </div>
                   )}

                   <div className="glass-panel p-12 rounded-[3.5rem]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                        {[
                          { label: 'INPUT IMAGE', src: result.visuals.input }, 
                          { label: 'GROUND TRUTH MASK', src: result.visuals.mask, status: 'BLACK/GREEN/WHITE' }, 
                          { label: 'PREDICTED MASK', src: result.visuals.predicted, status: 'BLACK/WHITE' }, 
                          { label: 'FINAL OVERLAY', src: result.visuals.overlay, status: 'GREEN_OVERLAY' }
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col gap-4">
                            <span className="text-[10px] font-normal text-white/40 font-lexend uppercase tracking-widest">{item.label}</span>
                            <div className="aspect-square bg-black border border-white/10 rounded-3xl overflow-hidden cursor-zoom-in relative group" onClick={() => item.src && setPreviewImage(item.src)}>
                              <img src={item.src} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              {!result.spillFound && i > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.3em]">NO_DATA</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-black/90 p-12 rounded-[2.5rem] border border-white/10">
                        <h4 className="text-[12px] font-bold text-[#0055FF] uppercase tracking-[0.5em] mb-6">Analytical Briefing</h4>
                        <p className="text-xl text-white/90 font-normal leading-relaxed italic border-l-4 border-[#0055FF] pl-10">"{result.description}"</p>
                      </div>
                   </div>
                 </div>
               )}

               {activeMenu === 'Visuals & Charts' && (
                 <div className="space-y-12">
                   <div className="flex flex-wrap gap-4 mb-8">
                      {CHART_TYPES.map(type => (
                        <button key={type} onClick={() => toggleChart(type)} className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all ${activeCharts.includes(type) ? 'bg-[#0055FF] text-white shadow-[0_0_15px_rgba(0,85,255,0.4)]' : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/30'}`}>{type}</button>
                      ))}
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {activeCharts.includes('History') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5"><h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10">Training Progression</h3><PerformanceChart result={result} /></div>
                      )}
                      {activeCharts.includes('Metrics') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5"><h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10">Final Fidelity Metrics</h3><MetricsBarChart result={result} /></div>
                      )}
                      {activeCharts.includes('Radar Signature') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center">
                           <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10 w-full text-left">Radar Spectral Signature</h3>
                           {result ? (
                             <div className="w-full h-80"><ResponsiveContainer><RadarChart data={result.radarMetrics}><PolarGrid stroke="#334155"/><PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10}/><Radar name="Spill Signature" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.4}/></RadarChart></ResponsiveContainer></div>
                           ) : (<div className="flex-1 flex items-center text-white/10 italic">Awaiting mission analysis...</div>)}
                        </div>
                      )}
                      {activeCharts.includes('Scatter Path') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center">
                           <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10 w-full text-left">Inference Scatter Path</h3>
                           {result ? (
                             <ScatterPathChart result={result} />
                           ) : (<div className="flex-1 flex items-center text-white/10 italic">Awaiting mission analysis...</div>)}
                        </div>
                      )}
                      {activeCharts.includes('Hybrid View') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center">
                           <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10 w-full text-left">Hybrid Metric Correlation</h3>
                           <HybridMetricChart result={result} />
                        </div>
                      )}
                      {activeCharts.includes('Area Density') && (
                        <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center">
                           <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10 w-full text-left">Spectral Area Density</h3>
                           {result ? (
                             <AreaDensityChart result={result} />
                           ) : (<div className="flex-1 flex items-center text-white/10 italic">Awaiting mission analysis...</div>)}
                        </div>
                      )}
                      {activeCharts.includes('Inference Pie') && (
                         <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-10 w-full text-left">Inference Path Confidence</h3>
                            {result ? (
                              <div className="w-full h-80"><ResponsiveContainer><PieChart><Pie data={result.inferencePath} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="probability"><Cell fill={COLORS.primary}/><Cell fill="#1e293b"/></Pie><Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}}/></PieChart></ResponsiveContainer></div>
                            ) : (<div className="flex-1 flex items-center text-white/10 italic">Awaiting mission analysis...</div>)}
                         </div>
                      )}
                   </div>
                 </div>
               )}

               {activeMenu === 'Download Options' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="glass-panel p-16 rounded-[4rem] text-center border-white/5">
                     <i className="fa-solid fa-file-pdf text-4xl mb-6 text-white/20"></i>
                     <h3 className="text-2xl font-cinzel font-bold text-white mb-6 uppercase tracking-widest">MISSION REPORT</h3>
                     <button onClick={exportReport} className="neon-btn-blue w-full py-4 rounded-xl font-bold uppercase tracking-widest">EXPORT_HTML</button>
                   </div>
                   <div className="glass-panel p-16 rounded-[4rem] text-center border-white/5">
                     <i className="fa-solid fa-images text-4xl mb-6 text-[#0055FF]/40"></i>
                     <h3 className="text-2xl font-cinzel font-bold text-white mb-6 uppercase tracking-widest">VISUAL ASSETS</h3>
                     <button onClick={exportAssets} className="neon-btn-blue w-full py-4 rounded-xl font-bold uppercase tracking-widest">DOWNLOAD_PNG</button>
                   </div>
                 </div>
               )}
             </div>
          </main>
        </div>
      )}
      
      <footer className="fixed bottom-0 left-0 right-0 p-10 text-center font-lexend font-bold uppercase z-[5] pointer-events-none opacity-20"><div className="text-[10px] text-white tracking-[2.5em]">Surveillance Core &copy; 2025</div></footer>
    </div>
  );
};

export default App;
