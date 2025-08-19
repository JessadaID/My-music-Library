"use client";

import { useEffect, useRef } from "react";

interface PixelImageProps {
  src: string;       // รูปที่ต้องการแปลง
  pixelSize?: number; // จำนวน pixel ในแนวกว้าง (default: 64)
  scale?: number;     // ขยายผลลัพธ์ (default: 5)
  colorLevels?: number; // จำนวนขั้นสีต่อ channel (default: 6)
}

export default function PixelImage({
  src,
  pixelSize = 64,
  scale = 5,
  colorLevels = 12,
}: PixelImageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // เผื่อโหลดจาก domain อื่น
    img.src = src;

    img.onload = () => {
      const tmp = document.createElement("canvas");
      tmp.width = pixelSize;
      tmp.height = pixelSize ;
      const tctx = tmp.getContext("2d", { alpha: false });
      if (!tctx) return;

      // Crop and center the image to fill the canvas (like object-fit: cover)
      const imageAspect = img.width / img.height;
      const canvasAspect = 1; // Since pixelSize x pixelSize is a square

      let sx = 0,
        sy = 0,
        sWidth = img.width,
        sHeight = img.height;

      // Remove 50px from top and bottom
      sy = 50;
      sHeight = img.height - 100;
      if (sHeight < 0) sHeight = 0; // Ensure sHeight is not negative
      // วาดรูปย่อให้เล็กมาก เพื่อให้พิกเซลใหญ่เวลา scale
      tctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, pixelSize, pixelSize);

      // อ่าน pixel แล้วลดจำนวนสี
      try {
        const imageData = tctx.getImageData(0, 0, pixelSize, pixelSize);
        const data = imageData.data;
        const step = 255 / (colorLevels - 1);

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / step) * step;     // R
          data[i + 1] = Math.round(data[i + 1] / step) * step; // G
          data[i + 2] = Math.round(data[i + 2] / step) * step; // B
        }
        tctx.putImageData(imageData, 0, 0);
      } catch (err) {
        console.warn("Posterize skipped (CORS blocked)", err);
      }

      // วาดไปยัง canvas หลัก
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = pixelSize * scale;
      canvas.height = pixelSize * scale -100;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false; // ปิด anti-alias
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    };
  }, [src, pixelSize, scale, colorLevels]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        backgroundColor: "#000",
        width: "100%",
        height: "auto",
      }}
    />
  );
}
