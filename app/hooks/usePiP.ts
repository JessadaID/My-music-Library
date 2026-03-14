"use client";
import { useState, useCallback, useEffect } from "react";

export function usePiP() {
    const [pipWindow, setPipWindow] = useState<Window | null>(null);

    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        setIsSupported("documentPictureInPicture" in window);
    }, []);

    const openPiP = useCallback(async (width = 360, height = 210) => {
        if (!isSupported) return;

        try {
            const win = await (window as any).documentPictureInPicture.requestWindow({
                width,
                height,
            });

            [...document.styleSheets].forEach((sheet) => {
                try {
                    const cssText = [...sheet.cssRules]
                        .map((rule) => rule.cssText)
                        .join("\n");
                    const styleEl = win.document.createElement("style");
                    styleEl.textContent = cssText;
                    win.document.head.appendChild(styleEl);
                } catch {
                }
            });

            [...document.querySelectorAll('link[rel="stylesheet"]')].forEach((link) => {
                const cloned = win.document.createElement("link");
                cloned.rel = "stylesheet";
                (cloned as HTMLLinkElement).href = (link as HTMLLinkElement).href;
                win.document.head.appendChild(cloned);
            });

            win.document.documentElement.style.colorScheme = "light dark";
            win.document.body.style.margin = "0";
            win.document.body.style.padding = "0";
            win.document.body.style.overflow = "hidden";

            const mainHtmlClass = document.documentElement.className;
            win.document.documentElement.className = mainHtmlClass;

            setPipWindow(win);

            win.addEventListener("pagehide", () => {
                setPipWindow(null);
            });
        } catch (err) {
            console.error("Failed to open PiP window:", err);
        }
    }, [isSupported]);

    const closePiP = useCallback(() => {
        if (pipWindow) {
            pipWindow.close();
            setPipWindow(null);
        }
    }, [pipWindow]);

    return {
        pipWindow,
        isPiPOpen: !!pipWindow,
        isSupported,
        openPiP,
        closePiP,
    };
}
