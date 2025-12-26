import { Coordinate } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Generates a high-contrast segmentation mask.
 * Instead of pure black, we use a deep textured navy background to ensure
 * the canvas isn't perceived as "broken" or "empty" if detections are small.
 */
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

      // Background: Deep tactical navy (darker than pure black for depth)
      ctx.fillStyle = "#050B18"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!coords || coords.length === 0) {
        ctx.fillStyle = "rgba(0, 85, 255, 0.2)";
        ctx.font = `bold ${canvas.width / 15}px Lexend`;
        ctx.textAlign = "center";
        ctx.fillText("NO_ANOMALY_DETECTED", canvas.width / 2, canvas.height / 2);
      }

      coords.forEach(c => {
        const x = (c.x / 100) * canvas.width;
        const y = (c.y / 100) * canvas.height;
        const w = (c.w / 100) * canvas.width;
        const h = (c.h / 100) * canvas.height;

        // Base Highlight (Electric Blue Gradient)
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, "#0055FF");
        gradient.addColorStop(1, "#001133");

        ctx.fillStyle = gradient;
        ctx.shadowBlur = canvas.width / 15;
        ctx.shadowColor = "#0055FF"; 
        ctx.fillRect(x, y, w, h);
        
        // Outer Glow Stroke
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#0055FF";
        ctx.lineWidth = Math.max(6, canvas.width / 100);
        ctx.strokeRect(x, y, w, h);

        // Inner Sharp Highlight (White)
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = Math.max(2, canvas.width / 300);
        ctx.strokeRect(x + (ctx.lineWidth), y + (ctx.lineWidth), w - (ctx.lineWidth * 2), h - (ctx.lineWidth * 2));
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};

/**
 * Overlays detections on top of the original SAR image with extreme vibrancy.
 */
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

      ctx.drawImage(img, 0, 0);

      coords.forEach(c => {
        const x = (c.x / 100) * canvas.width;
        const y = (c.y / 100) * canvas.height;
        const w = (c.w / 100) * canvas.width;
        const h = (c.h / 100) * canvas.height;

        // 1. Heavy Neon Outer Glow
        ctx.strokeStyle = "#0055FF"; 
        ctx.lineWidth = Math.max(12, canvas.width / 50);
        ctx.shadowBlur = 60;
        ctx.shadowColor = "rgba(0, 85, 255, 1)";
        ctx.strokeRect(x, y, w, h);

        // 2. Translucent Pulse Fill
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(0, 85, 255, 0.45)";
        ctx.fillRect(x, y, w, h);
        
        // 3. Crisp White Edge Detail for visibility against dark SAR images
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.lineWidth = Math.max(3, canvas.width / 250);
        ctx.strokeRect(x, y, w, h);
        
        // 4. Label (Optional Visual Aid)
        ctx.fillStyle = "#0055FF";
        const fontSize = Math.max(14, canvas.width / 40);
        ctx.font = `bold ${fontSize}px Lexend`;
        ctx.fillText("DETECTED_OIL", x, y - 10);
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = originalImage;
  });
};