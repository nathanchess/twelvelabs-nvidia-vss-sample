"use client";

import ClipBento from "@/app/components/ClipBento";
import React, { useState, useEffect, useRef } from "react";
import ChapterTimeline from "@/app/components/ChapterTimeline";

export default function ClipDetailPage({ params }) {
    
    const [clipData, setClipData] = useState(null);
    const [buttonMetadata, setButtonMetadata] = useState([]);
    const [cachedData, setCachedData] = useState(null);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isAutoRetrying, setIsAutoRetrying] = useState(false);

    const paramsObj = (typeof React.use === 'function') ? React.use(params) : params;
    const { id } = paramsObj;

    useEffect(() => {
        loadClipData();
    }, []);

    // generate button metadata after clipData is available
    useEffect(() => {
        if (clipData && clipData.pegasusId) {
            console.log(clipData)
            generateButtonMetadata();
            generateCacheData()
        }
    }, [clipData]);

    // Auto-start retry for upload/processing errors
    useEffect(() => {
        if (error && (error.type === 'video_not_uploaded' || error.type === 'video_not_ready') && !isAutoRetrying) {
            // Start auto-retry after a short delay
            console.log("Starting auto-retry");
            console.log(error)
            const timer = setTimeout(() => {
                startAutoRetry();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [error]);

    const sampleIds = [['13380578_3840_2160_25fps.mp4', '2ec57a48-d330-4404-a26a-0587348fa865']];

    const loadClipData = async () => {

        const VSS_BASE_URL = process.env.NEXT_PUBLIC_VSS_BASE_URL;

        if (!VSS_BASE_URL) {
            console.error("No VSS base URL found");
            return;
        }

        try {

            /*
            // Fetch NVIDIA VSS file data mappings for VSS ID and file name.
            const vss_response = await fetch(`${VSS_BASE_URL}/files?purpose=vision`);

            if (!vss_response.ok) {
                console.error("Failed to load clip data");
                return;
            }
            const vss_data = await vss_response.json();
            const vss_file_data = vss_data['data'];
            */

            const response = await fetch('/api/video', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                console.error("Failed to load clip data");
                return;
            }

            const data = await response.json();
            
            /*
            // Map VSS file data to Twelve Labs file data and sample IDs.
            for (let fileData of vss_file_data) {
                const fileName = fileData['filename'];
                if (fileName in data) {
                    data[fileName]['vss_id'] = fileData['id'];
                }
            }
            */

            for (let sampleId of sampleIds) {
                const fileName = sampleId[0];
                const vssId = sampleId[1];
                if (fileName in data) {
                    data[fileName]['vss_id'] = vssId;
                }
            }

            for (let key in data) {
                const item = data[key];
                if (id === item['filename']) {
                    console.log("Clip found", item);
                    setClipData(item);
                    return item
                }
            }

            console.log("Clip name", id);
            console.log("Data", data);
            console.log("Mapped data", data);

            return null;

        } catch (error) {
            console.error("Error loading clip data", error);
            return;
        }
    }

    async function generateButtonMetadata() {
        const prompt = `
        Generate button metadata for the factory video attached for compliance issues, issues with personal protective equipment usage, and potential improvements for efficiency. 
        
        Each button should have the following data:
        - title: A concise title summarizing the issue or improvement.
        - description: A detailed description explaining the issue or improvement, its implications, and recommended actions.
        - category: One of the following categories - compliance, improvement, personal protective equipment.
        - x: X coordinate as a percentage (0-100) representing the horizontal position of the button on the video frame percentage values relative to a 16:9 aspect ratio video player that is 1400px wide. Should be extremely accurate.
        - y: Y coordinate as a percentage (0-100) representing the vertical position of the button on the video frame percentage values relative to a 16:9 aspect ratio video player that is 1400px wide. Should be extremely accurate.
        - start: Start time in seconds when the button should appear.
        - end: End time in seconds when the button should disappear.
        - link: (optional) A URL linking to more information or resources related to the issue or improvement.
        
        If multiple issues or improvements are identified, create separate buttons for each. Ensure that the coordinates accurately reflect the location of the issue or improvement in the video frame.
        Ensure x, y percentages are highly accurate. For example, if the issue is with gloves, the percentages should point to the hands of the worker.
        Take into account the factory setting in video content and include relevant safety and compliance considerations into your description.

        Include at least 3 buttons if applicable.

        Respond with a valid JSON array only, no markdown formatting:

        [{
            "title": "Missing Hard Hat",
            "description": "Worker on the left side of the frame is not wearing a hard hat while operating machinery, which is a safety violation. Recommend immediate compliance with PPE regulations to prevent head injuries.",
            "category": "personal protective equipment",
            "x": 32,
            "y": 78,
            "start": 15,
            "end": 45,
            "link": "https://www.osha.gov/personal-protective-equipment"
        }]

        `;
        
        try {

            if (!clipData || !clipData.pegasusId) {
                console.warn('No clipData available for analysis yet');
                return;
            }

            const response = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: clipData['pegasusId'],
                    userQuery: prompt
                })
            })

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to analyze video", errorData);
                
                // Check for video_not_ready error
                if (errorData.code === 'video_not_ready') {
                    setError({
                        type: 'video_not_ready',
                        message: errorData.message || 'The video is still being indexed. Please try again once the indexing process is complete.'
                    });
                    return;
                }
                
                // Check for video_not_uploaded error
                if (errorData.code === 'video_not_uploaded') {
                    setError({
                        type: 'video_not_uploaded',
                        message: errorData.message || 'The video is still being uploaded and processed. Please wait for the upload to complete.'
                    });
                    return;
                }
                
                setError({
                    type: 'analysis_error',
                    message: 'Failed to analyze video. Please try again.'
                });
                return;
            }

            const data = await response.json();
            console.log("Analysis API response:", data);
            
            // Check if the response has the expected structure
            if (data && data.data) {
                try {
                    const json_data = JSON.parse(data['data'].replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, ''));
                    console.log("Analysis response", json_data);

                    setButtonMetadata(json_data);
                    setError(null); // Clear any previous errors
                } catch (parseError) {
                    console.error("Error parsing analysis response:", parseError);
                    setError({
                        type: 'analysis_error',
                        message: 'Failed to parse analysis response. The video may still be processing.'
                    });
                }
            } else {
                console.warn("Unexpected analysis response structure:", data);
                setError({
                    type: 'analysis_error',
                    message: 'Unexpected response format from analysis service.'
                });
            }

        }

        catch (error) {
            console.error("Error during analysis", error);
            setError({
                type: 'analysis_error',
                message: 'An error occurred during video analysis. Please try again.'
            });
            return;
        }
    }

    async function generateCacheData() {

        if (!clipData || !clipData.pegasusId) {
            console.warn('No clipData available for analysis yet');
            return;
        }

        try {

            const response = await fetch(`/api/analysis/${clipData['pegasusId']}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to fetch cached analysis data", errorData);
                
                // Check for video_not_ready error
                if (errorData.code === 'video_not_ready') {
                    setError({
                        type: 'video_not_ready',
                        message: errorData.message || 'The video is still being indexed. Please try again once the indexing process is complete.'
                    });
                    return;
                }
                
                // Check for video_not_uploaded error
                if (errorData.code === 'video_not_uploaded') {
                    setError({
                        type: 'video_not_uploaded',
                        message: errorData.message || 'The video is still being uploaded and processed. Please wait for the upload to complete.'
                    });
                    return;
                }
                
                // For cached data, we can continue without it
                console.warn("Could not fetch cached analysis data, continuing without it");
                return;
            }

            const data = await response.json();
            console.log("Cached analysis response", data);

            setCachedData(data);
            setError(null); // Clear any previous errors

        } catch (error) {
            console.error("Error fetching cached analysis data", error);
            // For cached data errors, we don't need to show an error to the user
            return;
        }
    }

    const retryAnalysis = async () => {
        setIsRetrying(true);
        setError(null);
        setRetryCount(prev => prev + 1);
        
        try {
            await generateButtonMetadata();
            await generateCacheData();
        } catch (error) {
            console.error("Error during retry", error);
        } finally {
            setIsRetrying(false);
        }
    };

    const startAutoRetry = () => {
        if (isAutoRetrying) return;
        
        setIsAutoRetrying(true);
        setRetryCount(0);
        
        const autoRetry = async () => {
            if (retryCount >= 10) { // Max 10 retries
                setIsAutoRetrying(false);
                return;
            }
            
            try {
                await generateButtonMetadata();
                await generateCacheData();
                
                // If successful, stop auto-retry
                if (!error) {
                    setIsAutoRetrying(false);
                    return;
                }
            } catch (error) {
                console.error("Error during auto-retry", error);
            }
            
            // Wait 5 seconds before next retry
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                autoRetry();
            }, 5000);
        };
        
        autoRetry();
    };

    const stopAutoRetry = () => {
        setIsAutoRetrying(false);
        setRetryCount(0);
    };

    // Small helper to format dates from a few common possible fields
    function formatClipDate(item) {
        if (!item) return null;
        const possible = item.date || item.createdAt || item.recorded_at || item.timestamp || item.uploaded_at;
        if (!possible) return null;
        try {
            const d = new Date(possible);
            if (isNaN(d.getTime())) return String(possible);
            return d.toLocaleString();
        } catch (e) {
            return String(possible);
        }
    }

    function getTags(obj) {
        const raw = obj?.hashtags ?? obj?.tags ?? null;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 12);
        if (typeof raw === 'string') return raw.split(/[,\s]+/).map(t => t.replace(/^#/, '')).filter(Boolean).slice(0, 12);
        return [];
    }

    const displayDate = formatClipDate(clipData);
    const tags = getTags(cachedData);

    return (
        <div className="p-4">
            {/* Header: title, date, tags */}
            <div className="rounded-lg p-4 mb-4 bg-white/5 backdrop-blur-md ring-1 ring-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-600">{clipData ? clipData['filename'] : 'Video Title'}</h1>
                    {displayDate ? (
                        <p className="mt-1 text-sm text-emerald"><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-600 font-medium">Recorded: {displayDate}</span></p>
                    ) : null}
                </div>

                <div className="flex-shrink-0 flex items-center gap-3">
                    {tags && tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {tags.map((t, i) => (
                                <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-600 ring-1 ring-emerald-200/20">
                                    #{t}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-600">No tags</div>
                    )}
                </div>
            </div>
            
            {/* Error Display */}
            {error && (
                <div className={`mt-4 rounded-lg p-6 border ${
                    error.type === 'video_not_uploaded' 
                        ? 'bg-blue-50 border-blue-200' 
                        : error.type === 'video_not_ready'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {error.type === 'video_not_uploaded' ? (
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                            ) : error.type === 'video_not_ready' ? (
                                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3 flex-1">
                            <h3 className={`text-lg font-medium ${
                                error.type === 'video_not_uploaded' 
                                    ? 'text-blue-800' 
                                    : error.type === 'video_not_ready'
                                    ? 'text-amber-800'
                                    : 'text-red-800'
                            }`}>
                                {error.type === 'video_not_uploaded' 
                                    ? 'Video Being Uploaded' 
                                    : error.type === 'video_not_ready'
                                    ? 'Video Still Processing'
                                    : 'Analysis Error'
                                }
                            </h3>
                            <p className={`mt-1 text-sm ${
                                error.type === 'video_not_uploaded' 
                                    ? 'text-blue-700' 
                                    : error.type === 'video_not_ready'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                            }`}>
                                {error.message}
                            </p>
                            
                            {/* Auto-retry status for upload/processing errors */}
                            {(error.type === 'video_not_uploaded' || error.type === 'video_not_ready') && (
                                <div className="mt-3">
                                    {isAutoRetrying ? (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Auto-checking every 5 seconds... (Attempt {retryCount}/10)
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-600">
                                            We'll automatically check when the video is ready.
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={retryAnalysis}
                                    disabled={isRetrying || isAutoRetrying}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRetrying ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Retrying...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Try Now
                                        </>
                                    )}
                                </button>
                                
                                {(error.type === 'video_not_uploaded' || error.type === 'video_not_ready') && (
                                    <>
                                        {!isAutoRetrying ? (
                                            <button
                                                onClick={startAutoRetry}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                                            >
                                                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Auto-Retry
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopAutoRetry}
                                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                                            >
                                                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Stop Auto-Retry
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ClipBento Component with Video, Chat, and Forensics */}
            <div className="mt-4">
                {clipData ? (
                    <ClipBento 
                        clipData={clipData}
                        buttonMetadata={buttonMetadata}
                        videoId={clipData['pegasusId']}
                    />
                ) : (
                    <div className="absolute inset-0 top-16 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100 z-40">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mb-6"></div>
                        <p className="text-gray-600 font-medium text-lg">Loading clip data...</p>
                    </div>
                )}
            </div>
        </div>
    )

}