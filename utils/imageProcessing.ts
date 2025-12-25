
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Simulate the logic of the Python Lee filter for visual flair in the UI
export const simulateLeeFilter = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Real Lee filter is complex for JS without heavy libs, 
  // so we'll simulate a "SAR Denoised" look with a subtle blur/sharpen effect
  ctx.filter = 'contrast(1.2) grayscale(0.2) brightness(1.1)';
  // Logic here could actually manipulate pixel buffer if needed
};
