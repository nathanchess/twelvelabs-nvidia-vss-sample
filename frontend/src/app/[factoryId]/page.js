"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import StreamCard from "../components/StreamCard";
import { initDb, storeVideo, getVideo } from "../lib/indexdb";

export default function FactoryPage() {

    const params = useParams();
    const factoryId = params.factoryId;
    
    const [factoryData, setFactoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [focusedCamera, setFocusedCamera] = useState(null);
    const [showAddCameraModal, setShowAddCameraModal] = useState(false);
    const [hlsUrl, setHlsUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [inputType, setInputType] = useState('hls'); // 'hls' or 'video'
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [streamName, setStreamName] = useState('');
    const [db, setDb] = useState(null);

    // Use stable keys to prevent React from unmounting/remounting StreamCards
    // The key should be based on the stream URL, not the view mode
    const getStreamKey = (stream_url, index) => `stream-${stream_url}-${index}`;

    useEffect(() => {
        const initDatabase = async () => {
            try {
                const db = await initDb();
                setDb(db);
                console.log('Database initialized:', db);
            } catch (error) {
                console.error('Error initializing database:', error);
            }
        };
        initDatabase();
    }, []);

    useEffect(() => {
        if (factoryId) {
            const data = localStorage.getItem(factoryId);
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    setFactoryData(parsedData);
                } catch (error) {
                    console.error('Error parsing factory data:', error);
                }
            }
            setLoading(false);
        }
    }, [factoryId]);

    const handleVideoSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            setSelectedVideo(file);
            const videoUrl = URL.createObjectURL(file);
            setVideoPreview(videoUrl);
        }
    };

    const uploadVideoToAPI = async (file) => {
        try {
            
            // Upload video to S3 for unsigned URL.
            const response = await fetch('/api/video', {
                method: 'POST',
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type
                })
            })

            if (!response.ok) {
                throw new Error('Failed to upload video to S3');
            }

            const data = await response.json();
            const uploadUrl = data.uploadUrl;

            console.log('Upload URL:', uploadUrl);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file
            })

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload video to S3');
            }

            console.log('Video uploaded to S3');

            // Create new stream card.

            const videoId = await storeVideo(db, selectedVideo);
            const video = await getVideo(db, videoId);
            console.log('Video:', video);

            const currentStreamData = localStorage.getItem(factoryId);
            const currentStreamDataJson = JSON.parse(currentStreamData);

            const streamData = {
                hlsUrls: [...currentStreamDataJson.hlsUrls, videoId],
                cameraCount: currentStreamDataJson.cameraCount + 1,
                title: currentStreamDataJson.title,
                description: currentStreamDataJson.description,
                thumbnail_url: currentStreamDataJson.thumbnail_url,
                factoryId: currentStreamDataJson.factoryId,
                activatedAt: currentStreamDataJson.activatedAt
            }

            localStorage.setItem(factoryId, JSON.stringify(streamData));
            setFactoryData(streamData);

            console.log('Stream data:', streamData);
            
            // Run RTSP stream worker API call in background (non-blocking)
            const NEXT_PUBLIC_RTSP_STREAM_WORKER_URL = process.env.NEXT_PUBLIC_RTSP_STREAM_WORKER_URL;
            fetch(`${NEXT_PUBLIC_RTSP_STREAM_WORKER_URL}/add_stream`, {
                method: 'POST',
                body: JSON.stringify({
                    stream_name: streamName,
                    s3_video_key: data.key
                })
            })
            .then(response => {
                console.log('Add stream response:', response);
                if (!response.ok) {
                    console.error('Failed to add stream to RTSP stream worker:', response.statusText);
                } else {
                    console.log('Stream added to RTSP stream worker');
                }
            })
            .catch(error => {
                console.error('Error adding stream to RTSP stream worker:', error);
            });
            

        } catch (error) {
            console.error('Error uploading video:', error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            if (inputType === 'hls') {
                // Simulate API call for HLS
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Add new camera to factory data
                const newCamera = {
                    id: `camera_${Date.now()}`,
                    name: streamName || `Camera ${(factoryData.cameras || []).length + 1}`,
                    hlsUrl: hlsUrl,
                    status: 'active',
                    lastSeen: new Date().toISOString(),
                    thumbnail: '/nvidia.jpg'
                };

                const updatedFactoryData = {
                    ...factoryData,
                    cameras: [...(factoryData.cameras || []), newCamera],
                    hlsUrls: [...(factoryData.hlsUrls || []), hlsUrl]
                };

                setFactoryData(updatedFactoryData);
                localStorage.setItem(factoryId, JSON.stringify(updatedFactoryData));

            } else if (inputType === 'video' && selectedVideo) {

                uploadVideoToAPI(selectedVideo);
                
            }
            
            setIsSuccess(true);
            
        } catch (error) {
            console.error('Error adding camera:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading factory data...</p>
                </div>
            </div>
        );
    }

    if (!factoryData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Factory Not Found</h1>
                    <p className="text-gray-600 mb-6">This factory has not been activated yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="px-6 py-8">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-green-600 uppercase tracking-wide">Live Monitoring</span>
                            </div>
                            
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {factoryData.title || `Factory: ${factoryId}`}
                            </h1>
                            <p className="text-lg text-gray-600 mb-6 max-w-3xl">
                                {factoryData.description || 'Real-time surveillance and monitoring system'}
                            </p>
                            
                            {/* Stats and Compliance Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Active Cameras */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Active Cameras</p>
                                            <p className="text-2xl font-bold text-gray-900">{factoryData.cameraCount}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* System Status */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">System Status</p>
                                            <p className="text-lg font-bold text-green-600">Online</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Control Panel */}
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => setShowAddCameraModal(true)}
                                className="cursor-pointer bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Add Camera</span>
                            </button>
                            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Full Screen
                            </button>
                            <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Surveillance Grid */}
            <div className="p-6">
                <div className="max-w-full mx-auto">
                    {/* Grid Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Live Camera Feeds</h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>All Systems Operational</span>
                            </div>
                            <select 
                                value={viewMode} 
                                onChange={(e) => setViewMode(e.target.value)}
                                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="grid">Grid View</option>
                                <option value="list">List View</option>
                                <option value="focus">Focus Mode</option>
                            </select>
                        </div>
                    </div>

                    {/* Automatic Processing Notification */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">✨ Automatic AI Processing</h3>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Streams are automatically chunked using <span className="font-medium text-purple-600">YOLO RT-DETR model</span> and clips are uploaded to <span className="font-medium text-blue-600">TwelveLabs index</span> automatically. Processed clips will appear in the <span className="font-medium text-gray-900">Clips page</span> for analysis and compliance reporting.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Surveillance Views */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {(factoryData.hlsUrls || []).map((stream_url, index) => (
                                <div key={`grid-${index}`} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                                    {/* Camera Header */}
                                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    Camera {String(index + 1).padStart(2, '0')}
                                                </h3>
                                                <p className="text-xs text-gray-500">Live Feed</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => setFocusedCamera(index)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Focus Mode"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </button>
                                            <button className="text-gray-400 hover:text-gray-600 transition-colors" title="Settings">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Video Container */}
                                    <div className="relative aspect-video bg-black overflow-hidden">
                                        <StreamCard key={getStreamKey(stream_url, index)} stream_url={stream_url} />
                                    </div>
                                    
                                    {/* Camera Footer */}
                                    <div className="bg-gray-50 px-4 py-3">
                                        <div className="flex items-center justify-between text-xs text-gray-600">
                                            <span>1080p • 30fps</span>
                                            <span className="flex items-center space-x-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                <span>Recording</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="space-y-4">
                            {(factoryData.hlsUrls || []).map((stream_url, index) => (
                                <div key={`list-${index}`} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 group">
                                    <div className="flex">
                                        {/* Video Container - Smaller */}
                                        <div className="w-80 h-48 bg-black overflow-hidden flex-shrink-0">
                                            <StreamCard key={getStreamKey(stream_url, index)} stream_url={stream_url} />
                                        </div>
                                        
                                        {/* Camera Info */}
                                        <div className="flex-1 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Camera {String(index + 1).padStart(2, '0')}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button 
                                                        onClick={() => setFocusedCamera(index)}
                                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                                        title="Focus Mode"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </button>
                                                    <button className="text-gray-400 hover:text-gray-600 transition-colors" title="Settings">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                <div>
                                                    <span className="font-medium">Resolution:</span> 1080p
                                                </div>
                                                <div>
                                                    <span className="font-medium">Frame Rate:</span> 30fps
                                                </div>
                                                <div>
                                                    <span className="font-medium">Status:</span> 
                                                    <span className="ml-1 flex items-center">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                                                        Recording
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Quality:</span> High
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'focus' && (
                        <div className="space-y-6">
                            {focusedCamera !== null ? (
                                <div>
                                    {/* Focus Mode Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <button 
                                                onClick={() => setFocusedCamera(null)}
                                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                ← Back to All Cameras
                                            </button>
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                Focus Mode - Camera {String(focusedCamera + 1).padStart(2, '0')}
                                            </h3>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm text-gray-600">Live</span>
                                        </div>
                                    </div>
                                    
                                    {/* Large Focus Video */}
                                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                        <div className="relative aspect-video bg-black">
                                            <StreamCard key={getStreamKey(factoryData.hlsUrls?.[focusedCamera], focusedCamera)} stream_url={factoryData.hlsUrls?.[focusedCamera]} />
                                        </div>
                                        <div className="p-6">
                                            <div className="grid grid-cols-3 gap-6 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-600">Resolution:</span>
                                                    <p className="text-gray-900">1080p</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600">Frame Rate:</span>
                                                    <p className="text-gray-900">30fps</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600">Status:</span>
                                                    <div className="text-green-600 flex items-center">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                                                        <span>Recording</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Camera to Focus</h3>
                                    <p className="text-gray-600 mb-6">Click the focus button on any camera to enter focus mode</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                                        {(factoryData.hlsUrls || []).map((stream_url, index) => (
                                            <div
                                                key={`focus-select-${index}`}
                                                onClick={() => setFocusedCamera(index)}
                                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            >
                                                <div className="aspect-video bg-black rounded mb-2 overflow-hidden">
                                                    <StreamCard key={getStreamKey(stream_url, index)} stream_url={stream_url} />
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">Camera {String(index + 1).padStart(2, '0')}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Camera Modal */}
            {showAddCameraModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">Add New Camera</h3>
                                <button
                                    onClick={() => {
                                        setShowAddCameraModal(false);
                                        setHlsUrl('');
                                        setIsSubmitting(false);
                                        setIsSuccess(false);
                                        setInputType('hls');
                                        setSelectedVideo(null);
                                        setVideoPreview(null);
                                        setStreamName('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            {!isSuccess ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Input Type Toggle */}
                                    <div className="flex space-x-4 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => setInputType('hls')}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                                inputType === 'hls'
                                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                                            }`}
                                        >
                                            HLS Stream
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInputType('video')}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                                inputType === 'video'
                                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                                            }`}
                                        >
                                            Upload Video
                                        </button>
                                    </div>

                                    {/* Stream Name Input */}
                                    <div>
                                        <label htmlFor="streamName" className="block text-sm font-medium text-gray-700 mb-2">
                                            Stream Name
                                        </label>
                                        <input
                                            type="text"
                                            id="streamName"
                                            value={streamName}
                                            onChange={(e) => setStreamName(e.target.value)}
                                            placeholder="Enter a name for this stream"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            This name will be used to identify the stream in your factory
                                        </p>
                                    </div>

                                    {/* HLS URL Input */}
                                    {inputType === 'hls' && (
                                        <div>
                                            <label htmlFor="hlsUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                                HLS Stream URL
                                            </label>
                                            <input
                                                type="url"
                                                id="hlsUrl"
                                                value={hlsUrl}
                                                onChange={(e) => setHlsUrl(e.target.value)}
                                                placeholder="https://example.com/stream/index.m3u8"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required={inputType === 'hls'}
                                                disabled={isSubmitting}
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                Enter the public HLS stream URL for your camera
                                            </p>
                                        </div>
                                    )}

                                    {/* Video Upload Input */}
                                    {inputType === 'video' && (
                                        <div>
                                            <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 mb-2">
                                                Video File
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="videoFile"
                                                    accept="video/*"
                                                    onChange={handleVideoSelect}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    required={inputType === 'video'}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start space-x-2">
                                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm font-medium text-blue-800">CCTV Simulation Mode</p>
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            Your video will be automatically converted to HLS format and looped continuously to simulate a real CCTV camera feed. 
                                                            This is perfect for testing and demonstration purposes.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Preview */}
                                    {inputType === 'video' && videoPreview && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Preview
                                            </label>
                                            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                                                <video
                                                    src={videoPreview}
                                                    controls
                                                    className="w-full h-48 object-cover"
                                                />
                                                {selectedVideo && (
                                                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                                                        {selectedVideo.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddCameraModal(false);
                                                setHlsUrl('');
                                                setIsSubmitting(false);
                                                setIsSuccess(false);
                                                setInputType('hls');
                                                setSelectedVideo(null);
                                                setVideoPreview(null);
                                                setStreamName('');
                                            }}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !streamName.trim() || (inputType === 'hls' && !hlsUrl.trim()) || (inputType === 'video' && !selectedVideo)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>{inputType === 'video' ? 'Processing Video...' : 'Connecting...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    <span>{inputType === 'video' ? 'Create CCTV Camera' : 'Connect'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                /* Success State */
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-green-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">CCTV Camera Added Successfully!</h4>
                                    <p className="text-gray-600 mb-6">
                                        {inputType === 'video' 
                                            ? "Your video has been converted to HLS format and is now simulating a CCTV camera feed! It will loop continuously and be available in the camera list shortly."
                                            : "Your new camera stream has been connected! It will be available in the camera list shortly and chunked automatically."
                                        }
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowAddCameraModal(false);
                                            setHlsUrl('');
                                            setIsSubmitting(false);
                                            setIsSuccess(false);
                                            setInputType('hls');
                                            setSelectedVideo(null);
                                            setVideoPreview(null);
                                            setStreamName('');
                                        }}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}