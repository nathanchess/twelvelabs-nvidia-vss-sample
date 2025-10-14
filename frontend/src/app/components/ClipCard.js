'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { 
  PlayIcon, 
  CalendarIcon, 
  ClockIcon,
  EyeIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Hls from 'hls.js';
import { useRouter } from 'next/navigation';

export default function ClipCard({ video_url, createdAt, duration, name, thumbnail_url, vss_id, category, priority, searchScore, searchConfidence }) {
    const [hovered, setHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const videoRef = useRef(null);
    const router = useRouter();

    // Get category and priority from props or determine from filename
    const getCategory = () => {
      if (category) return category;
      const filename = name?.toLowerCase() || '';
      if (filename.includes('safety') || filename.includes('ppe') || filename.includes('helmet')) {
        return 'safety';
      } else if (filename.includes('defect') || filename.includes('quality') || filename.includes('error')) {
        return 'defect';
      }
      return 'general';
    };

    const getPriority = () => {
      if (priority) return priority;
      const filename = name?.toLowerCase() || '';
      if (filename.includes('urgent') || filename.includes('critical') || filename.includes('emergency')) {
        return 'high';
      } else if (filename.includes('warning') || filename.includes('caution')) {
        return 'medium';
      }
      return 'low';
    };

    const clipCategory = getCategory();
    const clipPriority = getPriority();

    useEffect(() => {
        let hls;

        if (hovered && videoRef.current && video_url) {
            const video = videoRef.current;

            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(video_url);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = video_url;
            }
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [hovered, video_url]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCategoryColor = (category) => {
        switch(category) {
            case 'safety': return 'bg-red-100 text-red-800';
            case 'defect': return 'bg-yellow-100 text-yellow-800';
            case 'general': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const handleClick = () => {
        console.log('View clip details for:', vss_id || name);
        router.push(`/clips/${name}`); // Navigate to clip detail page
    };

    return (
        <div 
            className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-1"
            onMouseEnter={() => setHovered(true)} 
            onMouseLeave={() => setHovered(false)}
            onClick={handleClick}
        >
            {/* Video/Thumbnail Container */}
            <div className="relative h-48 bg-gray-200 overflow-hidden">
                {!hovered ? (
                    <>
                        {!imageError && thumbnail_url ? (
                            <Image 
                                src={thumbnail_url} 
                                alt={name || 'Video thumbnail'} 
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                <PlayIcon className="h-16 w-16 text-gray-600" />
                            </div>
                        )}
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                            <div className="w-20 h-20 bg-white/95 rounded-full flex items-center justify-center group-hover:bg-white group-hover:scale-125 transition-all duration-300 shadow-lg">
                                <PlayIcon className="h-8 w-8 text-gray-700 ml-1" />
                            </div>
                        </div>

                        {/* View Details Button */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/90 hover:bg-white rounded-lg px-3 py-2 flex items-center space-x-2 text-sm font-medium text-gray-700 shadow-md">
                                <EyeIcon className="h-4 w-4" />
                                <span>View Details</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <video 
                        ref={videoRef} 
                        muted 
                        autoPlay 
                        loop 
                        playsInline 
                        disablePictureInPicture
                        controlsList="nodownload nofullscreen noremoteplayback"
                        className="w-full h-full object-cover"
                        poster={thumbnail_url}
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* Duration Badge */}
                {duration && (
                    <div className="absolute bottom-3 left-3 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">
                        {formatDuration(duration)}
                    </div>
                )}

                {/* Priority Indicator */}
                <div className="absolute bottom-3 right-3">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(clipPriority)} shadow-lg`}></div>
                </div>

                {/* Search Score Badge */}
                {searchScore && (
                    <div className="absolute top-3 left-3 bg-lime-500 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg backdrop-blur-sm">
                        {searchScore.toFixed(1)}
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div className="p-5">
                {/* Title */}
                <h3 className="font-bold text-lg text-gray-900 font-inter mb-3 group-hover:text-lime-600 transition-colors duration-300 line-clamp-2">
                    {name || 'Untitled Video'}
                </h3>
                
                {/* Metadata */}
                <div className="space-y-3 mb-4">
                    {/* Date */}
                    {createdAt && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{formatDate(createdAt)}</span>
                        </div>
                    )}
                    
                    {/* Duration */}
                    {duration && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span>Duration: {formatDuration(duration)}</span>
                        </div>
                    )}

                    {/* Search Score */}
                    {searchScore && (
                        <div className="flex items-center space-x-2 text-sm">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-lime-500 rounded-full"></div>
                                <span className="text-gray-600">Relevance:</span>
                                <span className="font-bold text-lime-600">{searchScore.toFixed(1)}</span>
                                {searchConfidence && (
                                    <span className="text-xs text-gray-500 capitalize">({searchConfidence})</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tags Section */}
                <div className="flex items-center justify-between mb-4">
                    {/* Category Tag */}
                    <div className="flex items-center space-x-2">
                        <TagIcon className="h-4 w-4 text-gray-400" />
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(clipCategory)}`}>
                            {clipCategory.charAt(0).toUpperCase() + clipCategory.slice(1)}
                        </span>
                    </div>
                    
                    {/* Priority */}
                    <div className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
                        <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(clipPriority)}`}></div>
                            <span className="text-xs text-gray-500 capitalize font-medium">{clipPriority} Priority</span>
                        </div>
                    </div>
                </div>

                {/* VSS ID Footer */}
                {vss_id && (
                    <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-mono">
                                VSS: {vss_id.substring(0, 12)}...
                            </span>
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-gray-500">Active</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Click to view indicator */}
                <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-center text-xs text-gray-500">
                        <span>Click to view full details</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
