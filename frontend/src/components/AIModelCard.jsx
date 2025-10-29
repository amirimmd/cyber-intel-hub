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

// --- خواندن توکن (روش استاندارد Vite) ---
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

// [DEBUG]
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
} else {
  console.log("✅ Hugging Face API Token loaded (partially):", HF_API_TOKEN.substring(0, 5) + "...");
}

// Typewriter Hook (Refined)
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
        // Clear interval from previous runs of this effect
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (isTyping && internalText && currentIndex < internalText.length) {
            intervalRef.current = setInterval(() => {
                // Check condition *inside* interval
                setDisplayText(prev => {
                    // Prevent adding characters if currentIndex has already reached the end
                    if (currentIndex < internalText.length) {
                         // IMPORTANT: Use substring based on the *next* index to avoid skipping
                         const nextIndex = currentIndex + 1;
                         setCurrentIndex(nextIndex); // Update index for the next run
                         return internalText.substring(0, nextIndex);
                    } else {
                        // If somehow index is out of bounds, stop
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        setIsTyping(false);
                        return prev; // Return previous display text
                    }
                });

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
                intervalRef.current = null;
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
                // session_hash در درخواست اولیه join نیاز نیست
            })
        });

        if (!joinResponse.ok) {
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", errorText);
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (joinResponse.status === 404) {
                 detailedError += " Endpoint /queue/join not found. Check Space API path.";
             } else if (errorText.includes("Internal Server Error")) {
                detailedError += " Space might be restarting or errored. Check Space logs.";
             } else if (joinResponse.status === 503) {
                detailedError += " Service Unavailable. Space might be sleeping/overloaded.";
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
        console.log("Step 3: Listening for results via EventSource...");
        const dataUrl = QUEUE_DATA_URL(sessionHash);
         // Important: Handle potential CORS issues if the Space is private/gated
        // EventSource does not support Authorization headers easily.
        // If Space is private, consider making it public for testing or use a backend proxy.
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
                        console.log("Processing completed.");
                        if (message.success && message.output && message.output.data) {
                            const rawPrediction = message.output.data[0];
                            let formattedOutput = "Error: Could not parse prediction result.";
                             if (rawPrediction !== null && rawPrediction !== undefined) {
                                if (typeof rawPrediction === 'string' && rawPrediction.startsWith("Exploitability Probability:")) {
                                    formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;
                                } else if (typeof rawPrediction === 'number') {
                                    formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
                                } else {
                                    formattedOutput = `[EXBERT_REPORT]: Raw output: ${JSON.stringify(rawPrediction)}`;
                                }
                            }

                            setOutput(formattedOutput);
                            startTypingProcess(formattedOutput);
                        } else {
                             const errorMsg = message.output?.error || "Unknown server processing error.";
                             setError(`Processing failed: ${errorMsg}`);
                             setOutput(''); startTypingProcess('');
                        }
                        if(eventSourceRef.current) eventSourceRef.current.close();
                        eventSourceRef.current = null;
                        setLoading(false); // Stop loading indicator here
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
            // Provide more context if possible (e.g., check network status)
             let errorMsg = "Error connecting to API stream.";
             if (!navigator.onLine) {
                 errorMsg += " Check your network connection.";
             } else {
                 errorMsg += " The Space might be sleeping, restarting, or encountered an error. Check Space logs.";
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
      let displayError = err.message;
       if (err.message.includes("Failed to join queue")) {
           displayError = "API ERROR: Could not join the processing queue. Check Space status/logs.";
       } else if (err.message.includes("Failed to fetch")) {
           displayError = "API ERROR: Network error or CORS issue.";
       } else if (err.message.includes("404")) {
            displayError = "API ERROR: 404 Endpoint Not Found. Please double-check Space URL and API path.";
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
     // setLoading(false) is now primarily handled by the EventSource onmessage/onerror handlers
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
         {/* Display cursor only while actively typing */}
         {isTyping ? <span className="typing-cursor"></span> : null}

         {/* Display standby only when not loading, no error, and effectively no output */}
         {!loading && !error && !internalText && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

export default AIModelCard;

