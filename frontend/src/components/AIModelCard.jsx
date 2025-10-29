// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;
// [مهم] استفاده از نقطه پایانی صحیح برای شروع صف Gradio
const QUEUE_JOIN_URL = `${BASE_API_URL}/queue/join`;
// نقطه پایانی برای گوش دادن به نتایج (EventSource)
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}/queue/data?session_hash=${sessionHash}`;

// --- خواندن توکن ---
const HF_API_TOKEN = process.env.VITE_HF_API_TOKEN;

// [DEBUG]
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
}

// Typewriter Hook (Refined) - بدون تغییر
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = useState('');
    const [internalText, setInternalText] = useState(text);
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef(null);

    const startTypingProcess = useCallback((newText) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setInternalText(newText || '');
        setDisplayText('');
        setCurrentIndex(0);
        if (newText) {
            setIsTyping(true);
        } else {
            setIsTyping(false);
        }
    }, []);

    useEffect(() => {
        if (isTyping && internalText && currentIndex < internalText.length) {
            intervalRef.current = setInterval(() => {
                 if (currentIndex < internalText.length) {
                    setDisplayText(prev => prev + internalText.charAt(currentIndex));
                    setCurrentIndex(prevIndex => prevIndex + 1);
                 } else {
                     if(intervalRef.current) clearInterval(intervalRef.current);
                     intervalRef.current = null;
                     setIsTyping(false);
                 }
            }, speed);
            return () => {
                 if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                 }
            };
        } else if (currentIndex >= (internalText?.length || 0)) {
             if(isTyping) setIsTyping(false);
        }
    }, [isTyping, speed, internalText, currentIndex]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return [displayText, startTypingProcess, isTyping];
};


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);
  const eventSourceRef = useRef(null);

  // Simulation function (unchanged)
  const simulateAnalysis = (query, modelId) => {
      let simulatedResponse = '';
      switch (modelId) {
        case 'xai': simulatedResponse = `[SIMULATED_XAI]: Analysis for "${query.substring(0,15)}..."`; break;
        case 'other': simulatedResponse = `[SIMULATED_GENERAL]: Query length: ${query.length}`; break;
        default: simulatedResponse = "ERROR: Simulated model not found.";
      }
      return simulatedResponse;
  };

  // Cleanup EventSource (unchanged)
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
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }

    // --- Handle simulated models ---
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }

    // --- Real call using Gradio Queue Protocol ---
    if (!HF_API_TOKEN) {
        setError("API Token Missing. Configure VITE_HF_API_TOKEN.");
        setLoading(false);
        return;
    }

    try {
        console.log("Step 1: Joining Gradio Queue...");
        // 1. Join the queue, sending data and CORRECT fn_index
        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            // [اصلاح نهایی] استفاده از fn_index: 2 بر اساس Payload شما
            body: JSON.stringify({
                fn_index: 2, // <-- Correct index based on your inspection
                data: [query],
                // session_hash در درخواست اولیه join نیاز نیست، خود Gradio آن را برمی‌گرداند
            })
        });

        if (!joinResponse.ok) {
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", errorText);
             // تلاش برای تشخیص خطای رایج "Model is loading"
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (errorText.includes("Internal Server Error") && errorText.includes("startup")) {
                detailedError += " Space might be restarting or errored during startup. Check Space logs.";
             } else if (joinResponse.status === 503) {
                detailedError += " Service Unavailable. Space might be sleeping or overloaded.";
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const joinResult = await joinResponse.json();
        const sessionHash = joinResult.session_hash;

        if (!sessionHash) {
             // گاهی اوقات Gradio خطای دیگری را در قالب JSON برمی‌گرداند
             if (joinResult.error) {
                 throw new Error(`Queue join returned error: ${joinResult.error}`);
             }
             throw new Error("Failed to get session hash from queue join.");
        }
        console.log(`Step 2: Joined queue with session hash: ${sessionHash}`);


        // 3. Listen for results using EventSource (Server-Sent Events)
        console.log("Step 3: Listening for results via EventSource...");
        // [مهم] اطمینان از ارسال توکن برای EventSource (اگر Space خصوصی باشد)
        // Note: EventSource doesn't easily support custom headers like Authorization.
        // If your Space is private, making it public might be necessary for EventSource,
        // OR you'd need a backend proxy to handle authentication.
        // Assuming the Space is public or token is handled via cookies/other means by HF.
        eventSourceRef.current = new EventSource(QUEUE_DATA_URL(sessionHash));

        eventSourceRef.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received SSE message:", message);

            switch (message.msg) {
                case "process_starts":
                    setOutput("Processing started...");
                    startTypingProcess("Processing started...");
                    break;
                case "process_generating":
                    // (Handle intermediate results if needed)
                    break;
                case "process_completed":
                    console.log("Processing completed.");
                    if (message.success && message.output && message.output.data) {
                        const rawPrediction = message.output.data[0];
                        let formattedOutput = "Error: Could not parse prediction result.";
                        // [اصلاح شده] بررسی دقیقتر نوع خروجی
                        if (rawPrediction !== null && rawPrediction !== undefined) {
                            if (typeof rawPrediction === 'string' && rawPrediction.startsWith("Exploitability Probability:")) {
                                // اگر تابع پایتون رشته کامل را برمیگرداند
                                formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;
                            } else if (typeof rawPrediction === 'number') {
                                // اگر تابع پایتون فقط عدد احتمال را برمیگرداند
                                formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
                            } else {
                                // برای سایر انواع خروجی
                                formattedOutput = `[EXBERT_REPORT]: Analysis received. Raw output: ${JSON.stringify(rawPrediction)}`;
                            }
                        }

                        setOutput(formattedOutput);
                        startTypingProcess(formattedOutput);
                    } else {
                         // اگر success=false بود یا output نداشت
                         const errorMsg = message.output?.error || "Unknown processing error.";
                         setError(`Processing failed on server: ${errorMsg}`);
                         setOutput('');
                         startTypingProcess('');
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
                     setOutput(waitMsg);
                     startTypingProcess(waitMsg);
                     break;
                default:
                    console.warn("Received unknown message type:", message.msg);
                    break;
            }
        };

        eventSourceRef.current.onerror = (error) => {
            console.error("EventSource Error:", error);
            setError("Error connecting to the API stream. Check Space status or network.");
             if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
            setOutput('');
            startTypingProcess('');
        };

    } catch (err) {
      console.error("Error during Gradio Queue interaction:", err);
      let displayError = err.message;
       if (err.message.includes("Failed to join queue")) {
           displayError = "API ERROR: Could not join the processing queue. Check Space status/logs.";
       } else if (err.message.includes("Failed to fetch")) {
           displayError = "API ERROR: Network error or CORS issue.";
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
  };

  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>

      {modelId === 'exbert' && !HF_API_TOKEN && (
          <p className="text-xs text-cyber-yellow mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-500/50">
            ⚠️ HF Token (VITE_HF_API_TOKEN) missing. AI analysis disabled.
          </p>
      )}

      <form onSubmit={handleModelQuery}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          disabled={loading || (modelId === 'exbert' && !HF_API_TOKEN)}
        />
        <button type="submit" className="cyber-button w-full mt-3 flex items-center justify-center" disabled={loading || (modelId === 'exbert' && !HF_API_TOKEN)}>
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
         {/* Display cursor only while typing */}
         {isTyping ? <span className="typing-cursor"></span> : null}

         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

export default AIModelCard;

