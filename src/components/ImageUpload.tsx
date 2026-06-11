'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';

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
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setLibraryAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Failed to fetch library', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleOpenLibrary = () => {
    setShowLibrary(true);
    fetchLibrary();
  };

  const selectFromLibrary = (assetData: string) => {
    setPreviewUrl(assetData);
    onImageCropped(assetData);
    setShowLibrary(false);
  };

  const uploadToLibrary = async (base64Data: string) => {
    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64Data }),
      });
    } catch (error) {
      console.error('Failed to save to library', error);
    }
  };

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
        uploadToLibrary(compressedBase64); // Automatically add to library
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
          <div className="flex gap-2">
            <label
              htmlFor={`image-upload-${label.replace(/\s+/g, '-')}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-sm"
            >
              <Upload size={16} />
              Upload New
            </label>
            <button
              type="button"
              onClick={handleOpenLibrary}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
            >
              <ImageIcon size={16} />
              Choose from Library
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Max size: {maxFileSize}MB. Will be automatically cropped to square ({targetSize}x{targetSize}px) and compressed.
          </p>
          
          {error && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><X size={12} /> {error}</p>}
        </div>
      </div>

      {showLibrary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600"/> Asset Library
              </h3>
              <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingLibrary ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : libraryAssets.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <ImageIcon size={48} className="text-slate-200 mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No assets found</p>
                  <p className="text-slate-400 text-xs mt-1">Upload an image first to add it to your library.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                  {libraryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => selectFromLibrary(asset.data)}
                      className="aspect-square rounded-lg border border-slate-200 overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-200 hover:shadow-md transition-all group relative bg-slate-50"
                      title={new Date(asset.createdAt).toLocaleDateString()}
                    >
                      <img src={asset.data} alt="Asset" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-xl">
              <button 
                onClick={() => setShowLibrary(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
