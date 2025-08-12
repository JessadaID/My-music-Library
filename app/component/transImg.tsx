"use client";

import { useState, useEffect, useCallback } from "react";

const images = [
  { id: 1, src: "./y/y-1.jfif" },
  { id: 2, src: "./y/y-2.jfif" },
  { id: 3, src: "./y/y-3.jfif" },
  { id: 4, src: "./y/y-4.jfif" },

];

export default function TransImg() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const rotateImage = useCallback(() => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentImageIndex(prevIndex => {
        const nextIndex = Math.floor(Math.random() * images.length);
        // ป้องกันไม่ให้แสดงรูปเดิมซ้ำ (ถ้ามีรูปมากกว่า 1 รูป)
        return images.length > 1 && nextIndex === prevIndex 
          ? (nextIndex + 1) % images.length 
          : nextIndex;
      });
      
      // รอให้รูปใหม่โหลดแล้วค่อยจางเข้า
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300); // รอให้จางออกเสร็จก่อน
  }, []);

  useEffect(() => {
    // เริ่มต้นด้วยรูปแรก
    setCurrentImageIndex(0);
    
    // สร้าง interval สำหรับหมุนรูป
    const intervalId = setInterval(rotateImage, 30000);

    // Cleanup function - ล้าง interval เมื่อ component unmount
    return () => clearInterval(intervalId);
  }, [rotateImage]);

  const currentImage = images[currentImageIndex];

  return (
    <div style={{ position: 'relative', width: '300px', height: 'auto' }}>
      <img 
        src={currentImage.src} 
        alt={`Image ${currentImage.id}`} 
        width={300}
        loading="lazy"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          display: 'block'
        }}
      />
    </div>
  );
}