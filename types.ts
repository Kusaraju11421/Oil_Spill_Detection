
export interface Point {
  x: number;
  y: number;
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
  groundTruthPolygons: Point[][]; 
  predictedPolygons: Point[][];
  landPolygons: Point[][]; // Polygons for "other features" to be rendered in Green
  description: string;
  environmentalImpact: string;
  technicalDetails: {
    spectralSignature: string;
    denoisingStatus: string;
    segmentationFidelity: number;
  };
  radarMetrics: MetricPoint[];
  inferencePath: { step: number; probability: number }[];
  visuals?: {
    input: string;      
    mask: string;       // Image 2: Ground Truth (Black Spill, Green Land, White Water)
    predicted: string;  // Image 3: Predicted Mask (Black Spill, White Background)
    overlay: string;    // Image 4: Final Overlay (Green Tint + Grey Spill)
  };
}

export interface TrainingMetricPoint {
  epoch: number;
  trainLoss: number;
  valIoU: number;
  valAccuracy: number;
}
