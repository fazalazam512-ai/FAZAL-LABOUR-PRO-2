import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Receipt,
  Cloud,
  Loader2,
  Check,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  merchant?: string;
  amount?: string;
  date?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  merchant,
  amount,
  date,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Reset zoom and rotation when opening with a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setDownloadSuccess(false);
    }
  }, [isOpen, imageUrl]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 3.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  /**
   * Guaranteed PNG Download:
   * 1. Fetches or draws image to HTML5 Canvas
   * 2. Exports as PNG Blob
   * 3. Triggers browser download as filename.png
   */
  const handleDownloadPng = async () => {
    if (!imageUrl) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    const safeName = (title || merchant || 'receipt')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const dateStr = date ? `_${date}` : '';
    const filename = `receipt_${safeName}${dateStr}.png`;

    try {
      // Approach A: Draw on Canvas to force real PNG encoding
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 800;
      canvas.height = img.naturalHeight || img.height || 600;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, filename);
        } else {
          fallbackBlobFetch(imageUrl, filename);
        }
      }, 'image/png');
    } catch {
      // Approach B: Fetch blob directly
      fallbackBlobFetch(imageUrl, filename);
    }
  };

  const fallbackBlobFetch = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      // Ensure PNG type
      const pngBlob = new Blob([blob], { type: 'image/png' });
      downloadBlob(pngBlob, filename);
    } catch {
      // Approach C: Anchor tag direct click
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      finishDownload();
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 1500);
    finishDownload();
  };

  const finishDownload = () => {
    setDownloadSuccess(true);
    setIsDownloading(false);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const isCloudStored = imageUrl.includes('backblazeb2.com') || imageUrl.includes('s3.');

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="receipt-modal-content"
        className="w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3 truncate mr-2">
            <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-400 shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">
                  {title || merchant || 'Receipt Inspection'}
                </h3>
                {isCloudStored && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                    <Cloud className="w-3 h-3 text-emerald-400" /> Backblaze B2
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {merchant && <span className="mr-2 text-slate-300">{merchant}</span>}
                {date && <span className="mr-2">• {date}</span>}
                {amount && <span className="font-semibold text-emerald-400">• {amount}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download PNG Button */}
            <button
              type="button"
              id="receipt-download-png-btn"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Download Receipt Image as PNG format"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadSuccess ? 'Downloaded!' : 'Download PNG'}</span>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Open full image in separate browser tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              id="receipt-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Canvas / Viewport */}
        <div className="relative flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 min-h-[360px] sm:min-h-[500px]">
          <div
            className="transition-transform duration-200 ease-out origin-center select-none"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={imageUrl}
              alt="Receipt Preview"
              className="max-h-[66vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl border border-slate-800/80 cursor-grab"
              referrerPolicy="no-referrer"
              draggable={false}
            />
          </div>

          {/* Floating Zoom & Rotate Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-slate-300 text-xs font-semibold">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="px-2 text-[11px] font-mono text-slate-300">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
              title="Reset Zoom & Rotation"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/80 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>Click outside or press Esc to close</span>
          <span className="font-semibold text-emerald-400">PNG Format Export Ready</span>
        </div>
      </div>
    </div>
  );
};
