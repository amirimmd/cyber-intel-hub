// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
// [FIX]: ایمپورت به فایل JSX تغییر یافت
import { supabase } from '../supabaseClient.jsx'; 

// --- Configuration ---
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;

const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;

const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;

if (!HF_API_TOKEN) {
  console.warn("⚠️ [AIModelCard] VITE_HF_API_TOKEN is missing!");
} else {
  console.log("✅ [AIModelCard] VITE_HF_API_TOKEN loaded successfully.");
}

// Typewriter Hook (Refined - unchanged from previous version)
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

    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTypingProcess(response);
      setLoading(false);
      return;
    }

    // --- Real call ---
    // Note: We don't check for HF_API_TOKEN here anymore because we're testing *without* it for the JOIN step.
    // We will still need it for subsequent steps if the space requires authentication.

    try {
        console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
        const fnIndexToUse = 2; // Confirmed correct
        console.log(`Using fn_index: ${fnIndexToUse}`);

        // [TEST] Temporarily remove Authorization header for the JOIN request only
        const joinHeaders = {
            'Content-Type': 'application/json',
        };
        // if (HF_API_TOKEN) { // Keep token check commented out for this test
        //    joinHeaders['Authorization'] = `Bearer ${HF_API_TOKEN}`;
        // } else {
        //    console.warn("Attempting join without API token (as per test).");
        // }
        console.warn("Attempting join without Authorization header (TEST).");


        const joinResponse = await fetch(QUEUE_JOIN_URL, {
            method: 'POST',
            headers: joinHeaders, // Use headers without Auth for this test
            body: JSON.stringify({
                fn_index: fnIndexToUse,
                data: [query],
            })
        });

        if (!joinResponse.ok) {
             // Handle errors same as before...
             const errorText = await joinResponse.text();
             console.error("Queue Join Error:", joinResponse.status, errorText);
             let detailedError = `Failed to join queue: ${joinResponse.status}.`;
             if (joinResponse.status === 401) {
                 detailedError += " Unauthorized. Even without the header, auth might be required. Re-add header & check token.";
             } else if (joinResponse.status === 404) {
                 detailedError += ` Endpoint ${API_PREFIX}/queue/join not found. Ensure queue is enabled (.queue().launch()) and API path is correct.`;
             } else if (joinResponse.status === 422) {
                 detailedError += ` Validation Error. Check fn_index (currently ${fnIndexToUse}) or data payload format.`;
             } else if (joinResponse.status === 400 && errorText.includes("Session hash not found")) {
                 detailedError += ` Still getting 400 Session hash error. Problem likely in app.py or Gradio version/config.`; // More specific error
             } else if (errorText.includes("Internal Server Error") || joinResponse.status === 500) {
                detailedError += " Internal Server Error. Space might be restarting or errored. Check Space logs.";
             } else if (joinResponse.status === 503) {
                detailedError += " Service Unavailable. Space might be sleeping/overloaded. Try again.";
             } else {
                 detailedError += ` ${errorText.substring(0, 150)}`;
             }
             throw new Error(detailedError);
        }

        // --- If join is successful (status 200 OK) ---
        const joinResult = await joinResponse.json();
        const sessionHash = joinResult.session_hash;

        if (!sessionHash) {
             if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
             throw new Error("Failed to get session hash from queue join.");
        }
        console.log(`Step 2: Joined queue successfully with session hash: ${sessionHash}`);

        // --- Now listen for data (EventSource likely still needs Auth if space is private) ---
        console.log(`Step 3: Listening for results via EventSource at ${QUEUE_DATA_URL(sessionHash)}...`);
        const dataUrl = QUEUE_DATA_URL(sessionHash);

        // Note: EventSource doesn't easily support custom headers like Authorization.
        // If your Hugging Face Space is PRIVATE, EventSource might fail here.
        // If it's PUBLIC, it should work.
        if (!HF_API_TOKEN && /* Check if space is actually private, logic needed here */ false) {
             console.error("Space seems private, but no API token available for EventSource. Data fetching might fail.");
             // Consider informing the user or attempting fetch with credentials if EventSource spec allowed it.
        }
        // For public spaces or if token isn't strictly needed for GET data:
        eventSourceRef.current = new EventSource(dataUrl); // Standard EventSource connection


        eventSourceRef.current.onmessage = (event) => {
            // ... (rest of the onmessage logic remains the same)
            try {
                const message = JSON.parse(event.data);
                console.log("Received SSE message:", message);

                switch (message.msg) {
                    case "process_starts":
                        setOutput("Processing started...");
                        startTypingProcess("Processing started...");
                        break;
                    case "process_generating": break;
                    case "process_completed":
                        console.log("Processing completed. Raw output:", JSON.stringify(message.output, null, 2));
                        if (message.success && message.output && message.output.data) {
                            const rawPrediction = message.output.data[0];
                            console.log("Extracted rawPrediction:", rawPrediction);
                            let formattedOutput = "Error: Could not parse prediction result.";

                             if (rawPrediction !== null && rawPrediction !== undefined) {
                                if (typeof rawPrediction === 'object' && rawPrediction.label !== undefined && rawPrediction.score !== undefined) {
                                     formattedOutput = `[EXBERT_REPORT]: Label: ${rawPrediction.label}, Score: ${(rawPrediction.score * 100).toFixed(1)}%`;
                                     console.log("Parsed as Label/Score object.");
                                }
                                else if (typeof rawPrediction === 'string' && rawPrediction.startsWith("Exploitability Probability:")) {
                                    formattedOutput = `[EXBERT_REPORT]: ${rawPrediction}`;
                                    console.log("Parsed as 'Exploitability Probability' string.");
                                }
                                else if (typeof rawPrediction === 'number') {
                                    formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
                                     console.log("Parsed as number (probability).");
                                }
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
                        setLoading(false);
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
            // ... (onerror logic remains the same)
             console.error("EventSource Error:", error);
            let errorMsg = "Error connecting to API stream.";
             if (!navigator.onLine) {
                 errorMsg += " Check your network connection.";
             } else {
                 errorMsg += " Could not maintain connection. Space might be sleeping/restarting/errored or requires authentication for data stream. Check Space logs."; // Added auth note
             }
            setError(errorMsg);
             if(eventSourceRef.current) eventSourceRef.current.close();
            eventSourceRef.current = null;
            setLoading(false);
            setOutput('');
            startTypingProcess('');
        };

    } catch (err) {
        // ... (catch block remains the same)
        console.error("Error during Gradio Queue interaction:", err);
        let displayError = err.message || "An unknown error occurred.";
        if (!(err instanceof Error)) {
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
        } else if (err.message.includes("400") && err.message.includes("Session hash")) {
             displayError = "API ERROR: 400 Session hash error persists. Check app.py config or Gradio version compatibility.";
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

  // --- Render logic (unchanged) ---
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
          disabled={loading || (modelId === 'exbert' && !HF_API_TOKEN && /* Need logic to check if space is private */ false)} // Disable if private and no token
        />
        <button type="submit" className="cyber-button w-full mt-3 flex items-center justify-center" disabled={loading || !input || (modelId === 'exbert' && !HF_API_TOKEN && /* Need logic to check if space is private */ false) }>
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
