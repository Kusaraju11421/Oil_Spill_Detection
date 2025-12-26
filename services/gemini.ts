import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing. Ensure it is set in Vercel project settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Perform high-speed maritime oil spill detection on this Synthetic Aperture Radar (SAR) image.
    Mission Requirements:
    1. Identify all low-backscatter regions (dark patches) likely to be oil slicks.
    2. Provide coordinates as PERCENTAGES (0 to 100) relative to image dimensions.
    3. Calculate IoU and confidence based on edge sharpness and context.
    
    Return a technical JSON report:
    - spillFound (boolean): True if slicks are detected.
    - confidence (float): 0.0 to 1.0.
    - iou (float): 0.0 to 1.0.
    - areaEstimate (string): Metric estimate (e.g., "1.5 km²").
    - coordinates (array): [{x, y, w, h}] where all values are 0-100.
    - description (string): Analytical summary.
    - environmentalImpact (string): Impact level (Low, Moderate, Critical).
    - technicalDetails (object): {spectralSignature, denoisingStatus, segmentationFidelity}.
    - radarMetrics (array): [{subject, value, fullMark}] for radar charts.
    - inferencePath (array): [{step, probability}] mapping the process.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spillFound: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            iou: { type: Type.NUMBER },
            areaEstimate: { type: Type.STRING },
            coordinates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  w: { type: Type.NUMBER },
                  h: { type: Type.NUMBER }
                },
                required: ["x", "y", "w", "h"]
              }
            },
            description: { type: Type.STRING },
            environmentalImpact: { type: Type.STRING },
            technicalDetails: {
              type: Type.OBJECT,
              properties: {
                spectralSignature: { type: Type.STRING },
                denoisingStatus: { type: Type.STRING },
                segmentationFidelity: { type: Type.NUMBER }
              },
              required: ["spectralSignature", "denoisingStatus", "segmentationFidelity"]
            },
            radarMetrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  fullMark: { type: Type.NUMBER }
                },
                required: ["subject", "value", "fullMark"]
              }
            },
            inferencePath: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.NUMBER },
                  probability: { type: Type.NUMBER }
                },
                required: ["step", "probability"]
              }
            }
          },
          required: [
            "spillFound", "confidence", "iou", "areaEstimate", "coordinates", 
            "description", "environmentalImpact", "technicalDetails", 
            "radarMetrics", "inferencePath"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Null response received from the neural processing core.");
    
    return JSON.parse(text) as DetectionResult;
  } catch (error: any) {
    console.error("ANALYSIS_ENGINE_FAULT_REPORT:", error);
    throw error;
  }
};