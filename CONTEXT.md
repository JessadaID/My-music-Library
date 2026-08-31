# Context & Architectural Overview

## Project Name
**MineTube / My Music Library**

## Description
แอปพลิเคชันคลังเพลง Next.js ที่เล่นเพลงจาก YouTube IFrame API พร้อมฟีเจอร์ AI Assistant (Groq LLM) ช่วยจัดการเพลย์ลิสต์, ค้นหาเพลงอัตโนมัติ, Picture-in-Picture (PiP), และระบบ Media Session.

---

## Tech Stack
- **Framework:** Next.js (App Router, Turbopack)
- **Language:** TypeScript, React 19
- **Styling:** Tailwind CSS v4
- **AI/LLM:** Groq SDK (`llama-3.3-70b-versatile`)
- **Search & Scraping:** `yt-search`
- **Fuzzy Search:** `fuse.js`
- **Theme:** `next-themes`

---

## Key Components & Structure
- `app/component/MusicPlayer.tsx`: คอมโพเนนต์หลักสำหรับเล่นเพลง คุมสถานะคิวเพลง และอินเทอร์เฟซผู้ใช้
- `app/hooks/useYouTubePlayer.ts`: Custom hook สำหรับจัดการ lifecycle ของ YouTube IFrame API
- `app/hooks/usePlaylist.ts`: Custom hook สำหรับจัดการ LocalStorage ของเพลย์ลิสต์และรายการเพลง
- `app/api/chat/route.ts`: API Route สำหรับประมวลผลคำสั่งผ่าน LLM Tool Calling และค้นหาเพลง

---

## Recent Fixes & Optimizations (YouTube Error 150 & Vercel Deployment)
1. **YouTube Embed Error 150 / 101 Fix**:
   - ปรับขนาด YouTube IFrame จาก `0x0` เป็น `200x200` และกำหนด `host: "https://www.youtube-nocookie.com"` พร้อมส่ง `origin: window.location.origin` ใน `playerVars`
   - ปรับการซ่อน Player ใน `MusicPlayer.tsx` จาก `display: "none"` เป็นการจัดวางแบบ Off-screen (`fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0`) เพื่อไม่ให้ถูก YouTube Bot / Security block
   - ปรับปรุง Error handling ใน `useYouTubePlayer.ts` ให้ระบุสาเหตุข้อผิดพลาดและข้ามเพลงที่มีปัญหาโดยอัตโนมัติ
2. **Search Query Optimization**:
   - ปรับคำค้นหาใน `app/api/chat/route.ts` จาก `official music video` เป็น `audio` เพื่อหลีกเลี่ยงวิดีโอที่ค่ายเพลงตั้งค่าปิด Embed Syndication
3. **Build & Font Optimization**:
   - แก้ไขปัญหา Google Fonts fetch timeout ใน `next/font/google` ด้วยการโหลด Sarabun font ผ่าน CSS `@import` ใน `globals.css`
