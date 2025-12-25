
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell 
} from 'recharts';
import { MOCK_TRAINING_HISTORY, COLORS } from '../constants';

export const PerformanceChart: React.FC = () => {
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
            label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
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

export const MetricsBarChart: React.FC = () => {
  const final = MOCK_TRAINING_HISTORY[MOCK_TRAINING_HISTORY.length - 1];
  const data = [
    { name: 'Train Loss', value: final.trainLoss, color: COLORS.danger },
    { name: 'Val IoU', value: final.valIoU, color: COLORS.secondary },
    { name: 'Val Accuracy', value: final.valAccuracy / 100, color: COLORS.primary }
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 40, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis type="category" dataKey="name" stroke="#f8fafc" fontSize={12} width={100} />
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
