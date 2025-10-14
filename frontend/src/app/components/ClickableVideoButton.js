"use client";

import React, { useState } from "react";

// A small, reusable button that is absolutely positioned over a video.
// Props:
// - x, y: coordinates in percent (0-100) where the button should be placed
// - title: optional title shown in the tooltip (bold)
// - tooltip: optional tooltip body text
// - onClick: callback when the button is activated
// - ariaId: optional id for accessibility
export default function ClickableVideoButton({ x = 50, y = 50, title, tooltip, onClick, ariaId, variant = 'green', category = null, link = null }) {
    const [visible, setVisible] = useState(false);
    const [pressed, setPressed] = useState(false);

    const posStyle = {
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        pointerEvents: 'auto',
    };

    const show = visible;

    // variant styles (legacy) and category-based color mapping
    const variants = {
        green: { bg: 'linear-gradient(135deg,#84cc16,#65a30d)', ring: 'rgba(132,204,22,0.18)' },
        black: { bg: 'linear-gradient(135deg,#111827,#374151)', ring: 'rgba(17,24,39,0.28)' },
        white: { bg: 'linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,250,250,0.98))', ring: 'rgba(0,0,0,0.06)' }
    };

    const categories = {
        improvement: { bg: 'linear-gradient(135deg,#a3e635,#4d7c0f)', ring: 'rgba(163,230,53,0.18)', badge: '#84cc16' },
        compliance: { bg: 'linear-gradient(135deg,#60a5fa,#3b82f6)', ring: 'rgba(96,165,250,0.15)', badge: '#3b82f6' },
        ppe: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', ring: 'rgba(245,158,11,0.14)', badge: '#f59e0b' }
    };

    // prefer category color when provided, otherwise fall back to variant
    const chosen = (category && categories[category]) ? categories[category] : (variants[variant] || variants.green);
    const centerColor = category === 'compliance' ? '#0f172a' : (category === 'ppe' ? '#512a0b' : '#064e3b');

    return (
        <div style={posStyle} className="flex items-center justify-center">
            <button
                type="button"
                aria-label={title || tooltip || 'Video action'}
                aria-describedby={ariaId}
                onClick={(e) => {
                    // if a url is provided, open it in a new tab
                    if (link) {
                        try {
                            window.open(link, '_blank', 'noopener');
                        } catch (err) {
                            // fallback to setting location
                            window.location.href = link;
                        }
                    }
                    if (typeof onClick === 'function') onClick(e);
                }}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => { setVisible(false); setPressed(false); }}
                onFocus={() => setVisible(true)}
                onBlur={() => { setVisible(false); setPressed(false); }}
                onMouseDown={() => setPressed(true)}
                onMouseUp={() => setPressed(false)}
                onTouchStart={() => { setVisible(true); setPressed(true); }}
                onTouchEnd={() => { setPressed(false); }}
                className={`group relative flex items-center justify-center rounded-full transition-transform duration-200 ease-out transform ${pressed ? 'scale-95' : 'hover:scale-110'} focus:outline-none`}
                style={{ pointerEvents: 'auto', padding: 0, width: 28, height: 28 }}
            >
                <span className="sr-only">{title || tooltip}</span>
                {/* concentric rings to form a target */}
                <span className="absolute rounded-full" style={{ width: 28, height: 28, boxShadow: '0 6px 18px rgba(0,0,0,0.18)', background: chosen.bg, border: '1px solid rgba(255,255,255,0.06)' }} />

                {/* subtle outer ring that pulses on hover */}
                <span className="absolute rounded-full transition-all duration-400 opacity-0 group-hover:opacity-70 group-hover:scale-105" style={{ width: 44, height: 44, background: chosen.ring }} aria-hidden="true" />

                {/* inner ring */}
                <span className="absolute rounded-full" style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.18)' }} aria-hidden="true" />

                {/* center dot */}
                <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ background: 'rgba(255,255,255,0.95)' }}>
                    <span style={{ width: 6, height: 6, background: centerColor, borderRadius: '50%' }} />
                </span>
            </button>

                {/* Tooltip - always mounted for smooth transitions, visibility controlled with opacity/translate */}
            {(tooltip || title) && (
                                <div
                                    id={ariaId}
                                    role="tooltip"
                                    className={`absolute top-1/2 left-full ml-3 transform -translate-y-1/2 transition-all duration-200 ${show ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-2 pointer-events-none'}`}
                                    style={{ whiteSpace: 'normal', zIndex: 30 }}
                                >
                                    <div
                                        className="relative max-w-md w-72 rounded-xl px-4 py-3 shadow-2xl overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(6,10,14,0.86), rgba(10,13,20,0.72))',
                                            backdropFilter: 'blur(8px) saturate(120%)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
                                            transformOrigin: 'left center'
                                        }}
                                    >
                                        {/* left accent bar */}
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: (categories[category] && categories[category].badge) || '#84cc16', boxShadow: `0 6px 18px ${(categories[category] && categories[category].ring) || 'rgba(132,204,22,0.12)'}` }} />

                                        <div className="relative pl-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {category && (
                                                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: (categories[category] && categories[category].badge) || '#84cc16' }} />
                                                    )}
                                                    {title && <div className="font-semibold text-sm tracking-tight text-white">{title}</div>}
                                                </div>
                                            </div>

                                            {tooltip && <div className="text-xs text-slate-200/90 mt-2 leading-snug">{tooltip}</div>}

                                            <div className="mt-3">
                                                {link && (
                                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300/70 hover:text-slate-100 transition-colors">
                                                        Click to learn more →
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* subtle animated glow */}
                                        <div style={{ position: 'absolute', right: -40, top: -20, width: 120, height: 120, background: (categories[category] && categories[category].badge) || '#84cc16', filter: 'blur(30px)', opacity: 0.12, pointerEvents: 'none' }} />
                                    </div>

                    {/* caret on the left middle */}
                    <div className={`absolute left-[-6px] top-1/2 transform -translate-y-1/2 w-3 h-3 rotate-45 bg-white/95 border border-gray-100 drop-shadow-sm`} style={{ zIndex: 29 }} />
                </div>
            )}
        </div>
    );
}
