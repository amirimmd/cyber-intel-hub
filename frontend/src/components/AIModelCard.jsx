// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

// [FIX] استفاده از مسیر API صحیحی که از لاگ‌های شما پیدا شد
const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

// --- خواندن توکن (روش استاندارد Vite) ---
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

// [DEBUG] لاگ کردن وضعیت توکن
if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing! Real model queries will fail.");
  console.log("  Ensure it is set in .env.local (for dev) or Vercel environment variables (for production).");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded successfully.");
}


// Typewriter Hook (Refined)
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = useState('');
    const [internalText, setInternalText] = useState(text); // Store the full target text
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef(null); // Ref to hold interval ID

    const startTypingProcess = useCallback((newText) => {
        // Clear previous interval if any
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setInternalText(newText || ''); // Update the target text
        setDisplayText(''); // Clear display immediately
        setCurrentIndex(0); // Reset index
        if (newText) {
            setIsTyping(true); // Start typing if there is new text
        } else {
            setIsTyping(false); // Stop typing if new text is empty
        }
    }, []); // No dependencies needed here if it only sets state

    useEffect(() => {
        // Clear interval from previous runs of this effect
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (isTyping && internalText && currentIndex < internalText.length) {
            intervalRef.current = setInterval(() => {
                // Check condition *inside* interval callback
                 if (currentIndex < internalText.length) {
                    // Use substring based on the *next* index to avoid skipping
                    const nextIndex = currentIndex + 1;
                    setDisplayText(internalText.substring(0, nextIndex)); // More reliable update
                    setCurrentIndex(nextIndex); // Update index for the next run
                 } else {
                    // If somehow index is out of bounds, stop
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setIsTyping(false);
                 }
            }, speed);
        } else if (currentIndex >= (internalText?.length || 0)) {
            // Stop typing if done
            if(isTyping) setIsTyping(false);
            // Also clear interval just in case
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        // Cleanup function for the effect
        return () => {
             if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null; // Clear ref on cleanup too
             }
        };
    }, [isTyping, speed, internalText, currentIndex]); // Rerun effect if these change


    // Global cleanup on unmount
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
  const [output, setOutput] = useState(''); // Stores the full response from API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Get isTyping state from hook
  const [typedOutput, startTypingProcess, isTyping] = useTypewriter(output, 20);
  const eventSourceRef = useRef(null); // Ref for EventSource

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
    startTypingProcess(''); // Clear and stop typewriter
    // Close previous connection if exists
    if (eventSourceRef.current) {
        console.log("Closing previous EventSource before new request.");
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
        const errorMsg = "API Token Missing. Configure VITE_HF_API_TOKEN in your environment.";
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
    }

    try {
        console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
        // 1. Join the queue, sending data and CORRECT fn_index
        const fnIndexToUse = 2; // <<<=== !!! IMPORTANT: VERIFY THIS VALUE !!!
        console.log(`Using fn_index: ${fnIndexToUse}`);

        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fn_index: fnIndexToUse, // <-- Use the variable
                data: [query],
                // session_hash در درخواست اولیه join نیاز نیست
            })
        });

        if (!joinResponse.ok) {
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", joinResponse.status, errorText);
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (joinResponse.status === 401) {
                 detailedError += " Unauthorized. Check your VITE_HF_API_TOKEN.";
             } else if (joinResponse.status === 404) {
                 detailedError += ` Endpoint ${API_PREFIX}/queue/join not found. Ensure queue is enabled (.queue().launch()) and API path is correct.`;
             } else if (joinResponse.status === 422) {
                 detailedError += ` Validation Error. Check fn_index (currently ${fnIndexToUse}) or data payload format.`;
             } else if (errorText.includes("Internal Server Error") || joinResponse.status === 500) {
                detailedError += " Internal Server Error. Space might be restarting or errored. Check Space logs.";
             } else if (joinResponse.status === 503) {
                detailedError += " Service Unavailable. Space might be sleeping/overloaded. Try again.";
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        const joinResult = await joinResponse.json();
        const sessionHash = joinResult.session_hash;

        if (!sessionHash) {
             if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
             throw new Error("Failed to get session hash from queue join.");
        }
        console.log(`Step 2: Joined queue with session hash: ${sessionHash}`);


        // 3. Listen for results using EventSource
        console.log(`Step 3: Listening for results via EventSource at ${QUEUE_DATA_URL(sessionHash)}...`);
        const dataUrl = QUEUE_DATA_URL(sessionHash);
        eventSourceRef.current = new EventSource(dataUrl);

        eventSourceRef.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("Received SSE message:", message);

                switch (message.msg) {
                    case "process_starts":
                        setOutput("Processing started...");
                        startTypingProcess("Processing started...");
                        break;
                    case "process_generating": break; // Handle if needed
                    case "process_completed":
                        console.log("Processing completed. Raw output:", JSON.stringify(message.output, null, 2)); // Log the raw output object
                        if (message.success && message.output && message.output.data) {
                            // [اصلاح] دسترسی به خروجی مدل - با لاگ دقیق تر
                            const rawPrediction = message.output.data[0];
                            console.log("Extracted rawPrediction:", rawPrediction); // Log extracted data
                            let formattedOutput = "Error: Could not parse prediction result.";

                             if (rawPrediction !== null && rawPrediction !== undefined) {
                                // اگر خروجی یک آبجکت با لیبل است
                                if (typeof rawPrediction === 'object' && rawPrediction.label !== undefined && rawPrediction.score !== undefined) {
                                     formattedOutput = `[EXBERT_REPORT]: Label: ${rawPrediction.label}, Score: ${(rawPrediction.score * 100).toFixed(1)}%`;
                                     console.log("Parsed as Label/Score object.");
                                }
                                // اگر خروجی یک رشته است (بر اساس کد قبلی شما)
                                else if (typeof rawPrediction === 'string' && rawPrediction.startsWith("Exploitability Probability:")) {
                                    formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;
                                    console.log("Parsed as 'Exploitability Probability' string.");
                                }
                                // اگر خروجی فقط یک عدد است (بر اساس کد قبلی شما)
                                else if (typeof rawPrediction === 'number') {
                                    formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
                                     console.log("Parsed as number (probability).");
                                }
                                // اگر خروجی فقط یک رشته است
                                else if (typeof rawPrediction === 'string') {
                                    formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;
                                    console.log("Parsed as generic string.");
                                }
                                else {
                                    formattedOutput = `[EXBERT_REPORT]: Raw output: ${JSON.stringify(rawPrediction)}`;
                                    console.log("Could not parse, showing raw JSON.");
                                }
                            } else {
                                console.warn("rawPrediction is null or undefined.");
                                formattedOutput = "[EXBERT_REPORT]: Received empty result.";
                            }

                            setOutput(formattedOutput);
                            startTypingProcess(formattedOutput);
                        } else {
                             const errorMsg = message.output?.error || "Unknown server processing error.";
                             console.error("Processing failed on server:", errorMsg);
                             setError(`Processing failed: ${errorMsg}`);
                             setOutput(''); startTypingProcess('');
                        }
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false); // Stop loading indicator here
                        break;
                     case "queue_full":
                         console.warn("Queue is full.");
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
                         // فقط اگر هنوز در حال لود شدن هستیم، پیام صف را نشان بده
                         if (loading) {
                             setOutput(waitMsg);
                             startTypingProcess(waitMsg);
                         }
                         break;
                    default:
                        console.warn("Received unknown message type:", message.msg, message);
                        break;
                }
            } catch (parseError) {
                 console.error("Failed to parse SSE message:", event.data, parseError);
                 setError("Error receiving data from API stream.");
                 if(eventSourceRef.current) eventSourceRef.current.close();
                 eventSourceRef.current = null;
                 setLoading(false);
                 setOutput(''); startTypingProcess('');
            }
        };

        eventSourceRef.current.onerror = (error) => {
            console.error("EventSource Error:", error);
            let errorMsg = "Error connecting to API stream.";
             if (!navigator.onLine) {
                 errorMsg += " Check your network connection.";
             } else {
                 // خطای EventSource معمولاً وقتی رخ می‌دهد که Space در حال ری‌استارت، خاموش، یا دارای خطا باشد
                 errorMsg += " Could not maintain connection. The Space might be sleeping, restarting, or encountered an internal error. Check Space logs.";
             }
            setError(errorMsg);
             if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
            setOutput('');
            startTypingProcess('');
        };

    } catch (err) {
      console.error("Error during Gradio Queue interaction:", err);
      let displayError = err.message || "An unknown error occurred.";
       // نمایش خطاهای واضح تر
       if (!(err instanceof Error)) { // Handle non-Error objects being thrown
          displayError = `An unexpected issue occurred: ${JSON.stringify(err)}`;
       } else if (err.message.includes("401")) {
           displayError = "API ERROR: 401 Unauthorized. Check your VITE_HF_API_TOKEN in Vercel/local env.";
       } else if (err.message.includes("422")) {
           displayError = `API ERROR: 422 Validation Error. Verify fn_index (is ${fnIndexToUse} correct?) and data format sent.`;
       } else if (err.message.includes("Failed to fetch")) {
           displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
       } else if (err.message.includes("404")) {
            displayError = `API ERROR: 404 Endpoint Not Found (${API_PREFIX}/queue/join). Ensure queue is enabled in app.py and path is correct.`;
       } else if (err.message.includes("500") || err.message.includes("Internal Server Error")) {
            displayError = "API ERROR: 500 Internal Server Error on Hugging Face Space. Check Space logs for details.";
       } else if (err.message.includes("503")) {
            displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping, building, or overloaded. Wait and retry.";
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
     // setLoading(false) is handled by EventSource messages (completed, queue_full, error)
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
        <button type="submit" className="cyber-button w-full mt-3 flex items-center justify-center" disabled={loading || !input || (modelId === 'exbert' && !HF_API_TOKEN)}>
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
         {/* Display cursor only while actively typing */}
         {isTyping ? <span className="typing-cursor"></span> : null}

         {/* Display standby only when not loading, no error, and effectively no output */}
         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

export default AIModelCard;

