import React, { useEffect, useRef, useState } from "react";

export default function ClipChat({ videoId }) {
    const [chatHistory, setChatHistory] = useState(() => [
        { role: 'assistant', text: 'Hello! I am Jade, your AI safety and compliance assistant. How can I help you today?', date: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recognitionAvailable, setRecognitionAvailable] = useState(false);
    const messagesRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setRecognitionAvailable(true);
            const r = new SpeechRecognition();
            r.lang = 'en-US';
            r.interimResults = false;
            r.maxAlternatives = 1;
            recognitionRef.current = r;
        }
    }, []);

    useEffect(() => {
        // scroll to bottom when chatHistory changes
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);

    function formatDate(ts) {
        const d = new Date(ts);
        return d.toLocaleString();
    }

    async function handleSendText(message) {
        if (!message || message.trim() === '') return;
        const userMsg = { role: 'user', text: message.trim(), date: Date.now() };
        setChatHistory(prev => [...prev, userMsg]);
        setInput('');
        await callAssistant(message.trim());
    }

    function getGeolocation() {
        if (navigator.geolocation) {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position),
                    (error) => reject(error),
                    { timeout: 10000, enableHighAccuracy: false }
                );
            });
        }
        return Promise.resolve(null);
    }

    async function callAssistant(message) {
        setIsLoading(true);

        // add temporary typing indicator
        const typingId = Date.now();
        setChatHistory(prev => [...prev, { role: 'assistant', text: '', date: Date.now(), typing: true, _id: typingId }]);

        let geolocation = null;
        try {
            geolocation = await getGeolocation();
            console.log('Geolocation:', geolocation);
        } catch (error) {
            console.warn('Geolocation error:', error);
            // Continue without geolocation data
        }

        try {
            const prompt = `You are Jade, an expert safety and compliance officer. 
        
            Here is the chat history: ${chatHistory.map(m => `${m.role}: ${m.text}`).join('\n')};

            The user asks: ${message};
            
            The user's geolocation is: ${geolocation.coords.latitude}, ${geolocation.coords.longitude};

            If the user asks about safety, compliance, or improvements, you should always reference the user's geolocation and the laws in that area when providing your response.
            Do not mention the coordinates, just the location and city.
            
            Be highly detailed and specific, by referencing specific machines, processes, and equipment you see in the video and the second.

            `;

            const resp = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, userQuery: prompt })
            });

            if (!resp.ok) throw new Error('API request failed');

            const data = await resp.json();

            // flexible parsing
            let assistantText = '';
            if (typeof data === 'string') assistantText = data;
            else if (data.response) assistantText = data.response;
            else if (data.data) {
                // sometimes analysis returns nested JSON in data.data
                try {
                    const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                    assistantText = parsed.response || parsed.reply || JSON.stringify(parsed);
                } catch (e) {
                    assistantText = String(data.data);
                }
            } else if (data.message) assistantText = data.message;
            else assistantText = JSON.stringify(data);

            // replace typing indicator
            setChatHistory(prev => {
                const withoutTyping = prev.filter(m => !(m.typing && m._id === typingId));
                return [...withoutTyping, { role: 'assistant', text: assistantText, date: Date.now() }];
            });

            setIsLoading(false);
            return assistantText;
        } catch (error) {
            console.error('Assistant call failed', error);
            setChatHistory(prev => prev.map(m => (m.typing ? { role: 'assistant', text: "I'm sorry — I couldn't process that right now.", date: Date.now() } : m)));
            setIsLoading(false);
            return null;
        }
    }

    function startRecording() {
        const r = recognitionRef.current;
        if (!r) return;
        r.onstart = () => setIsRecording(true);
        r.onend = () => setIsRecording(false);
        r.onerror = (e) => {
            console.warn('Speech recognition error', e);
            setIsRecording(false);
        };
        r.onresult = (ev) => {
            const transcript = ev.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        };
        try {
            r.start();
        } catch (e) {
            console.warn('Speech recognition start failed', e);
        }
    }

    function stopRecording() {
        const r = recognitionRef.current;
        if (!r) return;
        try { r.stop(); } catch (e) { /* ignore */ }
        setIsRecording(false);
    }

    return (
        // Constrain height so chat doesn't expand the page; messages area inside is scrollable
        <div className="flex flex-col rounded-lg transform transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl" style={{ height: '56vh', overflow: 'hidden', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(8px) saturate(120%)', border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 8px 30px rgba(2,6,23,0.06)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                <div className="flex items-center gap-3">
                    {/* robot SVG icon in a glassy badge */}
                    <div className="flex items-center justify-center rounded-md" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 6px 18px rgba(2,6,23,0.06)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <rect x="3" y="4" width="18" height="14" rx="3" stroke="#064e3b" strokeWidth="1.5" fill="white" />
                            <circle cx="8.5" cy="10" r="1.2" fill="#064e3b" />
                            <circle cx="15.5" cy="10" r="1.2" fill="#064e3b" />
                            <rect x="9" y="13" width="6" height="1.2" rx="0.6" fill="#94d3a2" />
                            <rect x="11" y="2.5" width="2" height="2" rx="1" fill="#94d3a2" />
                        </svg>
                    </div>

                    <div>
                        <div className="text-sm font-semibold text-slate-800">Jade — Safety Assistant</div>
                        <div className="text-xs text-slate-500">Ask about this clip or request recommendations</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Connected badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'rgba(6,78,59,0.06)', border: '1px solid rgba(6,78,59,0.08)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 8, background: '#84cc16', boxShadow: '0 4px 10px rgba(132,204,22,0.14)' }} />
                        <div style={{ fontSize: 12, color: '#14532d', fontWeight: 600 }}>Connected</div>
                    </div>

                    {/* TwelveLabs badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 6px 18px rgba(2,6,23,0.04)' }}>
                        <img src="/twelvelabs.png" alt="TwelveLabs" style={{ width: 46, height: 'auto' }} />
                        <a href="https://www.twelvelabs.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#064e3b', fontWeight: 600, textDecoration: 'none' }}>Powered by TwelveLabs Pegasus</a>
                    </div>
                </div>
            </div>

            <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((m, i) => (
                    <div key={i} className={`w-full flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`inline-flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`rounded-lg px-4 py-2 ${m.role === 'user' ? 'bg-white text-slate-800 border border-slate-100 text-left' : 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-900 text-left'} shadow-sm`} style={{ animation: 'fadeIn .18s ease', maxWidth: '92%' }}>
                                <div className="text-xs opacity-80">{m.role === 'user' ? 'You' : 'Assistant'}</div>
                                <div className="mt-1 text-sm leading-snug whitespace-pre-wrap">{m.text || (m.typing ? <TypingDots /> : '')}</div>
                                <div className="mt-1 text-[10px] opacity-60 text-right">{formatDate(m.date)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 py-3 border-t bg-white flex items-center gap-3" style={{ borderTop: '1px solid rgba(15,23,42,0.04)' }}>
                <div className="flex-1">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(input); } }}
                        placeholder="Ask Jade about safety, compliance, or improvements..."
                        className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none"
                        style={{ border: '1px solid rgba(15,23,42,0.04)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)', transition: 'box-shadow 120ms ease', outline: 'none' }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { if (recognitionAvailable) { if (isRecording) stopRecording(); else startRecording(); } }}
                        className={`cursor-pointer p-2 rounded-full transform transition-transform duration-150 ${isRecording ? 'scale-95' : 'hover:scale-105'}`}
                        style={isRecording ? { background: '#84cc16', color: '#08300b', boxShadow: '0 6px 18px rgba(132,204,22,0.12)' } : { background: 'white', color: '#064e3b', border: '1px solid rgba(6,78,59,0.06)' }}
                        title={recognitionAvailable ? (isRecording ? 'Stop recording' : 'Start voice input') : 'Voice not available'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v6a2 2 0 104 0V4a2 2 0 00-2-2zM5 8a5 5 0 0010 0h-1a4 4 0 11-8 0H5z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSendText(input)}
                        className="px-4 py-2 rounded-full text-white text-sm shadow transform transition-transform duration-150 hover:scale-105 active:scale-95"
                        style={{ background: '#84cc16', border: '1px solid rgba(6,78,59,0.08)' }}
                    >Send</button>
                </div>
            </div>
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.12s' }} />
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.24s' }} />
        </div>
    );
}