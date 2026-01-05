
import { TrainingMetricPoint } from './types';

export const COLORS = {
  primary: '#F97316', // Orange
  secondary: '#0A192F', // Navy Blue
  success: '#4ADE80', // Light Green
  danger: '#EF4444', // Red
  info: '#0055FF', // Blue
  white: '#FFFFFF', // White
  dark: '#000000', // Black
  text: '#F1F5F9', // Slate Light text
  border: 'rgba(249, 115, 22, 0.2)' // Orange tint border
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
