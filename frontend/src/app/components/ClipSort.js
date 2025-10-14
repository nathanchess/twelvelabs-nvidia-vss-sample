'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function ClipSort({ clipData = [], onFilterChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [category, setCategory] = useState('all');
  const [criticalLevel, setCriticalLevel] = useState('all');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const exampleQueries = [
    "Worker coughing or sick near the CNC machine",
    "Safety equipment not being worn properly",
    "Machinery malfunction or unusual vibrations",
    "Product defects on assembly line",
    "Unauthorized personnel in restricted areas",
    "Spillage or hazardous material on floor",
    "Equipment overheating or sparking",
    "Quality control issues with finished products"
  ];

  const sortOptions = [
    { value: 'date', label: 'Date', icon: CalendarDaysIcon },
    { value: 'time', label: 'Time', icon: ClockIcon },
    { value: 'category', label: 'Category', icon: TagIcon },
    { value: 'critical', label: 'Critical Level', icon: ExclamationTriangleIcon }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'safety', label: 'Safety', color: 'bg-red-100 text-red-800' },
    { value: 'defect', label: 'Defect', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'general', label: 'General', color: 'bg-blue-100 text-blue-800' }
  ];

  const criticalLevels = [
    { value: 'all', label: 'All Levels' },
    { value: 'high', label: 'High Priority', color: 'bg-red-500' },
    { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low Priority', color: 'bg-green-500' }
  ];

  const handleExampleClick = async (example) => {
    setSearchQuery(example);
    setShowExamples(false);
    // Trigger search when example is clicked
    const filteredClips = await filterAndSortClips(clipData);
    if (onFilterChange) {
      onFilterChange(filteredClips);
    }
  };

  // Mock function to determine category based on filename or content
  const getCategoryFromClip = (clip) => {
    const filename = clip.filename?.toLowerCase() || '';
    if (filename.includes('safety') || filename.includes('ppe') || filename.includes('helmet')) {
      return 'safety';
    } else if (filename.includes('defect') || filename.includes('quality') || filename.includes('error')) {
      return 'defect';
    }
    return 'general';
  };

  // Mock function to determine priority based on content analysis
  const getPriorityFromClip = (clip) => {
    const filename = clip.filename?.toLowerCase() || '';
    if (filename.includes('urgent') || filename.includes('critical') || filename.includes('emergency')) {
      return 'high';
    } else if (filename.includes('warning') || filename.includes('caution')) {
      return 'medium';
    }
    return 'low';
  };

  // Search function - integrates with Twelve Labs API
  const performSemanticSearch = async (query, clips) => {
    if (!query.trim()) {
      // Convert clips to array if it's an object
      return Array.isArray(clips) ? clips : Object.values(clips);
    }
    
    setIsSearching(true);
    try {
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, groupBy: 'clip', threshold: 'none' })
      })

      const data = await response.json();
      const json_data = data['data'];

      console.log("Search response:", data);

      // Sort data by score (highest first)
      const sortedData = json_data.sort((a, b) => b.score - a.score);

      console.log("Sorted data:", sortedData);
      
      // Convert clips to array if it's an object
      const clipsArray = Array.isArray(clips) ? clips : Object.values(clips);

      console.log("Clips array:", clipsArray);
      
      // Debug: Log the IDs we're trying to match
      console.log("Search result videoIds:", sortedData.map(r => r.videoId));
      console.log("Clip IDs:", clipsArray.map(c => ({ id: c.id, vss_id: c.vss_id, systemMetadata_vss_id: c.systemMetadata?.vss_id })));
      
      // First, deduplicate results by videoId, keeping the highest scoring one
      const deduplicatedResults = sortedData.reduce((acc, result) => {
        const existing = acc.find(r => r.videoId === result.videoId);
        if (!existing || result.score > existing.score) {
          // Remove existing if it has lower score, or add new result
          const filtered = acc.filter(r => r.videoId !== result.videoId);
          return [...filtered, result];
        }
        return acc;
      }, []);

      console.log("Deduplicated results:", deduplicatedResults);

      // Map the deduplicated results back to clip data with search scores
      const sortedClips = deduplicatedResults.map(result => {
        // Find the corresponding clip from clipsArray by trying multiple ID fields
        const clip = clipsArray.find(c => 
          c.id === result.videoId || 
          c.vss_id === result.videoId ||
          c.systemMetadata?.vss_id === result.videoId
        );
        if (clip) {
          console.log(`Found matching clip for videoId ${result.videoId}:`, clip.id);
          // Add search score and confidence to the clip data
          return {
            ...clip,
            searchScore: result.score,
            searchConfidence: result.confidence
          };
        } else {
          console.log(`No matching clip found for videoId: ${result.videoId}`);
        }
        return null;
      }).filter(Boolean); // Remove any undefined results
      
      return sortedClips;
      
    } catch (error) {
      console.error('Search error:', error);
      // Convert clips to array if it's an object
      return Array.isArray(clips) ? clips : Object.values(clips);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter and sort clips based on current state
  const filterAndSortClips = async (clips) => {
    // Convert object to array if needed
    const clipsArray = Array.isArray(clips) ? clips : Object.values(clips);
    let filteredClips = [...clipsArray];

    // Apply search filter
    if (searchQuery.trim()) {
      filteredClips = await performSemanticSearch(searchQuery, clipsArray);
    }

    // Apply category filter
    if (category !== 'all') {
      filteredClips = filteredClips.filter(clip => getCategoryFromClip(clip) === category);
    }

    // Apply priority filter
    if (criticalLevel !== 'all') {
      filteredClips = filteredClips.filter(clip => getPriorityFromClip(clip) === criticalLevel);
    }

    // Apply sorting
    filteredClips.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'time':
          return (b.duration || 0) - (a.duration || 0);
        case 'category':
          return getCategoryFromClip(a).localeCompare(getCategoryFromClip(b));
        case 'critical':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[getPriorityFromClip(b)] - priorityOrder[getPriorityFromClip(a)];
        default:
          return 0;
      }
    });

    return filteredClips;
  };

  // Effect to handle filtering when filters change (but not search query)
  useEffect(() => {
    const applyFilters = async () => {
      const filteredClips = await filterAndSortClips(clipData);
      if (onFilterChange) {
        onFilterChange(filteredClips);
      }
    };

    applyFilters();
  }, [sortBy, category, criticalLevel, clipData]);

  // Handle search button click
  const handleSearch = async () => {
    const filteredClips = await filterAndSortClips(clipData);
    if (onFilterChange) {
      onFilterChange(filteredClips);
    }
  };

  // Handle Enter key in search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-24 z-40">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Semantic Search - Main Feature */}
          <div className="flex-1">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 font-inter mb-3">
                <SparklesIcon className="inline h-4 w-4 mr-2 text-lime-500" />
                AI-Powered Semantic Search
              </label>
              
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowExamples(true)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search clips by content, behavior, or safety incidents..."
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-200 font-inter placeholder-gray-500"
                />
                
                {/* Search Button */}
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="cursor-pointer absolute right-2 top-1/2 transform -translate-y-1/2 bg-lime-500 hover:bg-lime-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-all duration-200 font-medium font-inter"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Example Queries Dropdown */}
              {showExamples && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowExamples(false)}
                  ></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-40 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 font-inter mb-2">Example Searches</h3>
                      <p className="text-xs text-gray-600">Click any example to try it out</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {exampleQueries.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(example)}
                          className="cursor-pointer w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 font-inter"
                        >
                          <SparklesIcon className="inline h-3 w-3 mr-2 text-lime-500" />
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sorting Controls */}
          <div className="flex flex-wrap gap-4 lg:flex-nowrap">
            
            {/* Sort By Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 font-inter mb-3">
                <FunnelIcon className="inline h-4 w-4 mr-2" />
                Sort By
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center space-x-2 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium font-inter text-gray-700 hover:bg-gray-50 transition-all duration-200 min-w-40"
                >
                  {React.createElement(sortOptions.find(opt => opt.value === sortBy)?.icon || CalendarDaysIcon, { className: "h-4 w-4" })}
                  <span>{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                  <ChevronDownIcon className="h-4 w-4 ml-auto" />
                </button>
                
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowSortDropdown(false)}></div>
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-40 min-w-40 animate-in slide-in-from-top-2 duration-200">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors duration-150 font-inter"
                        >
                          <option.icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-3">
                <TagIcon className="inline h-4 w-4 mr-2" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium font-inter text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-36"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Critical Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-inter mb-3">
                <ExclamationTriangleIcon className="inline h-4 w-4 mr-2" />
                Priority
              </label>
              <select
                value={criticalLevel}
                onChange={(e) => setCriticalLevel(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium font-inter text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-36"
              >
                {criticalLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
