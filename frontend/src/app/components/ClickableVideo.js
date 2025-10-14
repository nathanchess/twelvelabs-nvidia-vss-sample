"use client";

import React, { useEffect, useState, useRef } from "react";
import ClickableVideoButton from "./ClickableVideoButton";

export default function ClickableVideo({ hlsUrl, thumbnailUrl, button_metadata = [], height, width }) {

    const videoRef = useRef(null);
    const [videoTime, setVideoTime] = useState(0);

    useEffect(() => {

        let hls;

        const video = videoRef.current;

        if (video && hlsUrl) {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(hlsUrl);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = video_url;
            }
        }

        const handleTimeUpdate = () => {
            const currentTime = video?.currentTime;
            setVideoTime(currentTime);
        };

        if (video) {
            video.addEventListener('timeupdate', handleTimeUpdate);
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
            if (video) {
                video.removeEventListener('timeupdate', handleTimeUpdate);
            }
        }

    }, [hlsUrl])

    return (
        <div className="relative rounded-lg shadow-lg overflow-hidden" style={{ height: height || 'auto', width: width || '100%' }}>
            <video 
                ref={videoRef}
                className="w-full h-auto"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                poster={thumbnailUrl}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />

            <div className="absolute inset-0 pointer-events-none">
                {button_metadata ? button_metadata.map((btn, idx) => {
                    const { x = 50, y = 50, title, description, onClick, start, end, category, link } = btn;
                    if (!(start <= videoTime && videoTime <= end)) return null;
                    const ariaId = `cv-btn-tooltip-${idx}`;
                    return ( 
                        <ClickableVideoButton
                            key={idx}
                            x={x}
                            y={y}
                            title={title}
                            tooltip={description}
                            onClick={onClick}
                            ariaId={ariaId}
                            category={category}
                            link={link}
                        />
                    )
                }) : null}
            </div>
        </div>
    )

}