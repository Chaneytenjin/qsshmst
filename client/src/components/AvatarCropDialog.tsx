import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Move, RotateCcw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AvatarCropDialogProps = {
  open: boolean;
  source: string | null;
  fileName?: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (base64: string) => void;
};

const OUTPUT_SIZE = 512;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function AvatarCropDialog({ open, source, fileName, onOpenChange, onComplete }: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isImageReady, setIsImageReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsImageReady(false);
      setIsExporting(false);
    }
  }, [open, source]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;
    const size = Math.max(event.currentTarget.clientWidth, 1);
    setPan({
      x: clamp(dragStart.panX + (event.clientX - dragStart.x) / (size / 2)),
      y: clamp(dragStart.panY + (event.clientY - dragStart.y) / (size / 2)),
    });
  };

  const handleCrop = () => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return;

    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("無法建立圖片裁切區域");

      const baseScale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
      const scale = baseScale * zoom;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const maximumOffsetX = Math.max(0, (drawWidth - OUTPUT_SIZE) / 2);
      const maximumOffsetY = Math.max(0, (drawHeight - OUTPUT_SIZE) / 2);
      const drawX = (OUTPUT_SIZE - drawWidth) / 2 - pan.x * maximumOffsetX;
      const drawY = (OUTPUT_SIZE - drawHeight) / 2 - pan.y * maximumOffsetY;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      onComplete(canvas.toDataURL("image/jpeg", 0.9));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-gray-800 bg-white text-gray-950 sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black"><ImagePlus className="h-5 w-5" />調整個人頭像</DialogTitle>
          <DialogDescription>拖曳圖片調整顯示範圍，並以縮放控制保留最適合的正方形頭像</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            aria-label="頭像裁切預覽區"
            className="relative mx-auto aspect-square w-full max-w-72 touch-none overflow-hidden border-2 border-gray-900 bg-gray-100 shadow-[8px_8px_0_0_rgba(17,24,39,0.16)]"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragStartRef.current = null; }}
            onPointerCancel={() => { dragStartRef.current = null; }}
          >
            {source ? (
              <img
                ref={imageRef}
                src={source}
                alt={fileName ? `${fileName} 的頭像裁切預覽` : "頭像裁切預覽"}
                onLoad={() => setIsImageReady(true)}
                className="h-full w-full select-none object-cover"
                draggable={false}
                style={{
                  objectPosition: `${50 + pan.x * 50}% ${50 + pan.y * 50}%`,
                  transform: `scale(${zoom})`,
                }}
              />
            ) : <div className="flex h-full items-center justify-center text-sm text-gray-500">未選擇圖片</div>}
            <div className="pointer-events-none absolute inset-0 border-[14px] border-white/30" />
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-950/80 px-3 py-1.5 text-xs font-semibold text-white"><Move className="h-3.5 w-3.5" />拖曳調整位置</div>
          </div>

          <div className="space-y-3 rounded border-2 border-gray-200 p-3">
            <div className="flex items-center justify-between gap-3"><label htmlFor="avatar-zoom" className="flex items-center gap-2 text-sm font-bold"><ZoomIn className="h-4 w-4" />縮放</label><span className="font-mono text-xs text-gray-600">{Math.round(zoom * 100)}%</span></div>
            <input id="avatar-zoom" aria-label="頭像縮放" className="w-full accent-gray-900" type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-gray-700">水平位置<input aria-label="頭像水平位置" className="mt-1 w-full accent-gray-900" type="range" min="-1" max="1" step="0.01" value={pan.x} onChange={(event) => setPan((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
              <label className="text-xs font-bold text-gray-700">垂直位置<input aria-label="頭像垂直位置" className="mt-1 w-full accent-gray-900" type="range" min="-1" max="1" step="0.01" value={pan.y} onChange={(event) => setPan((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="mr-2 h-4 w-4" />重設</Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="button" onClick={handleCrop} disabled={!isImageReady || isExporting} className="bg-gray-900 text-white hover:bg-gray-800">{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}套用裁切並上傳</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
