import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Move } from 'lucide-react';
import { Button } from '../ui/Button';

interface PhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onSave: (editedFile: File) => void;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onSave,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 500;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;

    ctx.save();
    ctx.translate(centerX + position.x, centerY + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgWidth = img.width;
    const imgHeight = img.height;
    const aspectRatio = imgWidth / imgHeight;
    
    let drawWidth = size;
    let drawHeight = size;
    
    if (aspectRatio > 1) {
      drawHeight = size / aspectRatio;
    } else {
      drawWidth = size * aspectRatio;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    for (let i = 1; i < 3; i++) {
      const x = (size / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    
    for (let i = 1; i < 3; i++) {
      const y = (size / 3) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(1, '#d946ef');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [zoom, rotation, position]);

  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // 新しいキャンバスを作成して、画像のみ（グリッドなし）を描画
    const finalCanvas = document.createElement('canvas');
    const size = 500;
    finalCanvas.width = size;
    finalCanvas.height = size;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;

    // 画像を描画（グリッドなし）
    ctx.save();
    ctx.translate(centerX + position.x, centerY + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgWidth = img.width;
    const imgHeight = img.height;
    const aspectRatio = imgWidth / imgHeight;
    
    let drawWidth = size;
    let drawHeight = size;
    
    if (aspectRatio > 1) {
      drawHeight = size / aspectRatio;
    } else {
      drawWidth = size * aspectRatio;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // 円形クロップ用のマスクキャンバスを作成
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = size;
    croppedCanvas.height = size;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    // 円形のクリッピングパスを作成
    croppedCtx.beginPath();
    croppedCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    croppedCtx.closePath();
    croppedCtx.clip();

    // クロップした画像を描画
    croppedCtx.drawImage(finalCanvas, 0, 0);

    // Blobに変換してFileオブジェクトを作成
    croppedCanvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const editedFile = new File([blob], imageFile.name, {
        type: 'image/png',
        lastModified: Date.now(),
      });
      
      onSave(editedFile);
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-purple-600 to-pink-600">
          <h2 className="text-xl font-bold text-white">Update Profile Photo</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-center">
            <div
              ref={containerRef}
              className="relative bg-[#2a2a2a] rounded-lg overflow-hidden cursor-move"
              style={{ width: 500, height: 500 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full"
              />
              
              <div className="absolute bottom-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleZoomOut}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPosition({ x: 0, y: 0 })}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              aria-label="Reset Position"
            >
              <Move className="h-5 w-5" />
            </button>
            <button
              onClick={handleRotate}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              aria-label="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Choose Different
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              Save Photo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
