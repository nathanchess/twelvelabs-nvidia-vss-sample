'use client';

import { useState } from 'react';
import { 
  VideoCameraIcon, 
  CloudArrowUpIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function UploadVideo() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

    const uploadVideo = async (file) => {
        console.log("Starting video upload...");
        setIsUploading(true);
        setUploadError(null);
        setShowSuccessModal(false);

        const VSS_BASE_URL = process.env.NEXT_PUBLIC_VSS_BASE_URL;
  
        if (!VSS_BASE_URL) {
            console.error("No VSS base URL found");
            setUploadError("Configuration error: No VSS base URL found");
            setIsUploading(false);
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'vision');
        formData.append('media_type', 'video');

        try {
            console.log("Uploading to:", `${VSS_BASE_URL}/files`);

            const response = await fetch(`${VSS_BASE_URL}/files`, {
                method: 'POST',
                body: formData
            });

            console.log("Upload response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to upload video:", response.status, errorText);
                setUploadError(`Upload failed: ${response.status} ${response.statusText}`);
                setIsUploading(false);
                return {
                    success: false,
                    message: "Failed to upload video"
                }
            }

            const data = await response.json();
            const fileId = data.id;

            console.log("Video uploaded successfully", data);
            
            // Show success modal after a brief delay to ensure state is updated
            setTimeout(() => {
                console.log("Showing success modal...");
                setShowSuccessModal(true);
                setIsUploading(false);
            }, 100);

            return {
                success: true,
                fileId: fileId,
                message: "Video uploaded successfully"
            }

        } catch (error) {
            console.error("Error uploading video", error);
            setUploadError(`Upload error: ${error.message}`);
            setIsUploading(false);
            return {
                success: false,
                message: "Error uploading video"
            }
        }

    }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Video file selected:', file.name, file.type, file.size);
      uploadVideo(file);
    } 
  };

  const handleClick = () => {
    if (!isUploading) {
      document.getElementById('upload-video')?.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isUploading) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        console.log('Video file dropped:', file.name, file.type, file.size);
        uploadVideo(file);
      } else {
        console.log('Please drop a video file');
      }
    }
  };

  const handleConfirmSuccess = () => {
    setShowSuccessModal(false);
  };

  const handleDismissError = () => {
    setUploadError(null);
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        ${isUploading 
          ? 'bg-blue-50 border-2 border-blue-300 border-dashed cursor-wait' 
          : isDragOver 
            ? 'bg-blue-50 border-2 border-blue-300 border-dashed scale-105 cursor-pointer' 
            : uploadError
              ? 'bg-red-50 border-2 border-red-300 border-dashed cursor-pointer'
              : 'bg-gray-100/80 hover:bg-gray-200/90 border-2 border-gray-300 border-dashed hover:border-gray-400 cursor-pointer'
        }
        backdrop-blur-sm shadow-sm hover:shadow-md
        flex flex-col items-center justify-center
        h-110 w-full
      `}
      >
      {/* Hidden File Input */}
      <input 
        type="file" 
        id="upload-video" 
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden" 
      />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
        {/* Loading State */}
        {isUploading && (
          <>
            <div className="mb-4 p-4 rounded-full bg-blue-100 text-blue-600 shadow-lg">
              <div className="animate-spin">
                <CloudArrowUpIcon className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold font-inter text-blue-800">
                Uploading Video...
              </h3>
              <p className="text-sm font-inter text-blue-600">
                Please wait while your video is being processed
              </p>
            </div>
          </>
        )}

        {/* Error State */}
        {uploadError && !isUploading && (
          <>
            <div className="mb-4 p-4 rounded-full bg-red-100 text-red-600 shadow-lg">
              <div className="relative">
                <VideoCameraIcon className="h-8 w-8" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold font-inter text-red-800">
                Upload Failed
              </h3>
              <p className="text-sm font-inter text-red-600">
                {uploadError}
              </p>
              <button
                onClick={handleDismissError}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Try Again
              </button>
            </div>
          </>
        )}

        {/* Normal State */}
        {!isUploading && !uploadError && (
          <>
            {/* Icon Container */}
            <div className={`
              mb-4 p-4 rounded-full transition-all duration-300
              ${isDragOver 
                ? 'bg-blue-100 text-blue-600 scale-110' 
                : 'bg-white/80 text-gray-600 group-hover:bg-white group-hover:text-gray-800 group-hover:scale-110'
              }
              shadow-lg
            `}>
              <div className="relative">
                <VideoCameraIcon className="h-8 w-8" />
                <PlusIcon className={`
                  absolute -top-1 -right-1 h-4 w-4 transition-all duration-300
                  ${isDragOver ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}
                `} />
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <h3 className={`
                text-lg font-semibold font-inter transition-colors duration-300
                ${isDragOver ? 'text-blue-800' : 'text-gray-800 group-hover:text-gray-900'}
              `}>
                Upload Video
              </h3>
              
              <p className={`
                text-sm font-inter transition-colors duration-300
                ${isDragOver ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-700'}
              `}>
                Click to browse or drag & drop
              </p>
              
              <p className="text-xs text-gray-500 font-inter mt-3">
                Video will be automatically synced to Twelve Labs
              </p>
            </div>

            {/* Upload Icon */}
            <div className={`
              mt-4 transition-all duration-300
              ${isDragOver 
                ? 'text-blue-500 scale-110' 
                : 'text-gray-400 group-hover:text-gray-600 group-hover:scale-105'
              }
            `}>
              <CloudArrowUpIcon className="h-6 w-6" />
            </div>
          </>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Corner Accent */}
      <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleConfirmSuccess}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform transition-all duration-300 scale-100">
            {/* Animated Checkmark */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <CheckCircleIcon className="h-20 w-20 text-green-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 bg-green-100 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Successful!
              </h3>
              <p className="text-gray-600 text-lg">
                Your video has been uploaded and will be indexed into TwelveLabs shortly.
              </p>
            </div>
            
            {/* Confirm Button */}
            <button
              onClick={handleConfirmSuccess}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}