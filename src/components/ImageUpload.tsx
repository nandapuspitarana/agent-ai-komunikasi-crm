'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  description?: string;
  currentImage?: string | null;
  onImageCropped: (base64Image: string) => void;
  targetSize?: number; // Target width/height for the square image (default 256)
  maxFileSize?: number; // Max original file size in MB (default 2)
}

export default function ImageUpload({
  label,
  description,
  currentImage,
  onImageCropped,
  targetSize = 256,
  maxFileSize = 2,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validate size (before compression)
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`File size exceeds ${maxFileSize}MB limit. Please select a smaller file.`);
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to crop to square and compress
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setError('Failed to process image');
          return;
        }

        // Calculate crop dimensions to make it square
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        // Draw cropped and resized image
        ctx.fillStyle = '#ffffff'; // white background for transparent images
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize);

        // Compress to JPEG with 80% quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewUrl(compressedBase64);
        onImageCropped(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    onImageCropped('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}
      
      <div className="flex items-start gap-4">
        {/* Preview Area */}
        <div className="w-24 h-24 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-sm"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <span className="text-slate-400 text-xs text-center px-2">No image</span>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id={`image-upload-${label.replace(/\s+/g, '-')}`}
          />
          <label
            htmlFor={`image-upload-${label.replace(/\s+/g, '-')}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
          >
            <Upload size={16} />
            Choose Image
          </label>
          <p className="text-[11px] text-slate-500 mt-2">
            Max size: {maxFileSize}MB. Will be automatically cropped to square ({targetSize}x{targetSize}px) and compressed.
          </p>
          
          {error && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><X size={12} /> {error}</p>}
        </div>
      </div>
    </div>
  );
}
