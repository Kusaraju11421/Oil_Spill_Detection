
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DetectionResult } from "../types";

const apiKey = process.env.API_KEY;
const ai = apiKey && apiKey !== "undefined" ? new GoogleGenAI({ apiKey }) : null;

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  if (!ai) {
    throw new Error("API_KEY_NOT_FOUND: The maritime satellite uplink requires a valid API key in the environment.");
  }

  const prompt = `
    ACT AS A SENIOR MARITIME SATELLITE ANALYST.
    
    TASK:
    1. ANALYZE the provided image for oil spill anomalies.
    2. DETECT contours of oil spills and permanent features (land/structures).
    3. PROVIDE THREE SEPARATE SETS OF POLYGONS:
       - "groundTruthPolygons": Actual spill boundaries.
       - "predictedPolygons": AI model's estimated spill boundaries. (Must have slight variations from GT).
       - "landPolygons": Boundaries of land, shorelines, or prominent structures visible in the image.
    4. GENERATE a technical briefing in JSON format.

    JSON STRUCTURE:
    {
      "spillFound": boolean,
      "confidence": float,
      "iou": float,
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

    The polygons should use organic, flexible lines. Output ONLY the JSON.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("CORE_FAULT: Analysis payload not received.");

    const cleanedJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("PARSING_ERROR: Invalid model output format.");

    return JSON.parse(jsonMatch[0]) as DetectionResult;
  } catch (error: any) {
    console.error("ANALYSIS_FAILURE:", error);
    throw error;
  }
};
