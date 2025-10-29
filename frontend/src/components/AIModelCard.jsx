// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration ---
const HF_USER = "amirimmd"; 
const HF_SPACE_NAME = "ExBERT-Classifier-Inference"; 
// [مهم] آدرس API استاندارد Gradio با فرض api_name="predict"
const API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space/run/predict`; 

// --- خواندن توکن ---
// [توجه] اطمینان از تعریف VITE_HF_API_TOKEN در Vercel/vite.config.js
const HF_API_TOKEN = process.env.VITE_HF_API_TOKEN; 

// [DEBUG] Check if token is loaded
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
}

// Typewriter Hook
const useTypewriter = (text, speed = 50) => {
    const [displayText, setDisplayText] = useState('');
    const [internalText, setInternalText] = useState(text); // Store the full target text
    const [isTyping, setIsTyping] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const startTypingProcess = useCallback((newText) => {
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
        if (isTyping && internalText && currentIndex < internalText.length) {
            const timeoutId = setTimeout(() => {
                setDisplayText(prev => prev + internalText.charAt(currentIndex));
                setCurrentIndex(prevIndex => prevIndex + 1);
            }, speed);
            return () => clearTimeout(timeoutId); // Cleanup timeout on change
        } else if (currentIndex >= (internalText?.length || 0)) {
            setIsTyping(false); // Stop typing when done
        }
    }, [displayText, isTyping, speed, internalText, currentIndex]); // Effect depends on these states


    // Return the currently displayed text and the function to start typing
    return [displayText, startTypingProcess];
};


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(''); // Stores the full response from API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Use the refined typewriter hook
  const [typedOutput, startTyping] = useTypewriter(output, 20);

  // Simulation function (unchanged)
  const simulateAnalysis = (query, modelId) => {
    let simulatedResponse = '';
    switch (modelId) {
      case 'xai':
        simulatedResponse = `[EXBERT.XAI_REPORT]: Threat identified. EXPLANATION: Model attention focused on token 'OR 1=1' (weight: 0.95) and 'admin' (weight: 0.7). Decision trace points to 'CLASSIC_SQLI' signature.`;
        break;
      case 'other':
        simulatedResponse = `[GENERAL_MODEL_LOG]: Input string length: ${query.length} bytes. Operational status: NOMINAL.`;
        break;
      default:
        simulatedResponse = "ERROR: Model not found.";
    }
    return simulatedResponse;
  };


  const handleModelQuery = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    startTyping(''); // Clear and stop typewriter

    // --- Handle simulated models ---
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response); // Set the full response
      startTyping(response); // Start typing the full response
      setLoading(false);
      return;
    }
    
    // --- Real call to Gradio Space (only for ExBERT) ---
    if (!HF_API_TOKEN) {
        setError("API Token Missing. Please configure VITE_HF_API_TOKEN.");
        setLoading(false);
        return;
    }

    try {
      console.log(`Sending request to: ${API_URL} with query: ${query}`); // Log before fetch
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // [مهم] Gradio API payload with fn_index
        body: JSON.stringify({
          fn_index: 0, 
          data: [query], 
        }),
      });

      console.log(`Received response status: ${response.status}`); // Log status

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error("HF API Error Text:", errorText);

        let errorMessage = `HTTP Error ${response.status}.`;
        try {
             const errorJson = JSON.parse(errorText);
             // Gradio often returns errors in 'error' or 'detail'
             if (errorJson.error) errorMessage = errorJson.error;
             else if (errorJson.detail) errorMessage = errorJson.detail; 
             // Specific check for 404
             if (response.status === 404) errorMessage = "404 Error: API endpoint not found. Check Space URL/fn_index.";

        } catch {
             // If response is not JSON
             if (response.status === 404) errorMessage = "404 Error: API endpoint not found. Check Space URL/fn_index.";
             else if (errorText.includes("currently loading")) errorMessage = "Model is starting up (Cold Start). Please wait ~30s and try again.";
             else errorMessage = `Non-JSON Error Response: ${errorText.substring(0,100)}...`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("HF Gradio API Success Response:", result);

      // --- Process Gradio Response ---
      let formattedOutput = "Error: Could not parse prediction result."; 
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          const rawPrediction = result.data[0]; 

          if (typeof rawPrediction === 'string') {
               formattedOutput = rawPrediction; // Assume the Python function returns the final string
          } else if (typeof rawPrediction === 'number' && rawPrediction >= 0 && rawPrediction <= 1) {
               formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
          } else {
               formattedOutput = `[EXBERT_REPORT]: Analysis received. Raw output: ${JSON.stringify(rawPrediction)}`;
          }
      } else if (result.error) {
           formattedOutput = `[GRADIO_ERROR]: ${result.error}`;
      }


      setOutput(formattedOutput); // Set the full response text
      startTyping(formattedOutput); // Start typing it

    } catch (err) {
      console.error("Error during API call:", err);
      // Provide more specific error message based on common issues
      let displayError = err.message;
       if (err.message.includes("404")) {
           displayError = "API ERROR: 404 Not Found. Please verify the Space URL and check Space logs.";
       } else if (err.message.includes("Failed to fetch")) {
           displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
       } else if (err.message.includes("HTTP Error 5")) { // 500, 503 etc.
           displayError = "API ERROR: Server error on Hugging Face Space. Check Space logs for Python errors.";
       }
      setError(displayError);
      setOutput('');
      startTyping('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>
      
      {modelId === 'exbert' && !HF_API_TOKEN && (
          <p className="text-xs text-cyber-yellow mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-500/50">
            ⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) not configured. AI analysis is disabled.
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
        <button type="submit" className="cyber-button w-full mt-3 flex items-center justify-center" disabled={loading}>
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
         {/* Display typed output */}
         {typedOutput}
         {/* Display cursor only while typing and if there's content */}
         {isTyping && typedOutput.length < (output?.length || 0) ? <span className="typing-cursor"></span> : null}
         {/* Display standby message only when not loading, no error, and no output */}
         {!loading && !error && !output && !typedOutput && (
             <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
         )}
      </div>
    </div>
  );
};

export default AIModelCard;

