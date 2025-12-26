import { Coordinate } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const generatePredictedMask = async (originalImage: string, coords: Coordinate[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve("");

      // Background: Deep Technical Navy (instead of pure black)
      ctx.fillStyle = "#0f172a"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!coords || coords.length === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.font = `${canvas.width / 20}px Syncopate`;
        ctx.textAlign = "center";
        ctx.fillText("NO ANOMALIES DETECTED", canvas.width / 2, canvas.height / 2);
      }

      coords.forEach(c => {
        const x = (c.x / 100) * canvas.width;
        const y = (c.y / 100) * canvas.height;
        const w = (c.w / 100) * canvas.width;
        const h = (c.h / 100) * canvas.height;

        // Create a 2-color palette gradient (Rose to Teal)
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, "#ff0055"); // Obsidian Rose
        gradient.addColorStop(1, "#00e676"); // Neon Teal

        ctx.fillStyle = gradient;
        
        // Add glow effect using the palette colors
        ctx.shadowBlur = 25;
        ctx.shadowColor = "rgba(255, 0, 85, 0.6)"; 
        ctx.fillRect(x, y, w, h);
        
        // Reset shadow for the border
        ctx.shadowBlur = 0;
        
        // Secondary contrast border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1, canvas.width / 300);
        ctx.strokeRect(x, y, w, h);
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};

export const generateOverlay = async (originalImage: string, coords: Coordinate[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve("");

      // Draw original SAR data
      ctx.drawImage(img, 0, 0);

      coords.forEach(c => {
        const x = (c.x / 100) * canvas.width;
        const y = (c.y / 100) * canvas.height;
        const w = (c.w / 100) * canvas.width;
        const h = (c.h / 100) * canvas.height;

        // Dual-color border technique
        ctx.strokeStyle = "#ff0055";
        ctx.lineWidth = Math.max(4, canvas.width / 120);
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff0055";
        ctx.strokeRect(x, y, w, h);

        // Semi-transparent Teal fill for the detection zone
        ctx.fillStyle = "rgba(0, 230, 118, 0.35)";
        ctx.fillRect(x, y, w, h);
        
        // Inner technical markings
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#00e676";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};