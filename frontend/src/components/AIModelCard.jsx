// frontend/src/components/AIModelCard.jsx
// [اصلاح شد] بازگشت به منطق API قدیمی (/queue/join) برای مطابقت با اسکریپت پایتون کاربر

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
// [اصلاح شد] ایمپورت supabaseClient (با فرض اینکه App.jsx آن را import می‌کند)
// اگر این فایل به صورت جداگانه استفاده می‌شود، باید مسیردهی صحیح باشد
import { supabase } from '../supabaseClient.js'; 

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

// [بازگشت به API قدیمی] استفاده از /queue/join
const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! (Using public mode)");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded (though likely not needed for public space).");
}

// [بازگشت به API قدیمی] تابع تولید هش
const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Typewriter Hook (بدون تغییر)
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


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);
  const eventSourceRef = useRef(null); // [بازگشت به API قدیمی]

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

  useEffect(() => {
    // [بازگشت به API قدیمی]
    return () => {
      if (eventSourceRef.current) {
        console.log("Closing existing EventSource connection.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleModelQuery = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    startTypingProcess('');
    
    // [بازگشت به API قدیمی]
    if (eventSourceRef.current) {
        console.log("Closing previous EventSource before new request.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }

    // شبیه‌سازی (بدون تغییر)
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }
    
    // --- [START] پیاده‌سازی منطق /queue/join (مطابق اسکریپت پایتون شما) ---
    const sessionHash = generateSessionHash(); // 1. تولید هش
    
    try {
        console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
        
        // 2. ساخت هدرها (بدون نیاز به توکن Auth برای Space عمومی)
        const joinHeaders = {
            'Content-Type': 'application/json',
            // [اصلاح شد] اضافه کردن هدرهای Cache-busting برای موبایل
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        };
        
        // 3. ساخت Payload (دقیقاً مطابق اسکریپت پایتون شما)
        const payload = {
            "data": [query],
            "event_data": null,
            "fn_index": 2,       // <-- مطابق اسکریپت پایتون شما
            "trigger_id": 12,    // <-- مطابق اسکریپت پایتون شما
            "session_hash": sessionHash
        };

        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: joinHeaders, 
            body: JSON.stringify(payload) // 4. ارسال Payload
        });

        if (!joinResponse.ok) {
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", joinResponse.status, errorText);
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (response.status === 404) {
                 detailedError = "API ERROR: 404 Not Found. Check Space URL and /queue/join endpoint.";
             }
             // ... (سایر کدهای مدیریت خطا)
             throw new Error(detailedError);
        }

        const joinResult = await joinResponse.json();
        
        // 5. بررسی event_id
        if (!joinResult.event_id) {
             if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
             throw new Error("Failed to get event_id from queue join.");
        }
        console.log(`Step 2: Joined queue successfully. Listening for session ${sessionHash}...`);

        // --- Listening for data (EventSource) ---
        // 6. گوش دادن به /queue/data
        const dataUrl = QUEUE_DATA_URL(sessionHash);
        eventSourceRef.current = new EventSource(dataUrl); 

        eventSourceRef.current.onmessage = (event) => {
            try {
                // 7. دریافت جریان داده‌ها
                const message = JSON.parse(event.data);
                console.log("Parsed SSE message:", message);

                switch (message.msg) {
                    case "process_starts":
                        setOutput("Processing started...");
                        startTypingProcess("Processing started...");
                        break;
                    case "process_generating": break;
                    case "process_completed":
                        // 8. دریافت نتیجه نهایی
                        if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                            
                            // 9. استخراج خروجی
                            const rawPrediction = message.output.data[0];
                            // (فرمت خروجی app.py شما: "Predicted Label: X\nProbability: Y")
                            const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;

                            setOutput(formattedOutput);
                            startTypingProcess(formattedOutput);
                        } else {
                             const errorMsg = message.output?.error || "Unknown server processing error.";
                             setError(`Processing failed: ${errorMsg}`);
                             setOutput(''); startTypingProcess('');
                        }
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false);
                        break;
                     case "queue_full":
                         setError("API Error: The queue is full, please try again later.");
                         if(eventSourceRef.current) eventSourceRef.current.close();
                         eventSourceRef.current = null;
                         setLoading(false);
                         break;
                     case "estimation":
                         const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                         const queueSize = message.queue_size !== undefined ? message.queue_size : '?';
                         const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                         const waitMsg = `In queue (${queuePosition}/${queueSize}). Est. wait: ${eta}s...`;
                         if (loading) {
                             setOutput(waitMsg);
                             startTypingProcess(waitMsg);
                         }
                         break;
                    case "close_stream":
                        console.log("Stream closed by server.");
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        if (loading) { 
                            setLoading(false);
                            if (!output && !error) {
                                setError("Stream closed unexpectedly before result.");
                            }
                        }
                        break;
                    default:
                        break;
                }
            } catch (parseError) {
                 console.warn("Could not parse SSE message, maybe it's not JSON:", event.data);
            }
        };

        eventSourceRef.current.onerror = (error) => {
            let errorMsg = "Error connecting to API stream.";
             if (!navigator.onLine) {
                 errorMsg += " Check your network connection.";
             } else {
                 errorMsg += " Could not maintain connection. Check Space status/logs."; 
             }
            setError(errorMsg);
             if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
            setOutput('');
            startTypingProcess('');
        };

    } catch (err) {
        let displayError = err.message || "An unknown error occurred.";
        if (err.message.includes("Failed to fetch")) {
            displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
        } else if (err.message.includes("503")) {
             displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/overloaded. Wait and retry.";
        }
       setError(displayError);
       setLoading(false);
       setOutput('');
       startTypingProcess('');
        if (eventSourceRef.current) {
           eventSourceRef.current.close();
           eventSourceRef.current = null;
        }
    }
    // --- [END] پیاده‌سازی ---
  };

  // --- Render logic (بدون تغییر) ---
  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white break-words">{title}</h3>
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

      {/* [اصلاح شد] اضافه کردن whitespace-pre-wrap برای نمایش صحیح \n */}
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

