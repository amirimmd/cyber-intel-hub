import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, AlertTriangle, ShieldCheck, Activity, Terminal, Send, Loader2 } from 'lucide-react';

// ==========================================
// کامپوننت مصورسازی SHAP (با محافظت ضدکِرَش)
// ==========================================
const ShapVisualization = ({ shapData }) => {
  // محافظت در برابر داده‌های نامعتبر
  if (!shapData || !Array.isArray(shapData) || shapData.length === 0) return null;

  // فیلتر کردن داده‌های صحیح برای جلوگیری از خطای رندر
  const validData = shapData.filter(item => Array.isArray(item) && item.length >= 2);
  if (validData.length === 0) return null;

  const maxAbsVal = Math.max(...validData.map(item => Math.abs(item[1])));

  const getColor = (value) => {
    if (!maxAbsVal || maxAbsVal === 0) return 'rgba(255, 255, 255, 0.05)';
    const alpha = Math.min(Math.abs(value) / maxAbsVal, 1.0) * 0.85; 
    
    if (value > 0) {
      return `rgba(239, 68, 68, ${alpha})`; // Threat (قرمز)
    } else if (value < 0) {
      return `rgba(34, 197, 94, ${alpha})`; // Mitigation (سبز)
    }
    return 'rgba(255, 255, 255, 0.05)';
  };

  return (
    <div className="mt-5 p-4 bg-[#0a0a0a] rounded-xl border border-cyan-500/20 shadow-inner animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4 border-b border-[#222] pb-3">
        <Activity size={18} className="text-cyan-500" />
        <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
          SHAP XAI Analysis
        </h4>
      </div>
      
      <div className="flex flex-wrap leading-loose" style={{ gap: '6px' }}>
        {validData.map(([token, value], index) => (
          <span 
            key={index} 
            title={`تأثیر حاشیه‌ای: ${Number(value).toFixed(4)}`}
            className="px-2 py-1 rounded text-sm font-mono transition-colors hover:brightness-125 cursor-help text-gray-200 border border-white/5"
            style={{ backgroundColor: getColor(value) }}
          >
            {token}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] mt-6 text-gray-500 pt-3 border-t border-[#111]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block rounded-sm bg-green-500/60"></span> 
          کاهش احتمال (Mitigation)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block rounded-sm bg-red-500/60"></span> 
          افزایش خطر (Threat Indicator)
        </span>
      </div>
    </div>
  );
};

// --- API Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- Typewriter Hook (کاملاً بهینه‌سازی شده جهت جلوگیری از کِرَش) ---
const useTypewriter = (speed = 25) => {
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const fullTextRef = useRef('');
    const indexRef = useRef(0);

    const startTypingProcess = useCallback((newText) => {
        fullTextRef.current = newText || '';
        setDisplayText('');
        indexRef.current = 0;
        setIsTyping(!!newText);
    }, []);

    useEffect(() => {
        let interval;
        if (isTyping && fullTextRef.current) {
            // ایجاد فقط یک اینتروال پایدار به جای صدها اینتروال متوالی
            interval = setInterval(() => {
                if (indexRef.current < fullTextRef.current.length) {
                    indexRef.current += 1;
                    setDisplayText(fullTextRef.current.substring(0, indexRef.current));
                } else {
                    clearInterval(interval);
                    setIsTyping(false);
                }
            }, speed);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isTyping, speed]);

    return [displayText, startTypingProcess, isTyping];
};

// ==========================================
// کامپوننت اصلی کارت ارزیاب هوش مصنوعی
// ==========================================
export const AIModelCard = ({ model }) => {
  const [inputText, setInputText] = useState('');
  const [output, setOutput] = useState('');
  const [shapData, setShapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(20);
  const eventSourceRef = useRef(null);
  
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault(); // جلوگیری از رفرش ناخواسته صفحه

    if (!inputText.trim()) {
      setError('لطفاً توصیف یک آسیب‌پذیری را وارد کنید.');
      return;
    }

    // 🟢 این تنها مکانی است که استیت‌ها در آن ریست می‌شوند (فقط با درخواست صریح کاربر)
    setLoading(true);
    setError(null);
    setOutput('');
    setShapData(null);
    startTypingProcess('');
    hasCompletedRef.current = false;
    
    if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }

    const sessionHash = generateSessionHash();
    
    try {
        const joinHeaders = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        };
        
        const payload = {
            "data": [
              inputText, 
              model.id || "Baseline"
            ],
            "event_data": null,
            "fn_index": 2, 
            "trigger_id": 12,
            "session_hash": sessionHash
        };

        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: joinHeaders, 
            body: JSON.stringify(payload)
        });

        if (!joinResponse.ok) {
             throw new Error(`Failed to join queue: ${joinResponse.status}`);
        }

        const joinResult = await joinResponse.json();
        
        if (!joinResult.event_id && !joinResult.error) {
             throw new Error("Failed to get event_id from queue join.");
        }

        // --- Listening for data (EventSource) ---
        const dataUrl = QUEUE_DATA_URL(sessionHash);
        eventSourceRef.current = new EventSource(dataUrl); 

        eventSourceRef.current.onmessage = (event) => {
            // 🛡️ گارد محافظتی آهنین: اگر قبلا نتیجه را گرفته‌ایم، تمام پیام‌های بعدی مرورگر (مثل ریکانکت شدن خودکار) مسدود می‌شوند
            if (hasCompletedRef.current) {
                if(eventSourceRef.current) eventSourceRef.current.close();
                return;
            }

            try {
                const message = JSON.parse(event.data);

                switch (message.msg) {
                    case "process_starts":
                        setOutput("Processing started...");
                        startTypingProcess("Processing started...");
                        break;
                    case "process_generating": break;
                    case "process_completed":
                        hasCompletedRef.current = true; // قفل کردن استیت
                        
                        if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                            const rawPrediction = message.output.data[0];
                            const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;
                            
                            if (message.output.data[1]) {
                                setShapData(message.output.data[1]);
                            }

                            setOutput(formattedOutput);
                            startTypingProcess(formattedOutput);
                        } else {
                             const errorMsg = message.output?.error || "Unknown server processing error.";
                             setError(`Processing failed: ${errorMsg}`);
                             // 🔴 عدم پاک کردن خروجی در هنگام خطا
                        }
                        
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false);
                        break;
                     case "queue_full":
                         if (!hasCompletedRef.current) {
                           setError("خطای API: صف درخواست‌ها پر است. لطفاً کمی بعد تلاش کنید.");
                           setLoading(false);
                         }
                         if(eventSourceRef.current) eventSourceRef.current.close();
                         eventSourceRef.current = null;
                         break;
                     case "estimation":
                         const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                         const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                         const waitMsg = `در صف انتظار (${queuePosition}). زمان تقریبی: ${eta} ثانیه...`;
                         if (loading && !hasCompletedRef.current) {
                             setOutput(waitMsg);
                             startTypingProcess(waitMsg);
                         }
                         break;
                    case "close_stream":
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        if (loading && !hasCompletedRef.current) { 
                            setLoading(false);
                            if (!output && !error) {
                                setError("ارتباط قطع شد (Stream Closed).");
                            }
                        }
                        break;
                    default:
                        break;
                }
            } catch (parseError) {
                 console.warn("Could not parse SSE message:", event.data);
            }
        };

        eventSourceRef.current.onerror = (errEvent) => {
            // 🛡️ اگر نتیجه را گرفته‌ایم، خطای اتصال مجدد مرورگر را نادیده می‌گیریم
            if (!hasCompletedRef.current) {
              let errorMsg = "ارتباط با سرور با مشکل مواجه شد.";
               if (!navigator.onLine) errorMsg += " لطفاً اینترنت خود را بررسی کنید.";
              setError(errorMsg);
              // 🔴 دستورات پاک کردن خروجی (setOutput) از اینجا کاملاً حذف شدند تا چیزی ناپدید نشود!
            }
            if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
        };

    } catch (err) {
        let displayError = err.message || "یک خطای ناشناخته رخ داد.";
        setError(displayError);
        setLoading(false);
        // 🔴 دستورات پاک کردن خروجی (setOutput) از اینجا کاملاً حذف شدند
        if (eventSourceRef.current) {
           eventSourceRef.current.close();
           eventSourceRef.current = null;
        }
    }
  };

  return (
    <div className="bg-[#111] rounded-2xl border border-[#222] shadow-2xl font-vazir flex flex-col h-full max-h-full">
      {/* هدر کارت */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] p-5 border-b border-[#222] flex justify-between items-center shrink-0">
        <div>
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Brain className="text-cyan-500" size={24} />
            {model.title || "ExBERT Classifier"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{model.description || "ارزیابی متون آسیب‌پذیری با هوش مصنوعی"}</p>
        </div>
        {model.badge && (
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono rounded-full">
            {model.badge}
          </span>
        )}
      </div>

      {/* بدنه کارت - افزودن overflow-y-auto برای جلوگیری از قطع شدن محتوا */}
      <div className="p-5 flex-grow flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        
        {/* فیلد ورود اطلاعات */}
        <div className="relative mb-5 shrink-0">
          <Terminal size={18} className="absolute right-3 top-3 text-gray-600" />
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="توصیف متنی آسیب‌پذیری (CVE Description) را به زبان انگلیسی وارد کنید..."
            className="w-full h-32 bg-[#0a0a0a] border border-[#333] text-gray-200 text-sm font-mono rounded-xl p-3 pr-10 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-all placeholder:text-gray-700 placeholder:font-vazir"
            disabled={loading}
          />
        </div>

        {/* دکمه ارسال */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || isTyping || !inputText.trim()}
          className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              در حال تحلیل عمیق شبکه...
            </>
          ) : isTyping ? (
            <>
              <Terminal size={18} className="animate-pulse" />
              در حال نگارش گزارش...
            </>
          ) : (
            <>
              <Send size={18} />
              شروع ارزیابی هوشمند
            </>
          )}
        </button>

        {/* نمایش پیام خطا */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 mb-4 animate-fade-in-up shrink-0">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* نمایش خروجی تایپ‌رایتر و نتیجه */}
        <div className="mt-2 bg-[#0a0a0a] rounded-lg p-4 text-cyan-500 text-sm min-h-[100px] border border-cyan-500/30 overflow-x-auto whitespace-pre-wrap font-mono relative shrink-0">
          {/* آیکون وضعیت */}
          {hasCompletedRef.current && output.includes('Predicted Label: 1') && (
            <AlertTriangle size={20} className="absolute top-4 right-4 text-red-500 animate-pulse" />
          )}
          {hasCompletedRef.current && output.includes('Predicted Label: 0') && (
            <ShieldCheck size={20} className="absolute top-4 right-4 text-green-500" />
          )}
          
          {/* متن تایپ شونده */}
          {typedOutput}
          {isTyping ? <span className="inline-block w-2 h-4 bg-cyan-500 ml-1 animate-pulse"></span> : null}
          {!loading && !error && !output && !typedOutput && (
              <span className="text-gray-600">MODEL.RESPONSE.STANDBY...</span>
          )}
        </div>

        {/* نمایش نمودار SHAP پس از اتمام تایپ و در صورت وجود داده */}
        {!isTyping && hasCompletedRef.current && shapData && (
          <ShapVisualization shapData={shapData} />
        )}
      </div>
    </div>
  );
};
