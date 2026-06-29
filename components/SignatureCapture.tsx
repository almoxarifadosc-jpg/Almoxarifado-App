"use client";

import React, { useRef, useState, useEffect } from "react";
import { Trash2, Check, X, ShieldAlert } from "lucide-react";

interface SignatureCaptureProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export default function SignatureCapture({ onSave, onCancel }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions based on client bounds
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2; // high res
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e3a8a"; // deep blue ink
      ctx.lineWidth = 2.5;
      
      // Fill canvas background as white so it can be exported properly
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Check if Touch Event
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Convert high res canvas to standard dataURL
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="p-4 space-y-3 bg-surface rounded-2xl border border-outline-variant/15 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
          <ShieldAlert size={14} className="text-amber-500 animate-pulse" />
          <span>Assinar Comprovante de Recebimento</span>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasDrawn}
          className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Limpar assinatura"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="relative border-2 border-dashed border-outline-variant/30 rounded-xl overflow-hidden bg-white h-44 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block touch-none"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[11px] text-on-surface-variant/40 font-semibold select-none">
            <span>Assine com o dedo ou caneta capacitiva aqui</span>
            <div className="w-1/3 border-t border-on-surface-variant/20 mt-12 mb-1" />
            <span className="text-[9px]">Área de Assinatura</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <X size={14} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasDrawn}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-container-high disabled:text-on-surface-variant/30 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Check size={14} />
          Salvar Assinatura
        </button>
      </div>
    </div>
  );
}
