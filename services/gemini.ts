import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  // Initializing the AI client with the system-provided API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Professional technical prompt optimized for speed and U-Net logic
  const prompt = `
    Perform high-speed maritime oil spill detection on this SAR image.
    1. Apply simulated Lee filtering for speckle noise reduction.
    2. Segment low-backscatter regions (potential slicks).
    3. Calculate IoU and confidence based on feature gradient sharpness.
    
    Return a technical JSON report:
    - spillFound: boolean
    - confidence: 0.0-1.0
    - iou: 0.0-1.0
    - areaEstimate: "string with units"
    - coordinates: [{x, y, w, h}]
    - description: Technical summary
    - environmentalImpact: Impact assessment
    - technicalDetails: {spectralSignature, denoisingStatus, segmentationFidelity}
    - radarMetrics: [{subject, value, fullMark}]
    - inferencePath: [{step, probability}]
  `;

  try {
    const response = await ai.models.generateContent({
      // Switched to Flash for high-speed multimodal performance
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
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
                }
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
              }
            },
            radarMetrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  fullMark: { type: Type.NUMBER }
                }
              }
            },
            inferencePath: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.NUMBER },
                  probability: { type: Type.NUMBER }
                }
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
    if (!text) throw new Error("Empty response from analysis engine");
    
    return JSON.parse(text) as DetectionResult;
  } catch (error) {
    console.error("Neural Pipeline Execution Failed:", error);
    throw error;
  }
};