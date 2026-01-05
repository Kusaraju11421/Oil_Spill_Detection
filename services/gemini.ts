
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DetectionResult } from "../types";

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_NOT_FOUND: The maritime satellite uplink requires a valid API key.");
  }

  // Guidelines: Create a new instance right before making an API call.
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    ACT AS A SENIOR MARITIME SAR (SYNTHETIC APERTURE RADAR) ANALYST.
    
    CORE OBJECTIVE:
    Identify oil spill anomalies in SAR imagery. 
    
    CRITICAL RULES FOR CLEAN WATER:
    - If the image contains clean water, uniform sea state, or natural wave patterns with NO oil anomalies, "spillFound" MUST be false.
    - Do not mistake natural slicks (biogenic), wind-shaded zones, or cloud shadows for oil.
    - If "spillFound" is false: set "iou" to 0, "confidence" to the certainty of it being clean water, and ALL polygon arrays must be empty [].

    DETECTION CHARACTERISTICS:
    - Oil spills: Smoother, darker patches (lower backscatter) with organic/elongated shapes.
    - Land/Features: High backscatter, static structures.

    Output MUST be a valid JSON matching the specified structure.
  `;

  const prompt = `
    Analyze this maritime imagery for oil spill anomalies.
    
    JSON STRUCTURE REQUIRED:
    {
      "spillFound": boolean,
      "confidence": float (0.0 to 1.0),
      "iou": float (0.0 to 1.0),
      "areaEstimate": string,
      "groundTruthPolygons": [[{"x": percent, "y": percent}]], 
      "predictedPolygons": [[{"x": percent, "y": percent}]],
      "landPolygons": [[{"x": percent, "y": percent}]],
      "description": string,
      "environmentalImpact": string,
      "technicalDetails": {
        "spectralSignature": string,
        "denoisingStatus": string,
        "segmentationFidelity": float
      },
      "radarMetrics": [{"subject": string, "value": number, "fullMark": number}],
      "inferencePath": [{"step": number, "probability": number}]
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("CORE_FAULT: Analysis payload empty.");

    // The response is already requested as JSON, so we just parse it.
    return JSON.parse(jsonStr) as DetectionResult;
  } catch (error: any) {
    console.error("ANALYSIS_FAILURE:", error);
    throw error;
  }
};
