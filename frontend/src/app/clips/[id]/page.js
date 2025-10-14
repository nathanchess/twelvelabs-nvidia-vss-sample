"use client";

import ClipBento from "@/app/components/ClipBento";
import React, { useState, useEffect, useRef } from "react";
import ChapterTimeline from "@/app/components/ChapterTimeline";

export default function ClipDetailPage({ params }) {
    
    const [clipData, setClipData] = useState(null);
    const [buttonMetadata, setButtonMetadata] = useState([]);
    const [cachedData, setCachedData] = useState(null);

    const paramsObj = (typeof React.use === 'function') ? React.use(params) : params;
    const { id } = paramsObj;

    useEffect(() => {
        loadClipData();
    }, []);

    // generate button metadata after clipData is available
    useEffect(() => {
        if (clipData && clipData.id) {
            console.log(clipData)
            generateButtonMetadata();
            generateCacheData()
        }
    }, [clipData]);

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

            if (!clipData || !clipData.id) {
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
                console.error("Failed to analyze video");
                return;
            }

            const data = await response.json();
            const json_data = JSON.parse(data['data'].replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, ''));
            console.log("Analysis response", json_data);

            setButtonMetadata(json_data);

        }

        catch (error) {
            console.error("Error during analysis", error);
            return;
        }
    }

    async function generateCacheData() {
        try {

            const response = await fetch(`/api/analysis/${clipData['pegasusId']}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                console.error("Failed to fetch cached analysis data");
                return;
            }

            const data = await response.json();
            console.log("Cached analysis response", data);

            setCachedData(data);

        } catch (error) {

            console.error("Error fetching cached analysis data", error);
            return;

        }
    }

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