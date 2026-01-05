
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
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="epoch" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0A192F', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
            itemStyle={{ fontSize: '12px', color: '#F1F5F9' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area 
            type="monotone" 
            dataKey="valIoU" 
            name="Validation IoU"
            stroke={COLORS.primary} 
            fillOpacity={1} 
            fill="url(#colorIoU)" 
            strokeWidth={3}
          />
          {result && (
            <ReferenceLine 
              y={result.iou} 
              stroke={COLORS.success} 
              strokeDasharray="3 3" 
              label={{ position: 'top', value: 'Current Mission', fill: COLORS.success, fontSize: 10, fontWeight: 'bold' }} 
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
      color: COLORS.success 
    },
    { 
      name: 'Fidelity Score', 
      value: result ? result.technicalDetails.segmentationFidelity : 0.85, 
      color: COLORS.info 
    }
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 40, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} width={100} tickLine={false} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#0A192F', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px' }}
             itemStyle={{ color: '#F1F5F9' }}
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
          <CartesianGrid stroke="#1e293b" />
          <XAxis type="number" dataKey="x" name="Step" stroke="#94a3b8" unit="" fontSize={10} />
          <YAxis type="number" dataKey="y" name="Confidence" stroke="#94a3b8" unit="%" fontSize={10} />
          <ZAxis type="number" dataKey="z" range={[60, 400]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0A192F', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px' }} itemStyle={{ color: '#F1F5F9' }} />
          <Scatter name="Path" data={data} fill={COLORS.primary} line stroke={COLORS.primary} strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const HybridMetricChart: React.FC<{ result?: DetectionResult | null }> = ({ result }) => {
  const data = MOCK_TRAINING_HISTORY.map((item, idx) => ({
    ...item,
    currentMissionIoU: result ? result.iou : null,
    currentConfidence: result && idx === MOCK_TRAINING_HISTORY.length - 1 ? result.confidence * 100 : null
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={10} />
          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} />
          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#0A192F', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px' }} itemStyle={{ color: '#F1F5F9' }} />
          <Legend />
          <Bar yAxisId="left" dataKey="valAccuracy" name="History Accuracy %" fill={COLORS.primary} fillOpacity={0.1} radius={[4, 4, 0, 0]} />
          {result && (
             <Line yAxisId="left" type="monotone" dataKey="currentConfidence" name="Current Confidence" stroke={COLORS.primary} strokeWidth={4} dot={{ r: 8, fill: COLORS.primary }} />
          )}
          <Line yAxisId="right" type="monotone" dataKey="trainLoss" name="Model Loss History" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 4 }} />
          {result && (
            <ReferenceLine yAxisId="left" y={result.iou * 100} stroke={COLORS.success} label={{ position: 'right', value: 'Mission IoU', fill: COLORS.success, fontSize: 10 }} strokeDasharray="3 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AreaDensityChart: React.FC<{ result: DetectionResult }> = ({ result }) => {
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
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#0A192F', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px' }} itemStyle={{ color: '#F1F5F9' }} />
          <Area type="monotone" dataKey="density" name="Reflective Density" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorDensity)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
