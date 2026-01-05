
import { DetectionResult, TrainingMetricPoint, MetricPoint } from "../types";
import { COLORS } from "../constants";

/**
 * Generates a simple SVG for the Training Performance Area Chart
 */
export const generatePerformanceSvg = (history: TrainingMetricPoint[]): string => {
  const width = 800;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = 100;
  const getX = (i: number) => padding + (i / (history.length - 1)) * chartWidth;
  const getY = (val: number) => height - padding - (val / maxVal) * chartHeight;

  // Paths
  let areaPath = `M ${getX(0)} ${height - padding}`;
  let linePath = `M ${getX(0)} ${getY(history[0].valAccuracy)}`;
  
  history.forEach((point, i) => {
    const x = getX(i);
    const y = getY(point.valAccuracy);
    areaPath += ` L ${x} ${y}`;
    linePath += ` L ${x} ${y}`;
  });
  
  areaPath += ` L ${getX(history.length - 1)} ${height - padding} Z`;

  return `
    <svg width="100%" height="200" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505" />
      <path d="${areaPath}" fill="${COLORS.primary}" fill-opacity="0.2" />
      <path d="${linePath}" fill="none" stroke="${COLORS.primary}" stroke-width="3" />
      <text x="${padding}" y="${height - 5}" fill="#666" font-size="12">Epoch 1</text>
      <text x="${width - padding - 60}" y="${height - 5}" fill="#666" font-size="12">Epoch ${history[history.length-1].epoch}</text>
    </svg>
  `;
};

/**
 * Generates a simple SVG for the Mission Fidelity Bar Chart
 */
export const generateMetricsBarSvg = (result: DetectionResult): string => {
  const width = 800;
  const rowHeight = 60;
  const padding = 40;
  const labelWidth = 150;
  
  const metrics = [
    { label: 'Confidence', val: result.confidence, color: COLORS.primary },
    { label: 'IoU Fidelity', val: result.iou, color: COLORS.secondary },
    { label: 'Segmentation', val: result.technicalDetails.segmentationFidelity, color: COLORS.warning }
  ];

  let bars = '';
  metrics.forEach((m, i) => {
    const y = i * rowHeight + padding;
    const barW = (width - padding * 2 - labelWidth) * m.val;
    bars += `
      <text x="${padding}" y="${y + 20}" fill="#94A3B8" font-size="12" font-weight="bold">${m.label.toUpperCase()}</text>
      <rect x="${padding + labelWidth}" y="${y}" width="${width - padding * 2 - labelWidth}" height="25" fill="#111" rx="4" />
      <rect x="${padding + labelWidth}" y="${y}" width="${barW}" height="25" fill="${m.color}" rx="4" />
      <text x="${padding + labelWidth + barW + 10}" y="${y + 18}" fill="#fff" font-size="12">${(m.val * 100).toFixed(1)}%</text>
    `;
  });

  return `
    <svg width="100%" height="${metrics.length * rowHeight + padding}" viewBox="0 0 ${width} ${metrics.length * rowHeight + padding}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505" />
      ${bars}
    </svg>
  `;
};

/**
 * Generates a simple SVG for the Radar Signature Chart
 */
export const generateRadarSvg = (metrics: MetricPoint[]): string => {
  const size = 400;
  const center = size / 2;
  const radius = size * 0.4;
  const angleStep = (Math.PI * 2) / metrics.length;

  // Grid
  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach(r => {
    let path = `M ${center + radius * r} ${center}`;
    for (let i = 1; i <= metrics.length; i++) {
      const angle = i * angleStep;
      path += ` L ${center + radius * r * Math.cos(angle)} ${center + radius * r * Math.sin(angle)}`;
    }
    grid += `<path d="${path}" fill="none" stroke="#222" stroke-width="1" />`;
  });

  // Data Polygon
  let polyPath = '';
  metrics.forEach((m, i) => {
    const angle = i * angleStep;
    const r = (m.value / m.fullMark) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    polyPath += (i === 0 ? 'M' : ' L') + ` ${x} ${y}`;
  });
  polyPath += ' Z';

  return `
    <svg width="100%" height="300" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505" />
      ${grid}
      <path d="${polyPath}" fill="${COLORS.primary}" fill-opacity="0.4" stroke="${COLORS.primary}" stroke-width="2" />
      ${metrics.map((m, i) => {
        const angle = i * angleStep;
        const x = center + (radius + 20) * Math.cos(angle);
        const y = center + (radius + 20) * Math.sin(angle);
        return `<text x="${x}" y="${y}" fill="#666" font-size="10" text-anchor="middle" dominant-baseline="middle">${m.subject}</text>`;
      }).join('')}
    </svg>
  `;
};
