// frontend/src/components/AIModelCard.jsx
// [اصلاح شد] این فایل برای استفاده از اندپوینت پایدار /run/predict به‌روزرسانی شد.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
// این کامپوننت دیگر نیازی به supabaseClient.js ندارد

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
// [اصلاح شد] آدرس API مستقیم به اندپوینت نام‌گذاری شده
const API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space/run/predict`;

// [NOTE] این توکن باید در متغیرهای محیطی Vercel تنظیم شود (VITE_HF_API_TOKEN)
// [اصلاح شد] افزودن یک مقدار پیش‌فرض خالی برای جلوگیری از خطای import.meta در محیط‌های خاص
const HF_API_TOKEN = (import.meta.env && import.meta.env.VITE_HF_API_TOKEN) || "";

if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! (Using public mode)");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded.");
}

// --- [حذف شد] منطق قدیمی /queue/join ---
// generateSessionHash() حذف شد.

// --- Typewriter Hook (بدون تغییر) ---
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = useState('');
    const [internalText, setInternalText] = useState(text);
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef(null);

    const startTypingProcess = useCallback((newText) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setInternalText(newText || '');
        setDisplayText('');
        setCurrentIndex(0);
        setIsTyping(!!newText);
    }, []);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (isTyping && internalText && currentIndex < internalText.length) {
            intervalRef.current = setInterval(() => {
                 if (currentIndex < internalText.length) {
                    const nextIndex = currentIndex + 1;
                    setDisplayText(internalText.substring(0, nextIndex));
                    setCurrentIndex(nextIndex);
                 } else {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setIsTyping(false);
                 }
            }, speed);
        } else if (currentIndex >= (internalText?.length || 0)) {
            if(isTyping) setIsTyping(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isTyping, speed, internalText, currentIndex]);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    return [displayText, startTypingProcess, isTyping];
};
// --- [END] Typewriter Hook ---


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);
  
  // [حذف شد] eventSourceRef.current حذف شد چون دیگر از EventSource استفاده نمی‌کنیم

  // منطق شبیه‌سازی برای مدل‌های غیر از ExBERT (بدون تغییر)
  const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI_REPORT]:\nAnalysis for "${query.substring(0,15)}..." shows high attention on token [X].\nPredicted Label: 1\nConfidence: 0.85`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
  };

  // [حذف شد] useEffect مربوط به eventSourceRef.current.close() حذف شد.

  // [اصلاح شد] تابع handleModelQuery برای استفاده از /run/predict
  const handleModelQuery = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    startTypingProcess('');

    // شبیه‌سازی برای مدل‌های دیگر (بدون تغییر)
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }
    
    // --- [START] پیاده‌سازی API پایدار (Named Endpoint) ---
    try {
        console.log(`Step 1: Calling Gradio API at ${API_URL}...`);
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // اگر توکن HF دارید، آن را اضافه کنید (برای Spaces خصوصی)
        if (HF_API_TOKEN) {
            headers['Authorization'] = `Bearer ${HF_API_TOKEN}`;
        }
        
        // Payload بسیار ساده‌تر شده است
        const payload = {
            "data": [query] // ورودی مدل شما فقط یک رشته است
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers, 
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errorText = await response.text();
             console.error("API Call Error:", response.status, errorText);
             let detailedError = `Failed to call API: ${response.status}.`;
             if (response.status === 401) {
                 detailedError = "API ERROR: 401 Unauthorized. Check Space permissions/token.";
             } else if (response.status === 503) {
                 detailedError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/loading. Wait 30s and retry.";
             } else if (response.status === 404) {
                 detailedError = "API ERROR: 404 Not Found. Check if api_name='predict' is set in app.py.";
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const result = await response.json();
        console.log("API Result:", result);

        // استخراج خروجی
        if (result.data && result.data.length > 0) {
            const rawPrediction = result.data[0];
            // فرمت‌بندی خروجی بر اساس app.py
            const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;
            setOutput(formattedOutput);
            startTypingProcess(formattedOutput);
        } else if (result.error) {
            throw new Error(`API returned an error: ${result.error}`);
        } else {
            throw new Error("Invalid response structure from API.");
        }

    } catch (err) {
        let displayError = err.message || "An unknown error occurred.";
        if (err.message.includes("Failed to fetch")) {
            displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
        }
       setError(displayError);
       setOutput('');
       startTypingProcess('');
    } finally {
        setLoading(false);
    }
    // --- [END] پیاده‌سازی ---
  };

  // --- Render logic (بدون تغییر) ---
  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>

      <form onSubmit={handleModelQuery}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          disabled={loading} 
        />
        <button 
            type="submit" 
            className="cyber-button w-full mt-3 flex items-center justify-center" 
            disabled={loading || !input.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              ANALYZING...
            </>
          ) : (
            'EXECUTE_QUERY_'
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-cyber-red p-2 bg-red-900/30 rounded border border-red-500/50">
          {error}
        </p>
      )}

      <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto whitespace-pre-wrap">
         {typedOutput}
         {isTyping ? <span className="typing-cursor"></span> : null}
         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

export default AIModelCard;

