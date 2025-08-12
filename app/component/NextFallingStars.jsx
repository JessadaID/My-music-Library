"use client"

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

export default function NextFallingStars({
  count = 5,
  maxSize = 24,
  speedMultiplier = 0.5,
  className = "",
}) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  const animRef = useRef(null);
  const starsRef = useRef([]);
  const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const nextLogoSvg = theme === "dark" ? "./snow-8bit.webp" : "./left-8bit.webp";
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    function resizeCanvas() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const logoImg = new Image();
    logoImg.src = nextLogoSvg;
    logoImg.onload = () => {
      initStars();
      start();
    };

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function initStars() {
      const arr = [];
      for (let i = 0; i < count; i++) {
        const size = rand(12, maxSize);
        const vy = rand(30, 60) * (size / maxSize) * speedMultiplier;
        const vx = rand(-5, 5);
        arr.push({
          x: rand(0, width),
          y: rand(-height, -size),
          vy,
          vx,
          size,
          rot: rand(0, Math.PI * 2),
          spin: rand(-0.8, 0.8),
          opacity: rand(0.6, 0.9),
        });
      }
      starsRef.current = arr;
    }

    let last = performance.now();

    function step(now) {
      const dt = (now - last) / 1000;
      last = now;
      drawFrame(dt, ctx, logoImg);
      animRef.current = requestAnimationFrame(step);
    }

    function start() {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      last = performance.now();
      animRef.current = requestAnimationFrame(step);
    }

    function stop() {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    function drawFrame(dt, ctx, logoImg) {
      ctx.clearRect(0, 0, width, height);

      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.y += s.vy * dt;
        s.x += s.vx * dt;
        s.rot += s.spin * dt;

        // Reset position when star falls off screen
        if (s.y - s.size > height) {
          s.y = rand(-height * 0.5, -s.size);
          s.x = rand(0, width);
        }

        // Keep horizontal position in bounds
        if (s.x < -s.size) s.x = width + s.size;
        if (s.x > width + s.size) s.x = -s.size;

        ctx.save();
        const px = Math.round(s.x);
        const py = Math.round(s.y);
        ctx.translate(px + s.size / 2, py + s.size / 2);
        ctx.rotate(s.rot);
        ctx.globalAlpha = s.opacity;
        ctx.drawImage(logoImg, -s.size / 2, -s.size / 2, s.size, s.size);
        ctx.restore();

        // Removed the sparkle/dot effect below the image
      }
    }

    return () => {
      stop();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [count, maxSize, speedMultiplier, devicePixelRatio, nextLogoSvg, mounted]);

  if (!mounted) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}