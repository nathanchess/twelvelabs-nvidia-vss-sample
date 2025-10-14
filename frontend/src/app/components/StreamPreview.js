'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  EyeIcon,
  VideoCameraIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function StreamPreview({ 
  thumbnail_url, 
  title, 
  description, 
  factoryId = null 
}) {
    const [hovered, setHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [activeState, setActiveState] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const router = useRouter();

    const [hlsUrl, setHlsUrl] = useState(null);
    const [cameraCount, setCameraCount] = useState(0);

    // Placeholder HLS URL for when activated
    const placeholderHlsUrl = `https://stream.example.com/live/${factoryId || 'factory'}.m3u8`;


    useEffect(() => {
        verifyFactoryData();
    }, []);

    const handleCardClick = async () => {
        if (activeState) {
            // Navigate to detailed factory view
            router.push(`/${factoryId || 'unknown'}`);
        } else if (!isActivating) {
            
            setIsActivating(true);
            
            const NEXT_PUBLIC_RTSP_STREAM_WORKER_URL = process.env.NEXT_PUBLIC_RTSP_STREAM_WORKER_URL;

            const response = await fetch(`${NEXT_PUBLIC_RTSP_STREAM_WORKER_URL}/load_stream`, {
                method: 'POST',
                body: JSON.stringify({
                    stream_name: factoryId,
                    public_file_url: null
                })
            });

            if (!response.ok) {
                console.error('Failed to activate factory:', response.statusText);
                return;
            }

            const data = await response.json();
            
            console.log('Factory activated:', data);

            setActiveState(true);
            setIsActivating(false);
            setHlsUrl(data[0]);
            setCameraCount(data.length);

            // Save stream data as JSON to localStorage
            const streamData = {
                hlsUrls: data,
                cameraCount: data.length,
                title,
                description,
                thumbnail_url,
                factoryId,
                activatedAt: new Date().toISOString()
            };
            localStorage.setItem(factoryId, JSON.stringify(streamData));

        }
    };

    const verifyFactoryData = async () => {

        const NEXT_PUBLIC_RTSP_STREAM_WORKER_URL = process.env.NEXT_PUBLIC_RTSP_STREAM_WORKER_URL;
        const response = await fetch(`${NEXT_PUBLIC_RTSP_STREAM_WORKER_URL}/get_stream`, {
            method: 'POST',
            body: JSON.stringify({ stream_name: factoryId })
        });

        const data = await response.json();

        const streamData = {
            hlsUrls: data,
            cameraCount: data.length,
            title,
            description,
            thumbnail_url,
            factoryId,
            activatedAt: new Date().toISOString()
        };

        if (data.length > 0) {
            const storedData = localStorage.getItem(factoryId);
            const parsedStoredData = storedData ? JSON.parse(storedData) : null;
            
            if (parsedStoredData !== null && data[0] === parsedStoredData.hlsUrls[0]) {
                setActiveState(true);
                setIsActivating(false);
                setHlsUrl(data[0]);
                setCameraCount(parsedStoredData.hlsUrls.length);
            } else {
                setActiveState(true);
                setIsActivating(false);
                setHlsUrl(data[0]);
                setCameraCount(data.length);
                localStorage.setItem(factoryId, JSON.stringify(streamData));
            }
        } else {
            setActiveState(false);
            setIsActivating(false);
            setHlsUrl(null);
            setCameraCount(0);
            localStorage.removeItem(factoryId);
        }

    }

    const handleViewClick = (e) => {
        e.stopPropagation(); // Prevent card click
        if (activeState) {
            router.push(`/${factoryId || 'unknown'}`);
        }
    };

    return (
        <div 
            className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 ${
                isActivating 
                    ? 'ring-2 ring-yellow-500/20 cursor-wait' 
                    : activeState 
                        ? 'ring-2 ring-lime-500/20 cursor-pointer' 
                        : 'cursor-pointer'
            }`}
            onMouseEnter={() => setHovered(true)} 
            onMouseLeave={() => setHovered(false)}
            onClick={handleCardClick}
        >
            {/* Thumbnail Container with Play Button Overlay */}
            <div className="relative h-48 bg-gray-200 overflow-hidden">
                {!imageError && thumbnail_url ? (
                    <Image 
                        src={thumbnail_url} 
                        alt={title || 'Factory thumbnail'} 
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <VideoCameraIcon className="h-16 w-16 text-gray-600" />
                    </div>
                )}
                
                {/* Black Glassy Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-all duration-300"></div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                        activeState 
                            ? 'bg-lime-500/90 group-hover:bg-lime-500 group-hover:scale-125' 
                            : 'bg-white/95 group-hover:bg-white group-hover:scale-125'
                    }`}>
                        <PlayIcon className={`h-8 w-8 ml-1 ${
                            activeState ? 'text-white' : 'text-gray-700'
                        }`} />
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-3 left-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
                        isActivating 
                            ? 'bg-yellow-500/90 text-white' 
                            : activeState 
                                ? 'bg-lime-500/90 text-white' 
                                : 'bg-gray-500/90 text-white'
                    }`}>
                        {isActivating ? (
                            <>
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                <span>Activating...</span>
                            </>
                        ) : activeState ? (
                            <>
                                <SignalIcon className="h-4 w-4" />
                                <span>Active</span>
                            </>
                        ) : (
                            <>
                                <SignalSlashIcon className="h-4 w-4" />
                                <span>Inactive</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Camera Count Badge */}
                <div className="absolute top-3 right-3">
                    <div className="bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center space-x-1">
                        <VideoCameraIcon className="h-4 w-4" />
                        <span>{cameraCount}</span>
                    </div>
                </div>

                {/* View Button - Only show when active */}
                {activeState && (
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                            onClick={handleViewClick}
                            className="bg-lime-500 hover:bg-lime-600 text-white rounded-lg px-4 py-2 flex items-center space-x-2 text-sm font-medium shadow-lg transition-colors duration-200"
                        >
                            <EyeIcon className="h-4 w-4" />
                            <span>View</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div className="p-5">
                {/* Title */}
                <h3 className="font-bold text-lg text-gray-900 font-inter mb-2 group-hover:text-lime-600 transition-colors duration-300 line-clamp-2">
                    {title || 'Factory Name'}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {description || 'Factory description will appear here'}
                </p>

                {/* HLS URL Section */}
                <div className="mb-4">
                    {isActivating ? (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <ArrowPathIcon className="h-4 w-4 text-yellow-500 animate-spin" />
                                <span className="font-medium text-yellow-600">Activating stream...</span>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Setting up HLS stream...</p>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        </div>
                    ) : activeState ? (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <SignalIcon className="h-4 w-4 text-lime-500" />
                                <span className="font-medium text-lime-600">Live Stream Available</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">HLS Public URL:</p>
                                <p className="text-xs font-mono text-gray-700 break-all">
                                    {(hlsUrl || placeholderHlsUrl).length > 50 ? `${(hlsUrl || placeholderHlsUrl).substring(0, 50)}...` : (hlsUrl || placeholderHlsUrl)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <SignalSlashIcon className="h-4 w-4" />
                            <span>Not activated - No HLS public URL</span>
                        </div>
                    )}
                </div>

                {/* Camera Count Section */}
                <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                            <span>{cameraCount} Camera{cameraCount !== 1 ? 's' : ''}</span>
                        </div>
                        
                        {/* Click indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${
                                    isActivating 
                                        ? 'bg-yellow-500 animate-pulse' 
                                        : activeState 
                                            ? 'bg-lime-500 animate-pulse' 
                                            : 'bg-gray-400'
                                }`}></div>
                                <span className="text-xs text-gray-500">
                                    {isActivating 
                                        ? 'Activating...' 
                                        : activeState 
                                            ? 'Click to view' 
                                            : 'Click to activate'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}