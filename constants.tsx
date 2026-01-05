import { TrainingMetricPoint } from './types';

export const COLORS = {
  primary: '#0055FF', // Electric Blue
  secondary: '#E4E4E4', // Silver Mist
  danger: '#FF0000', // Pure Red
  warning: '#FF4D00', // Neon Orange (Accent)
  dark: '#000000', // Pure Black
  surface: '#0A0A0A', // Near Black Surface
  lightGray: '#94A3B8', 
  gray: '#475569', 
  border: '#1E293B' 
};

export const MOCK_TRAINING_HISTORY: TrainingMetricPoint[] = [
  { epoch: 1, trainLoss: 0.85, valIoU: 0.42, valAccuracy: 78.5 },
  { epoch: 5, trainLoss: 0.62, valIoU: 0.58, valAccuracy: 84.2 },
  { epoch: 10, trainLoss: 0.45, valIoU: 0.69, valAccuracy: 89.1 },
  { epoch: 15, trainLoss: 0.38, valIoU: 0.74, valAccuracy: 92.5 },
  { epoch: 20, trainLoss: 0.31, valIoU: 0.81, valAccuracy: 94.8 },
  { epoch: 25, trainLoss: 0.28, valIoU: 0.84, valAccuracy: 96.2 },
  { epoch: 30, trainLoss: 0.25, valIoU: 0.88, valAccuracy: 97.4 },
];

export const MODEL_METRICS = {
  bestIoU: 0.884,
  finalAccuracy: 97.42,
  trainLoss: 0.245,
  patience: 7,
  imgSize: 128
};