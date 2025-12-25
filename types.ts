
export interface Coordinate {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MetricPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export interface DetectionResult {
  spillFound: boolean;
  confidence: number;
  iou: number;
  areaEstimate: string;
  coordinates: Coordinate[];
  description: string;
  environmentalImpact: string;
  technicalDetails: {
    spectralSignature: string;
    denoisingStatus: string;
    segmentationFidelity: number;
  };
  radarMetrics: MetricPoint[];
  inferencePath: { step: number; probability: number }[];
}

export interface TrainingMetricPoint {
  epoch: number;
  trainLoss: number;
  valIoU: number;
  valAccuracy: number;
}
