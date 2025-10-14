import { useRef, useEffect, useState, memo } from 'react';
import Hls from 'hls.js';
import { getVideo, initDb } from '../lib/indexdb';


const StreamCard = memo(function StreamCard({ hls_url, video_url, stream_url }) {
    
    const videoRef = useRef(null);
    const isMountedRef = useRef(true);
    const playTimeoutRef = useRef(null);
    const dbRef = useRef(null);
    const hlsRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    const url = stream_url || hls_url || video_url;

    const initDatabase = async () => {
        const db = await initDb();
        dbRef.current = db;
    }

    useEffect(() => {
        initDatabase();
    }, []);

    const debouncedPlay = () => {
        if (playTimeoutRef.current) {
            clearTimeout(playTimeoutRef.current);
        }
        playTimeoutRef.current = setTimeout(() => {
            safePlay();
        }, 100);
    };

    const safePlay = async (retryCount = 0) => {
        if (!videoRef.current || !isMountedRef.current) return;
        
        try {
            await videoRef.current.play();
            console.log('Video started playing successfully');
        } catch (error) {
            if (error.name === 'AbortError') {
                // If the element is still mounted, try a short, bounded retry to avoid black frames
                if (!isMountedRef.current) return;
                const element = videoRef.current;
                const ready = element && element.readyState >= 2; // HAVE_CURRENT_DATA
                const nextDelay = ready ? 100 : 250;
                if (retryCount < 3) {
                    setTimeout(() => safePlay(retryCount + 1), nextDelay);
                }
                return;
            } else if (error.name === 'NotAllowedError') {
                // Autoplay blocked; keep UI responsive but don't spam retries
                setIsLoading(false);
                return;
            } else {
                console.log('Video play error:', error);
                if (retryCount < 2 && isMountedRef.current) {
                    console.log(`Retrying video play (attempt ${retryCount + 1})`);
                    setTimeout(() => safePlay(retryCount + 1), 500);
                } else if (isMountedRef.current) {
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        }
    };

    const retryStream = () => {
        if (retryCount < maxRetries) {
            console.log(`Retrying stream (attempt ${retryCount + 1}/${maxRetries})`);
            setRetryCount(prev => prev + 1);
            setHasError(false);
            setIsLoading(true);
        }
    };

    useEffect(() => {
        console.log('StreamCard useEffect triggered for URL:', url);
        isMountedRef.current = true;

        let hls;

        if (!url) {
            console.log('No stream URL provided');
            if (isMountedRef.current) {
                setIsLoading(false);
                setHasError(true);
            }
            return;
        }

        // Reset states
        if (isMountedRef.current) {
            setIsLoading(true);
            setHasError(false);
        }

        // Check if it's a number in the indexdb
        const isNumber = !isNaN(url);

        const getVideoFromDB = async () => {
            try {

                if (!dbRef.current) {
                    console.log('Database not ready, initializing...');
                    const newDb = await initDb();
                    dbRef.current = newDb;
                }

                const video = await getVideo(dbRef.current, url);
                console.log('Video:', video);

                if (!video) {
                    console.error('Video not found in database');
                    if (isMountedRef.current) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                    return;
                }

                const videoUrl = URL.createObjectURL(video.video);
                console.log('Video URL:', videoUrl);

                if (videoRef.current && isMountedRef.current) {
                    videoRef.current.src = videoUrl;
                    debouncedPlay();
                    setIsLoading(false);
                    setHasError(false);
                }

            } catch (error) {
                console.error('Error getting video from database:', error);
                if (isMountedRef.current) {
                    setHasError(true);
                    setIsLoading(false);
                }
            }
        };

        try {
            if (isNumber) {
                getVideoFromDB();
            } else {
                if (Hls.isSupported()) {
                    hlsRef.current = new Hls({
                        manifestLoadingMaxRetry: 10,
                        manifestLoadingRetryDelay: 500,
                        fragLoadingMaxRetry: 6,
                        fragLoadingRetryDelay: 1000,
                        liveSyncDurationCount: 3,
                        liveMaxLatencyDurationCount: 5,
                        liveBackBufferLength: 10,
                        fragLoadingTimeOut: 20000,
                    });
                    
                    try {
                        hlsRef.current.loadSource(url);
                        hlsRef.current.attachMedia(videoRef.current);
                    } catch (error) {
                        console.error('Error loading stream:', error);
                        if (isMountedRef.current) {
                            setHasError(true);
                            setIsLoading(false);
                        }
                    }
    
                    hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (isMountedRef.current) {
                            setIsLoading(false);
                            debouncedPlay();
                        }
                    });
    
                    hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
                        console.log('HLS error:', event, data);

                        // Toggle loading state when stream is disrupted
                        if (isMountedRef.current) setIsLoading(true);

                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log('Fatal network error. Restarting load...');
                                    hlsRef.current.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('Fatal media error. Recovering...');
                                    hlsRef.current.recoverMediaError();
                                    break;
                                default:
                                    console.log('Unrecoverable error. Destroying HLS.');
                                    hlsRef.current.destroy();
                                    if (isMountedRef.current) {
                                        setHasError(true);
                                        setIsLoading(false);
                                    }
                                    return;
                            }
                        } else {
                            if (data.details === 'manifestLoadTimeOut' || data.details === 'fragLoadError') {
                                hlsRef.current.startLoad();
                            }
                        }

                        // After attempting recovery/reload, try to resume playback shortly
                        if (isMountedRef.current) {
                            setTimeout(() => {
                                debouncedPlay();
                            }, 300);
                        }
                    });
    
                } else if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                    videoRef.current.src = url;
                    debouncedPlay();
                } else {
                    console.log('HLS not supported and native HLS not available');
                    if (isMountedRef.current) {
                        setHasError(true);
                        setIsLoading(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading stream:', error);
            if (isMountedRef.current) {
                setHasError(true);
                setIsLoading(false);
            }
        }
        

        // Attach element-level listeners to keep loading state accurate and avoid black screens
        const el = videoRef.current;
        const handlePlaying = () => { if (isMountedRef.current) setIsLoading(false); };
        const handleCanPlay = () => { if (isMountedRef.current) debouncedPlay(); };
        const handleWaiting = () => { if (isMountedRef.current) setIsLoading(true); };
        if (el) {
            el.addEventListener('playing', handlePlaying);
            el.addEventListener('canplay', handleCanPlay);
            el.addEventListener('waiting', handleWaiting);
            el.addEventListener('stalled', handleWaiting);
        }

        return () => {
            isMountedRef.current = false;
            if (playTimeoutRef.current) {
                clearTimeout(playTimeoutRef.current);
            }
            if (el) {
                el.removeEventListener('playing', handlePlaying);
                el.removeEventListener('canplay', handleCanPlay);
                el.removeEventListener('waiting', handleWaiting);
                el.removeEventListener('stalled', handleWaiting);
            }
            if (videoRef.current) {
                // Stop playback and reset source to avoid pending play() being interrupted
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            }
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        }
    }, [url]);

    return (
        <div className="relative w-full h-full">
            <video 
                crossOrigin={"anonymous"}
                type="application/x-mpegURL"
                ref={videoRef} 
                muted  
                loop 
                playsInline 
                disablePictureInPicture 
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover"
                style={{ pointerEvents: 'none' }}
            />
            
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Loading stream...</p>
                    </div>
                </div>
            )}
            
            {/* Error overlay */}
            {hasError && (
                <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-red-400 mb-2">⚠️</div>
                        <p className="text-sm">Stream unavailable</p>
                        <p className="text-xs opacity-75 mb-3">Check connection</p>
                        {retryCount < maxRetries && (
                            <button 
                                onClick={retryStream}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs transition-colors"
                            >
                                Retry ({retryCount}/{maxRetries})
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default StreamCard;