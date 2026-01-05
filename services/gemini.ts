
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DetectionResult } from "../types";

// Always use a direct initialization from process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeOilSpill = async (imageBase64: string): Promise<DetectionResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY_NOT_FOUND: The maritime satellite uplink requires a valid API key in the environment.");
  }

  // Refined prompt to handle "False Positives" and strictly detect clean water scenarios.
  const prompt = `
    ACT AS A SENIOR MARITIME SAR (SYNTHETIC APERTURE RADAR) ANALYST.
    
    CORE OBJECTIVE:
    Identify oil spill anomalies in the provided imagery. 
    CRITICAL: If the image contains clean water, natural wave patterns, or typical sea state reflections with NO clear oil anomalies, you MUST report "spillFound": false.

    SPECIFIC DETECTION RULES:
    1. OIL CHARACTERISTICS: Oil spills typically appear as darker, smoother patches (lower backscatter) compared to the surrounding sea. They often have elongated, organic shapes following currents or ship wakes.
    2. FALSE POSITIVE PREVENTION: Do not mistake look-alikes such as natural slicks, wind-shaded areas, or cloud shadows for oil. If there is any doubt or the water is clearly uniform, report NO spill.
    3. NEGATIVE DETECTION: If no spill is found, "spillFound" must be false, "confidence" should be relative to the certainty of it being clean water, "iou" should be 0, and ALL polygon arrays must be empty [].

    TASK:
    - DETECT contours of oil spills (predicted and ground truth).
    - DETECT land or permanent maritime structures.
    - GENERATE a technical briefing in JSON format.

    JSON STRUCTURE:
    {
      "spillFound": boolean,
      "confidence": float (0.0 to 1.0),
      "iou": float (0.0 to 1.0),
      "areaEstimate": string (e.g., "0 sq km" if none),
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

    Output ONLY the valid JSON.
  `;

  try {
    // Using gemini-3-pro-preview for high-accuracy spatial reasoning tasks.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
