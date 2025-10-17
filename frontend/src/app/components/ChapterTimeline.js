import { useEffect, useState } from "react";
import { 
    PlayIcon, 
    ClockIcon, 
    DocumentTextIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    CogIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function ChapterTimeline({ videoId, onSeekTo }) {
    const [chapters, setChapters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isAutoRetrying, setIsAutoRetrying] = useState(false);

    useEffect(() => {
        const loadTimelineData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const prompt = `
                You are an expert EHS (Environment, Health, and Safety) and Operations analyst. Your task is to analyze this video and generate a concise, event-driven chapter timeline.

                For each chapter, identify a single, distinct event. Focus on the following categories in order of priority:
                1.  **Safety Events**: Any potential OSHA violation, unsafe act (e.g., improper lifting), or unsafe condition (e.g., a spill).
                2.  **Operational Inefficiencies**: Clear instances of Lean Manufacturing wastes like waiting, unnecessary motion, or bottlenecks.
                3.  **Key Process Milestones**: The start or end of a specific task (e.g., "Begin welding," "Forklift departs," "Concrete pour completed").

                For each chapter:
                - The **Chapter Title** must be a short, active phrase describing the event (e.g., "Improper PPE Usage," "Worker Waiting for Materials," "Crane Lift Initiated").
                - The **Chapter Summary** must be a single, objective sentence describing precisely what is happening in that clip. Include if there is any systematic issue or risk within that clip.

                `;

                const response = await fetch('/api/timeline', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId, prompt, type: 'chapter' }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    
                    // Check for video processing errors
                    if (errorData.code === 'video_not_ready' || errorData.code === 'video_not_uploaded') {
                        setError({
                            type: errorData.code,
                            message: errorData.message
                        });
                        return;
                    }
                    
                    throw new Error(`Failed to fetch timeline data: ${response.status}`);
                }

                const data = await response.json();
                console.log("Timeline API response:", data);
                
                // Handle the expected data structure
                if ("chapters" in data && Array.isArray(data.chapters)) {
                    const chapters = data.chapters;
                    console.log("Loaded chapters:", chapters.length);
                    
                    // Log each chapter as expected
                    for (const chapter of chapters) {
                        console.log(
                            `Chapter ${chapter.chapterNumber}\nstart=${chapter.startSec}\nend=${chapter.endSec}\nTitle=${chapter.chapterTitle}\nSummary=${chapter.chapterSummary}`,
                        );
                    }
                    
                    setChapters(chapters);
                    setError(null); // Clear any previous errors
                } else if (data && typeof data === 'object') {
                    // Check if it's an error response
                    if (data.code === 'video_not_ready' || data.code === 'video_not_uploaded') {
                        setError({
                            type: data.code,
                            message: data.message
                        });
                        return;
                    }
                    
                    // If it's a different structure, try to extract chapters from other possible locations
                    console.warn("Unexpected data structure, attempting to extract chapters:", data);
                    
                    // Check if chapters might be in a different property
                    let chapters = null;
                    if (data.data && Array.isArray(data.data)) {
                        chapters = data.data;
                    } else if (Array.isArray(data)) {
                        chapters = data;
                    } else if (data.result && Array.isArray(data.result)) {
                        chapters = data.result;
                    }
                    
                    if (chapters && chapters.length > 0) {
                        console.log("Extracted chapters from alternative structure:", chapters.length);
                        setChapters(chapters);
                        setError(null);
                    } else {
                        throw new Error(`Invalid data structure received. Expected 'chapters' array, got: ${JSON.stringify(data).substring(0, 200)}...`);
                    }
                } else {
                    throw new Error(`Invalid data structure received. Expected object with 'chapters' array, got: ${typeof data}`);
                }

            } catch (err) {
                console.error("Error loading timeline data:", err);
                setError({
                    type: 'timeline_error',
                    message: err.message
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (videoId) {
            loadTimelineData();
        }
    }, [videoId]);

    // Auto-start retry for upload/processing errors
    useEffect(() => {
        if (error && (error.type === 'video_not_uploaded' || error.type === 'video_not_ready') && !isAutoRetrying) {
            // Start auto-retry after a short delay
            const timer = setTimeout(() => {
                startAutoRetry();
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [error]);

    const retryTimeline = async () => {
        setIsRetrying(true);
        setError(null);
        setRetryCount(prev => prev + 1);
        
        try {
            const prompt = `
            You are an expert EHS (Environment, Health, and Safety) and Operations analyst. Your task is to analyze this video and generate a concise, event-driven chapter timeline.

            For each chapter, identify a single, distinct event. Focus on the following categories in order of priority:
            1.  **Safety Events**: Any potential OSHA violation, unsafe act (e.g., improper lifting), or unsafe condition (e.g., a spill).
            2.  **Operational Inefficiencies**: Clear instances of Lean Manufacturing wastes like waiting, unnecessary motion, or bottlenecks.
            3.  **Key Process Milestones**: The start or end of a specific task (e.g., "Begin welding," "Forklift departs," "Concrete pour completed").

            For each chapter:
            - The **Chapter Title** must be a short, active phrase describing the event (e.g., "Improper PPE Usage," "Worker Waiting for Materials," "Crane Lift Initiated").
            - The **Chapter Summary** must be a single, objective sentence describing precisely what is happening in that clip. Include if there is any systematic issue or risk within that clip.

            `;

            const response = await fetch('/api/timeline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoId, prompt, type: 'chapter' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                
                // Check for video processing errors
                if (errorData.code === 'video_not_ready' || errorData.code === 'video_not_uploaded') {
                    setError({
                        type: errorData.code,
                        message: errorData.message
                    });
                    return;
                }
                
                throw new Error(`Failed to fetch timeline data: ${response.status}`);
            }

            const data = await response.json();
            console.log("Timeline retry API response:", data);
            
            // Handle the expected data structure
            if ("chapters" in data && Array.isArray(data.chapters)) {
                const chapters = data.chapters;
                console.log("Loaded chapters:", chapters.length);
                
                setChapters(chapters);
                setError(null); // Clear any previous errors
            } else if (data && typeof data === 'object') {
                // Check if it's an error response
                if (data.code === 'video_not_ready' || data.code === 'video_not_uploaded') {
                    setError({
                        type: data.code,
                        message: data.message
                    });
                    return;
                }
                
                // If it's a different structure, try to extract chapters from other possible locations
                console.warn("Unexpected data structure in retry, attempting to extract chapters:", data);
                
                // Check if chapters might be in a different property
                let chapters = null;
                if (data.data && Array.isArray(data.data)) {
                    chapters = data.data;
                } else if (Array.isArray(data)) {
                    chapters = data;
                } else if (data.result && Array.isArray(data.result)) {
                    chapters = data.result;
                }
                
                if (chapters && chapters.length > 0) {
                    console.log("Extracted chapters from alternative structure in retry:", chapters.length);
                    setChapters(chapters);
                    setError(null);
                } else {
                    throw new Error(`Invalid data structure received in retry. Expected 'chapters' array, got: ${JSON.stringify(data).substring(0, 200)}...`);
                }
            } else {
                throw new Error(`Invalid data structure received in retry. Expected object with 'chapters' array, got: ${typeof data}`);
            }

        } catch (err) {
            console.error("Error during timeline retry:", err);
            setError({
                type: 'timeline_error',
                message: err.message
            });
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
                await retryTimeline();
                
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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getChapterIcon = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('safety') || lowerTitle.includes('ppe') || lowerTitle.includes('violation')) {
            return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
        } else if (lowerTitle.includes('efficiency') || lowerTitle.includes('waste') || lowerTitle.includes('process')) {
            return <CogIcon className="w-5 h-5 text-blue-500" />;
        } else {
            return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        }
    };

    const getChapterType = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('safety') || lowerTitle.includes('ppe') || lowerTitle.includes('violation')) {
            return 'Safety';
        } else if (lowerTitle.includes('efficiency') || lowerTitle.includes('waste') || lowerTitle.includes('process')) {
            return 'Operational';
        } else {
            return 'General';
        }
    };

    const handleChapterClick = (chapter) => {
        if (onSeekTo && typeof onSeekTo === 'function') {
            onSeekTo(chapter.startSec);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Chapter Timeline
                    </h2>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span className="ml-3 text-gray-600">Loading chapters...</span>
                </div>
            </div>
        );
    }

    if (error) {
        const isProcessingError = error.type === 'video_not_uploaded' || error.type === 'video_not_ready';
        
        return (
            <div className={`bg-white border rounded-xl p-6 shadow-sm ${
                isProcessingError 
                    ? error.type === 'video_not_uploaded' 
                        ? 'border-blue-200' 
                        : 'border-amber-200'
                    : 'border-red-200'
            }`}>
                <div className="flex items-center space-x-3 mb-4">
                    <DocumentTextIcon className={`w-6 h-6 ${
                        isProcessingError 
                            ? error.type === 'video_not_uploaded' 
                                ? 'text-blue-600' 
                                : 'text-amber-600'
                            : 'text-red-600'
                    }`} />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Chapter Timeline
                    </h2>
                </div>
                
                <div className="text-center py-8">
                    {isProcessingError ? (
                        error.type === 'video_not_uploaded' ? (
                            <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        ) : (
                            <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )
                    ) : (
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    )}
                    
                    <p className={`font-medium ${
                        isProcessingError 
                            ? error.type === 'video_not_uploaded' 
                                ? 'text-blue-600' 
                                : 'text-amber-600'
                            : 'text-red-600'
                    }`}>
                        {isProcessingError 
                            ? error.type === 'video_not_uploaded' 
                                ? 'Video Being Uploaded' 
                                : 'Video Still Processing'
                            : 'Failed to load timeline'
                        }
                    </p>
                    <p className={`text-sm mt-2 ${
                        isProcessingError 
                            ? error.type === 'video_not_uploaded' 
                                ? 'text-blue-700' 
                                : 'text-amber-700'
                            : 'text-gray-600'
                    }`}>
                        {error.message}
                    </p>
                    
                    {/* Auto-retry status for upload/processing errors */}
                    {isProcessingError && (
                        <div className="mt-4">
                            {isAutoRetrying ? (
                                <div className="flex items-center justify-center text-sm text-gray-600">
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
                    
                    {/* Action buttons */}
                    <div className="mt-6 flex justify-center gap-3">
                        <button
                            onClick={retryTimeline}
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
                        
                        {isProcessingError && (
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
        );
    }

    if (!chapters || chapters.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Chapter Timeline
                    </h2>
                </div>
                <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No chapters found</p>
                    <p className="text-gray-500 text-sm mt-2">This video doesn't have any identified chapters yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
                <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                    Chapter Timeline
                </h2>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                    {chapters.length} Chapter(s)
                </span>
            </div>

            <div className="space-y-4">
                {chapters.map((chapter, index) => {
                    const type = getChapterType(chapter.chapterTitle);
                    const duration = chapter.endSec - chapter.startSec;
                    
                    return (
                        <div
                            key={chapter.chapterNumber}
                            onClick={() => handleChapterClick(chapter)}
                            className="group relative bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer border border-gray-200 hover:border-emerald-300 hover:shadow-md"
                        >
                            <div className="flex items-start space-x-4">
                                {/* Chapter Number & Icon */}
                                <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        type === 'safety' ? 'bg-red-100 ring-1 ring-red-200' :
                                        type === 'operational' ? 'bg-blue-100 ring-1 ring-blue-200' :
                                        'bg-green-100 ring-1 ring-green-200'
                                    }`}>
                                        <span className={`text-sm font-bold ${
                                            type === 'safety' ? 'text-red-700' :
                                            type === 'operational' ? 'text-blue-700' :
                                            'text-green-700'
                                        }`}>
                                            {chapter.chapterNumber}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        {getChapterIcon(chapter.chapterTitle)}
                                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            {chapter.chapterTitle}
                                        </h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            type === 'safety' ? 'bg-red-100 text-red-700' :
                                            type === 'operational' ? 'bg-blue-100 text-blue-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {type}
                                        </span>
                                    </div>
                                    
                                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                        {chapter.chapterSummary}
                                    </p>

                                    {/* Time Info */}
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{formatTime(chapter.startSec)} - {formatTime(chapter.endSec)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <PlayIcon className="w-4 h-4" />
                                            <span>{formatTime(duration)} duration</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Play Button */}
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                        <ChevronRightIcon className="w-4 h-4 text-emerald-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 ${
                                        type === 'safety' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                        type === 'operational' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                                        'bg-gradient-to-r from-green-500 to-green-400'
                                    }`}
                                    style={{ width: '0%' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}