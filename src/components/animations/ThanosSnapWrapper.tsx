"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";

interface ThanosSnapWrapperProps {
  isSnapped: boolean;
  children: ReactNode;
  snapDuration?: number; // In seconds
}

export default function ThanosSnapWrapper({
  isSnapped,
  children,
  snapDuration = 2.0,
}: ThanosSnapWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(!isSnapped);
  const [layers, setLayers] = useState<string[]>([]); // Array of data URLs

  // The number of layers for the Thanos Snap
  const layerCount = 42;

  const performSnap = async () => {
    if (!contentRef.current || !containerRef.current) return;
    setIsAnimating(true);
    
    try {
      // 1. Capture the DOM element
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: null,
        scale: 1, // Keep scale manageable for performance
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const width = canvas.width;
      const height = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // 2. Extract ImageData
      const originalImageData = ctx.getImageData(0, 0, width, height);
      const pixelData = originalImageData.data;

      // 3. Create 42 blank ImageData objects
      const imageDataArray: ImageData[] = [];
      for (let i = 0; i < layerCount; i++) {
        // We use Uint8ClampedArray because it's required for ImageData
        const arr = new Uint8ClampedArray(pixelData.length);
        imageDataArray.push(new ImageData(arr, width, height));
      }

      // 4. Distribute pixels to layers
      for (let i = 0; i < pixelData.length; i += 4) {
        // Skip transparent pixels
        if (pixelData[i + 3] === 0) continue;

        const pixelIndex = i / 4;
        const x = pixelIndex % width; // X coordinate
        
        // Distribution logic based on x coordinate for a left-to-right sweep
        // Weighted random layer index
        const chance = (layerCount * (Math.random() + (2 * x) / width)) / 3;
        const layerIndex = Math.floor(Math.min(Math.max(chance, 0), layerCount - 1));

        // Assign pixel to the chosen layer
        imageDataArray[layerIndex].data[i] = pixelData[i];         // R
        imageDataArray[layerIndex].data[i + 1] = pixelData[i + 1]; // G
        imageDataArray[layerIndex].data[i + 2] = pixelData[i + 2]; // B
        imageDataArray[layerIndex].data[i + 3] = pixelData[i + 3]; // A
      }

      // 5. Convert ImageData to Canvas then to data URLs
      const newLayers: string[] = [];
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      if (tempCtx) {
        for (let i = 0; i < layerCount; i++) {
          tempCtx.putImageData(imageDataArray[i], 0, 0);
          newLayers.push(tempCanvas.toDataURL("image/png"));
          tempCtx.clearRect(0, 0, width, height);
        }
      }

      // 6. Set layers and hide original content
      setLayers(newLayers);
      setShowContent(false);

      // 7. Cleanup after animation completes
      setTimeout(() => {
        setLayers([]);
        setIsAnimating(false);
      }, (snapDuration + 2) * 1000); // add 2s for stagger finishing

    } catch (error) {
       console.error("Snap effect failed", error);
       setShowContent(false);
       setIsAnimating(false);
    }
  };

  const materialize = async () => {
    // Simple fade-in for rematerialization
    setIsAnimating(true);
    setShowContent(true);
    
    setTimeout(() => {
       setIsAnimating(false);
       setLayers([]);
    }, 1000);
  }

  // Watch for state changes
  useEffect(() => {
    if (isSnapped && showContent && !isAnimating) {
      performSnap();
    } else if (!isSnapped && !showContent && !isAnimating) {
      materialize();
    }
  }, [isSnapped, showContent, isAnimating]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Target Content */}
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            ref={contentRef}
            key="content"
            className="w-full relative z-10"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 1 }} // Disappears through layers
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 42 animation layers mapped to framer-motion */}
      {layers.length > 0 && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50 overflow-visible">
          {layers.map((layerSrc, idx) => {
             // Calculate staggered animation physics
             const delay = (idx / layerCount) * snapDuration;
             const rotate = (Math.random() - 0.5) * 30; // Subtle rotation
             const driftX = (Math.random() - 0.5) * 100 + 50;  // Drift right
             const driftY = -(Math.random() * 100 + 50);       // Drift up
             
             return (
               <motion.img
                 key={idx}
                 src={layerSrc}
                 className="absolute top-0 left-0 w-full pointer-events-none"
                 style={{ 
                   filter: "drop-shadow(0px 0px 4px rgba(251, 191, 36, 0.4))" // golden hue
                 }}
                 initial={{
                   opacity: 1,
                   x: 0,
                   y: 0,
                   rotate: 0,
                   filter: "blur(0px)",
                 }}
                 animate={{
                   opacity: 0,
                   x: driftX,
                   y: driftY,
                   rotate: rotate,
                   filter: "blur(4px)", // Blurs as it turns to dust
                 }}
                 transition={{
                   duration: snapDuration,
                   delay: delay,
                   ease: "easeOut",
                 }}
               />
             );
          })}
        </div>
      )}
    </div>
  );
}
