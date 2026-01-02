
import { Point } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const drawOrganicPolygons = (ctx: CanvasRenderingContext2D, polygons: Point[][], width: number, height: number, fillColor: string) => {
  polygons.forEach(polygon => {
    if (polygon.length < 3) return;
    ctx.beginPath();
    ctx.moveTo((polygon[0].x / 100) * width, (polygon[0].y / 100) * height);
    polygon.slice(1).forEach(point => {
      ctx.lineTo((point.x / 100) * width, (point.y / 100) * height);
    });
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  });
};

/**
 * Image 2: Ground Truth Mask
 * Oil Spill = Black, Land/Features = Green, Background = White
 */
export const generateGTReferenceMask = async (originalImage: string, spillPolygons: Point[][], landPolygons: Point[][]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve("");

      // Background: Pure White (Water)
      ctx.fillStyle = "#FFFFFF"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Features: Green (Shoreline/Land)
      drawOrganicPolygons(ctx, landPolygons, canvas.width, canvas.height, "#2ECC71");

      // Spill: Pure Black
      drawOrganicPolygons(ctx, spillPolygons, canvas.width, canvas.height, "#000000");

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};

/**
 * Image 3: Predicted Mask
 * Predicted Spill = Black, Remaining = White
 */
export const generatePredictedMask = async (originalImage: string, polygons: Point[][]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve("");

      // Background: Pure White
      ctx.fillStyle = "#FFFFFF"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Predicted Area: Pure Black
      drawOrganicPolygons(ctx, polygons, canvas.width, canvas.height, "#000000");

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};

/**
 * Image 4: Final Overlay
 * Green Tint + Grey Spill Area
 */
export const generateFinalOverlay = async (originalImage: string, polygons: Point[][]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve("");

      ctx.drawImage(img, 0, 0);
      
      // Global Green Tint
      ctx.fillStyle = "rgba(46, 204, 113, 0.2)"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Highlight Grey Overlay
      drawOrganicPolygons(ctx, polygons, canvas.width, canvas.height, "rgba(60, 60, 60, 0.5)");

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};
