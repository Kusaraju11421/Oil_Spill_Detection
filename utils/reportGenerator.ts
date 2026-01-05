
import { DetectionResult, TrainingMetricPoint, MetricPoint } from "../types";
import { COLORS } from "../constants";

/**
 * Generates a simple SVG for the Training Performance Area Chart
 */
export const generatePerformanceSvg = (history: TrainingMetricPoint[], result?: DetectionResult | null): string => {
  const width = 800;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = 1.0;
  const getX = (i: number) => padding + (i / (history.length - 1)) * chartWidth;
  const getY = (val: number) => height - padding - (val / maxVal) * chartHeight;

  let areaPath = `M ${getX(0)} ${height - padding}`;
  history.forEach((point, i) => {
    areaPath += ` L ${getX(i)} ${getY(point.valIoU)}`;
  });
  areaPath += ` L ${getX(history.length - 1)} ${height - padding} Z`;

  let missionRefLine = '';
  if (result) {
    const missionY = getY(result.iou);
    missionRefLine = `
      <line x1="${padding}" y1="${missionY}" x2="${width - padding}" y2="${missionY}" stroke="${COLORS.success}" stroke-width="2" stroke-dasharray="5,5" />
      <text x="${width - padding - 100}" y="${missionY - 5}" fill="${COLORS.success}" font-size="10" font-weight="bold">MISSION IoU</text>
    `;
  }

  return `
    <svg width="100%" height="200" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#1a1914" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#1a1914" />
      <path d="${areaPath}" fill="${COLORS.primary}" fill-opacity="0.1" stroke="${COLORS.primary}" stroke-width="2" />
      ${missionRefLine}
      <text x="${padding}" y="${height - 10}" fill="rgba(255, 244, 213, 0.2)" font-size="10">Training Start</text>
      <text x="${width - padding - 60}" y="${height - 10}" fill="rgba(255, 244, 213, 0.2)" font-size="10">Latest Epoch</text>
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
    { label: 'IoU Fidelity', val: result.iou, color: COLORS.success },
    { label: 'Segmentation', val: result.technicalDetails.segmentationFidelity, color: COLORS.secondary }
  ];

  let bars = '';
  metrics.forEach((m, i) => {
    const y = i * rowHeight + padding;
    const barW = (width - padding * 2 - labelWidth) * m.val;
    bars += `
      <text x="${padding}" y="${y + 20}" fill="rgba(255, 244, 213, 0.4)" font-size="11" font-weight="bold">${m.label.toUpperCase()}</text>
      <rect x="${padding + labelWidth}" y="${y}" width="${width - padding * 2 - labelWidth}" height="25" fill="#0c0b06" rx="4" />
      <rect x="${padding + labelWidth}" y="${y}" width="${barW}" height="25" fill="${m.color}" rx="4" />
      <text x="${padding + labelWidth + barW + 10}" y="${y + 18}" fill="#FFF4D5" font-size="12" font-weight="bold">${(m.val * 100).toFixed(1)}%</text>
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
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / metrics.length;

  let grid = '';
  [0.2, 0.4, 0.6, 0.8, 1].forEach(r => {
    let path = `M ${center + radius * r} ${center}`;
    for (let i = 1; i <= metrics.length; i++) {
      const angle = i * angleStep;
      path += ` L ${center + radius * r * Math.cos(angle)} ${center + radius * r * Math.sin(angle)}`;
    }
    grid += `<path d="${path} Z" fill="none" stroke="#1a1914" stroke-width="1" />`;
  });

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
      <path d="${polyPath}" fill="${COLORS.primary}" fill-opacity="0.2" stroke="${COLORS.primary}" stroke-width="2" />
      ${metrics.map((m, i) => {
        const angle = i * angleStep;
        const x = center + (radius + 25) * Math.cos(angle);
        const y = center + (radius + 25) * Math.sin(angle);
        return `<text x="${x}" y="${y}" fill="rgba(255, 244, 213, 0.4)" font-size="9" text-anchor="middle" font-weight="bold">${m.subject.toUpperCase()}</text>`;
      }).join('')}
    </svg>
  `;
};
