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
                    throw new Error(`Failed to fetch timeline data: ${response.status}`);
                }

                const data = await response.json();
                
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
                } else {
                    throw new Error("Invalid data structure received");
                }

            } catch (err) {
                console.error("Error loading timeline data:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (videoId) {
            loadTimelineData();
        }
    }, [videoId]);

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
        return (
            <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <DocumentTextIcon className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Chapter Timeline
                    </h2>
                </div>
                <div className="text-center py-8">
                    <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-medium">Failed to load timeline</p>
                    <p className="text-gray-600 text-sm mt-2">{error}</p>
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