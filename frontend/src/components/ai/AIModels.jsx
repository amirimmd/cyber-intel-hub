import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Terminal, AlertTriangle, Cpu } from 'lucide-react';

// --- کامپوننت نمایش وزن‌های SHAP ---
const ShapVisualization = ({ shapData }) => {
    if (!shapData || shapData.length === 0) return null;

    let maxAbsVal = 0;
    shapData.forEach((item) => {
        // هندل کردن ساختارهای مختلف داده [token, weight] یا {token, weight}
        const val = Array.isArray(item) ? item[1] : item.weight;
        if (Math.abs(val) > maxAbsVal) maxAbsVal = Math.abs(val);
    });
    if (maxAbsVal === 0) maxAbsVal = 1;

    const getColor = (item) => {
        const val = Array.isArray(item) ? item[1] : item.weight;
        const alpha = Math.min(Math.abs(val) / maxAbsVal, 1.0) * 0.7;
        if (val > 0) return `rgba(239, 68, 68, ${alpha})`; // قرمز (ریسک)
        if (val < 0) return `rgba(59, 130, 246, ${alpha})`; // آبی (امن)
        return 'rgba(255, 255, 255, 0)';
    };

    return (
        <div className="mt-3 p-3 bg-slate-950/50 rounded-lg border border-slate-700 font-mono text-xs">
            <p className="font-bold text-slate-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                تحلیل SHAP (اهمیت کلمات):
            </p>
            <div className="flex flex-wrap gap-1 leading-relaxed" dir="ltr">
                {shapData.map((item, index) => {
                    const token = Array.isArray(item) ? item[0] : item.token;
                    const val = Array.isArray(item) ? item[1] : item.weight;
                    return (
                        <span 
                            key={index} 
                            title={`Impact: ${val?.toFixed(4)}`}
                            className="px-1 py-0.5 rounded cursor-help transition-colors hover:ring-1 ring-white/30 text-slate-200"
                            style={{ backgroundColor: getColor(item) }}
                        >
                            {token}
                        </span>
                    );
                })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500" dir="ltr">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> کاهش ریسک</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> افزایش ریسک</span>
            </div>
        </div>
    );
};

// --- تنظیمات API ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;
const QUEUE_JOIN_URL = `${BASE_API_URL}/gradio_api/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}/gradio_api/queue/data?session_hash=${sessionHash}`;

// تولید هش تصادفی برای نشست
const generateSessionHash = () => {
    return Math.random().toString(36).substring(2, 13);
};

const AIModels = () => {
    const [activeModel, setActiveModel] = useState('xai'); // 'exbert' یا 'xai'
    const [messages, setMessages] = useState([
        { 
            id: 'welcome', 
            sender: 'ai', 
            text: ':: سیستم آنلاین است ::\nهسته عصبی ExBERT-XAI آماده است. مدل مورد نظر را انتخاب کرده و توضیحات آسیب‌پذیری را وارد کنید.', 
            shapData: null 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    
    const messagesEndRef = useRef(null);
    const eventSourceRef = useRef(null);
    
    // اسکرول خودکار به پایین
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, statusText]);

    // بستن اتصال هنگام خروج از کامپوننت
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setInput('');
        setLoading(true);
        setStatusText('در حال برقراری ارتباط...');

        // افزودن پیام کاربر
        const userMsg = { id: Date.now(), sender: 'user', text: query };
        setMessages(prev => [...prev, userMsg]);

        // بستن اتصال قبلی اگر وجود دارد
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        try {
            const sessionHash = generateSessionHash();
            
            // 1. پیوستن به صف (Join Queue)
            const joinHeaders = { 'Content-Type': 'application/json' };
            const payload = {
                "data": [query],
                "fn_index": 2, // ایندکس تابع در Gradio
                "session_hash": sessionHash
            };

            const joinResponse = await fetch(QUEUE_JOIN_URL, {
                method: 'POST',
                headers: joinHeaders,
                body: JSON.stringify(payload)
            });

            if (!joinResponse.ok) {
                throw new Error(`خطا در اتصال به صف: ${joinResponse.status}`);
            }

            // 2. گوش دادن به استریم رویدادها
            const dataUrl = QUEUE_DATA_URL(sessionHash);
            eventSourceRef.current = new EventSource(dataUrl);

            eventSourceRef.current.onmessage = (event) => {
                const message = JSON.parse(event.data);

                switch (message.msg) {
                    case "process_starts":
                        setStatusText("در حال پردازش شبکه عصبی...");
                        break;
                    
                    case "process_completed":
                        if (message.success && message.output && message.output.data) {
                            const rawData = message.output.data[0];
                            
                            let aiText = "";
                            let shapData = null;
                            
                            try {
                                const resultData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

                                if (activeModel === 'xai') {
                                    if (resultData.xai_model) {
                                        const res = resultData.xai_model;
                                        aiText = `[PHASE 3 - XAI OPTIMIZED]\n\nPrediction: ${res.label}\nConfidence: ${(res.score * 100).toFixed(2)}%\nRisk Level: ${res.score > 0.5 ? 'CRITICAL' : 'SAFE'}`;
                                        shapData = resultData.explanation;
                                    } else {
                                        aiText = `تحلیل کامل شد: ${JSON.stringify(resultData)}`;
                                    }
                                } else {
                                    if (resultData.baseline) {
                                        const res = resultData.baseline;
                                        aiText = `[PHASE 2 - BASELINE]\n\nPrediction: ${res.label}\nConfidence: ${(res.score * 100).toFixed(2)}%`;
                                        shapData = null;
                                    } else {
                                        aiText = `تحلیل کامل شد: ${JSON.stringify(resultData)}`;
                                    }
                                }
                            } catch (e) {
                                aiText = rawData.toString();
                            }

                            const aiMsg = { 
                                id: Date.now() + 1, 
                                sender: 'ai', 
                                text: aiText, 
                                shapData: shapData 
                            };
                            setMessages(prev => [...prev, aiMsg]);
                        } else {
                            const errorMsg = {
                                id: Date.now() + 1,
                                sender: 'ai',
                                text: `:: خطای پردازش ::\nسرور داده معتبری برنگرداند.`,
                                isError: true
                            };
                            setMessages(prev => [...prev, errorMsg]);
                        }
                        
                        eventSourceRef.current.close();
                        setLoading(false);
                        setStatusText('');
                        break;

                    case "queue_full":
                        setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: "خطا: صف سرور پر است.", isError: true }]);
                        eventSourceRef.current.close();
                        setLoading(false);
                        break;
                        
                    case "estimation":
                        setStatusText(`در صف... زمان تقریبی: ${message.rank_eta?.toFixed(1)} ثانیه`);
                        break;
                }
            };

            eventSourceRef.current.onerror = (err) => {
                console.error("EventSource Error:", err);
                if (loading) {
                    setMessages(prev => [...prev, { 
                        id: Date.now(), 
                        sender: 'ai', 
                        text: "ارتباط با سرور قطع شد.", 
                        isError: true 
                    }]);
                    setLoading(false);
                    setStatusText('');
                }
                if (eventSourceRef.current) eventSourceRef.current.close();
            };

        } catch (error) {
            console.error("Connection Error:", error);
            setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: 'ai', 
                text: `:: خطای اتصال ::\n${error.message}`, 
                isError: true 
            }]);
            setLoading(false);
            setStatusText('');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            
            {/* هدر و انتخابگر مدل */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">VulnSight Command Line</h3>
                        <p className="text-slate-500 text-xs">ExBERT-XAI Inference Engine</p>
                    </div>
                </div>

                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setActiveModel('exbert')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeModel === 'exbert' 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Baseline (Phase 2)
                    </button>
                    <button
                        onClick={() => setActiveModel('xai')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                            activeModel === 'xai' 
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Sparkles className="w-3 h-3" />
                        XAI Optimized (Phase 3)
                    </button>
                </div>
            </div>

            {/* ناحیه چت - اسکرول فیکس شده */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-slate-900/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* آواتار */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border mt-1 ${
                                msg.sender === 'user' 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : msg.isError ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-slate-800 border-slate-700 text-emerald-400'
                            }`}>
                                {msg.sender === 'user' ? <User size={16} /> : msg.isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
                            </div>

                            {/* حباب پیام */}
                            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                                    msg.sender === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-900/20' 
                                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                                }`}>
                                    {msg.text}
                                </div>
                                {/* نمایش SHAP (فقط برای پیام‌های هوش مصنوعی) */}
                                {msg.sender === 'ai' && msg.shapData && (
                                    <ShapVisualization shapData={msg.shapData} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* نشانگر لودینگ */}
                {loading && (
                    <div className="flex justify-start w-full animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            </div>
                            <span className="text-xs text-slate-500">{statusText || "در حال پردازش..."}</span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* ناحیه ورودی */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                <div className="relative flex items-end gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                    <div className="p-2 text-slate-500">
                        <Cpu className="w-5 h-5" />
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="توضیحات آسیب‌پذیری (CVE) را وارد کنید..."
                        className="w-full bg-transparent text-slate-200 text-sm p-2 max-h-32 min-h-[44px] resize-none focus:outline-none placeholder:text-slate-600 text-left dir-ltr"
                        rows={1}
                        style={{ height: 'auto' }}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className={`p-2 rounded-lg mb-0.5 transition-all ${
                            !input.trim() || loading
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95'
                        }`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
                <div className="text-center mt-2 flex justify-between px-2">
                    <p className="text-[10px] text-slate-600">
                        مدل فعال: {activeModel === 'xai' ? 'ExBERT-XAI (Shapley Values)' : 'ExBERT Baseline'}
                    </p>
                    <p className="text-[10px] text-slate-600">
                        وضعیت: {loading ? 'مشغول' : 'آماده'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIModels;
