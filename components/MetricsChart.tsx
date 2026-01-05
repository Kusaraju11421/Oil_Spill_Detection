
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, ScatterChart, Scatter, ZAxis, ComposedChart, ReferenceLine
} from 'recharts';
import { MOCK_TRAINING_HISTORY, COLORS } from '../constants';
import { DetectionResult } from '../types';

export const PerformanceChart: React.FC<{ result?: DetectionResult | null }> = ({ result }) => {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={MOCK_TRAINING_HISTORY}>
          <defs>
            <linearGradient id="colorIoU" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="epoch" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area 
            type="monotone" 
            dataKey="valIoU" 
            name="Validation IoU"
            stroke={COLORS.secondary} 
            fillOpacity={1} 
            fill="url(#colorIoU)" 
            strokeWidth={3}
          />
          {result && (
            <ReferenceLine 
              y={result.iou} 
              stroke={COLORS.primary} 
              strokeDasharray="3 3" 
              label={{ position: 'top', value: 'Current Mission', fill: COLORS.primary, fontSize: 10 }} 
            />
          )}
          <Area 
            type="monotone" 
            dataKey="trainLoss" 
            name="Training Loss"
            stroke={COLORS.danger} 
            fillOpacity={1} 
            fill="url(#colorLoss)" 
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MetricsBarChart: React.FC<{ result?: DetectionResult | null }> = ({ result }) => {
  // Use real result data if available, otherwise fallback to final mock point
  const final = MOCK_TRAINING_HISTORY[MOCK_TRAINING_HISTORY.length - 1];
  
  const data = [
    { 
      name: 'Model Confidence', 
      value: result ? result.confidence : final.valAccuracy / 100, 
      color: COLORS.primary 
    },
    { 
      name: 'Segmentation IoU', 
      value: result ? result.iou : final.valIoU, 
      color: COLORS.secondary 
    },
    { 
      name: 'Fidelity Score', 
      value: result ? result.technicalDetails.segmentationFidelity : 0.85, 
      color: COLORS.warning 
    }
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 40, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis type="category" dataKey="name" stroke="#f8fafc" fontSize={10} width={100} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ScatterPathChart: React.FC<{ result: DetectionResult }> = ({ result }) => {
  const data = result.inferencePath.map(p => ({ x: p.step, y: p.probability * 100, z: 100 }));
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid stroke="#334155" />
          <XAxis type="number" dataKey="x" name="Step" stroke="#94a3b8" unit="" fontSize={10} />
          <YAxis type="number" dataKey="y" name="Confidence" stroke="#94a3b8" unit="%" fontSize={10} />
          <ZAxis type="number" dataKey="z" range={[60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
          <Scatter name="Path" data={data} fill={COLORS.primary} line stroke={COLORS.primary} strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HybridMetricChart: React.FC<{ result?: DetectionResult | null }> = ({ result }) => {
  // If we have a result, we show the training history but highlight the current mission's performance relative to it
  const data = MOCK_TRAINING_HISTORY.map((item, idx) => ({
    ...item,
    currentMissionIoU: result ? result.iou : null,
    currentConfidence: result && idx === MOCK_TRAINING_HISTORY.length - 1 ? result.confidence * 100 : null
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="#334155" vertical={false} />
          <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={10} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
          <Legend />
          <Bar yAxisId="left" dataKey="valAccuracy" name="History Accuracy %" fill={COLORS.primary} fillOpacity={0.3} radius={[4, 4, 0, 0]} />
          {result && (
             <Line yAxisId="left" type="monotone" dataKey="currentConfidence" name="Current Confidence" stroke={COLORS.warning} strokeWidth={4} dot={{ r: 8, fill: COLORS.warning }} />
          )}
          <Line yAxisId="right" type="monotone" dataKey="trainLoss" name="Model Loss History" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 4 }} />
          {result && (
            <ReferenceLine yAxisId="left" y={result.iou * 100} stroke={COLORS.secondary} label="Mission IoU" strokeDasharray="3 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AreaDensityChart: React.FC<{ result: DetectionResult }> = ({ result }) => {
  // Generate a bell-curve like distribution based on the spill area for visual density
  const areaValue = parseFloat(result.areaEstimate.replace(/[^0-9.]/g, '')) || 50;
  const densityData = Array.from({ length: 20 }, (_, i) => {
    const x = i - 10;
    const density = Math.exp(-(x * x) / (areaValue / 5)) * areaValue;
    return { name: i, density: density };
  });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={densityData}>
          <defs>
            <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
          <Area type="monotone" dataKey="density" name="Reflective Density" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorDensity)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
