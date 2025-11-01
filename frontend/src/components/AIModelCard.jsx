// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
// [FIX] آدرس‌دهی نهایی به فایل supabaseClient.js
import { supabase } from '../supabaseClient.js'; 

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

// [NOTE] این توکن باید در متغیرهای محیطی Vercel تنظیم شود (VITE_HF_API_TOKEN)
// [UPDATE] این متغیر خوانده می‌شود اما چون Space شما public است، در هدر ارسال استفاده نمی‌شود.
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! (Using public mode)");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded (though likely not needed for public space).");
}

// --- [START] منطق فراخوانی API مدل پایتون شما ---
// این تابع هش مورد نیاز Gradio API را تولید می‌کند
const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
// --- [END] منطق فراخوانی API ---


// Typewriter Hook (برای افکت ترمینال)
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
  const eventSourceRef = useRef(null);

  // منطق شبیه‌سازی برای مدل‌های غیر از ExBERT
  const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI]: Analysis for "${query.substring(0,15)}..."`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL]: Query length: ${query.length}`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
  };

  useEffect(() => {
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
    if (eventSourceRef.current) {
        console.log("Closing previous EventSource before new request.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }

    // شبیه‌سازی برای مدل‌های دیگر
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }
    
    // --- [START] پیاده‌سازی منطق پایتون در جاوا اسکریپت ---
    const sessionHash = generateSessionHash(); // 1. تولید هش محلی
    
    try {
        console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
        
        // 2. ساخت هدرها (بر اساس اسکریپت پایتون شما، نیاز به توکن Auth نیست)
        const joinHeaders = {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${HF_API_TOKEN}`, // حذف شد - Space پابلیک است
        };
        
        // 3. ساخت Payload دقیقاً مطابق اسکریپت پایتون
        const payload = {
            "data": [query],
            "event_data": null,
            "fn_index": 2,       // مطابق اسکریپت پایتون
            "trigger_id": 12,    // مطابق اسکریپت پایتون
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
             if (joinResponse.status === 401) {
                 detailedError = "API ERROR: 401 Unauthorized. Check Space permissions.";
             } else if (joinResponse.status === 422) {
                 detailedError = `API ERROR: 422 Validation Error. Check fn_index/trigger_id.`;
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const joinResult = await joinResponse.json();
        
        // 5. بررسی event_id (بر اساس خروجی پایتون شما)
        if (!joinResult.event_id) {
             if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
             throw new Error("Failed to get event_id from queue join.");
        }
        console.log(`Step 2: Joined queue successfully with event_id: ${joinResult.event_id} and session_hash: ${sessionHash}`);

        // --- Listening for data (EventSource) ---
        // 6. گوش دادن به /queue/data با استفاده از session_hash
        console.log(`Step 3: Listening for results via EventSource at ${QUEUE_DATA_URL(sessionHash)}...`);
        const dataUrl = QUEUE_DATA_URL(sessionHash);

        eventSourceRef.current = new EventSource(dataUrl); 

        eventSourceRef.current.onmessage = (event) => {
            try {
                // 7. دریافت جریان داده‌ها (data: {"msg": ...})
                // خروجی پایتون شما نشان می‌دهد که هر خط یک JSON جداگانه است
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
                        console.log("Processing completed. Raw output:", JSON.stringify(message.output, null, 2));
                        if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                            
                            // 9. استخراج خروجی (داده اول آرایه)
                            // بر اساس خروجی پایتون شما: {"data":["Exploitability Probability: 27.19%"],...}
                            const rawPrediction = message.output.data[0];
                            let formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;

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
                        // این پیام در خروجی پایتون شما بود
                        console.log("Stream closed by server.");
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        if (loading) { // اگر هنوز در حال بارگذاری بودیم و نتیجه نیامد
                            setLoading(false);
                            if (!output && !error) {
                                setError("Stream closed unexpectedly before result.");
                            }
                        }
                        break;
                    default:
                        // نادیده گرفتن پیام‌های ناشناخته
                        break;
                }
            } catch (parseError) {
                 console.warn("Could not parse SSE message, maybe it's not JSON:", event.data);
                 // خطا را نادیده می‌گیریم چون ممکن است پیام‌های غیر JSON هم در استریم باشند
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

  // --- Render logic ---
  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>

      {/* پیام مربوط به توکن HF حذف شد چون Space شما Public است و نیازی به توکن ندارد */}

      <form onSubmit={handleModelQuery}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          // [FIX] منطق غیرفعال سازی textarea اصلاح شد
          // فقط زمانی که در حال بارگذاری است (loading) غیرفعال شود
          disabled={loading} 
        />
        <button 
            type="submit" 
            className="cyber-button w-full mt-3 flex items-center justify-center" 
            // [FIX] دکمه باید زمانی غیرفعال شود که:
            // 1. در حال بارگذاری (loading) باشد
            // 2. یا متنی وارد نشده باشد (!input.trim())
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

      <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto">
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
