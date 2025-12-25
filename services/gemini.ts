import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing. Ensure it is set in Vercel project settings.");
  }

  // Creating a new instance per call to ensure the latest injected environment variables are used
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Perform high-speed maritime oil spill detection on this Synthetic Aperture Radar (SAR) image.
    Follow these mission-critical steps:
    1. Apply simulated speckle noise reduction for improved signal-to-noise ratio.
    2. Segment low-backscatter regions characteristic of oil slicks.
    3. Calculate segmentation IoU and confidence based on gradient edge sharpness.
    
    Return a comprehensive technical JSON report following this structure:
    - spillFound (boolean): True if a potential oil slick is identified.
    - confidence (float): Numerical certainty between 0.0 and 1.0.
    - iou (float): Intersection over Union score representing segmentation quality.
    - areaEstimate (string): Estimated spill size with metric units (e.g., "4.2 km²").
    - coordinates (array): Bounding boxes for detected slicks [{x, y, w, h}].
    - description (string): Professional analytical summary.
    - environmentalImpact (string): Impact level (Low, Moderate, Critical, Catastrophic).
    - technicalDetails (object): {spectralSignature, denoisingStatus, segmentationFidelity}.
    - radarMetrics (array): [{subject, value, fullMark}] for diagnostic radar plots.
    - inferencePath (array): [{step, probability}] mapping the decision process.
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
    console.error("ANALYSIS_ENGINE_FAULT_REPORT:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      api_key_present: !!process.env.API_KEY
    });
    throw error;
  }
};