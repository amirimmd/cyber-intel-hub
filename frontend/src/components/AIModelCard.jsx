// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration for Hugging Face Inference API ---
// نام مدل شما در هاگینگ فیس
const HF_MODEL_NAME = "amirimmd/ExBERT-Classifier-CVE";
// URL پایه برای Inference API
const API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL_NAME}`;

// --- خواندن توکن از متغیرهای محیطی ---
// [نکته] استفاده از process.env.VITE_HF_API_TOKEN استاندارد Vite است
const HF_API_TOKEN = process.env.VITE_HF_API_TOKEN;

// [DEBUG] Check if token is loaded
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
}

// Typewriter Hook (بدون تغییر)
const useTypewriter = (text, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isTyping && text) {
      setDisplayText(''); // Clear previous text
      let i = 0;
      const intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayText(prev => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, speed);
      return () => clearInterval(intervalId);
    } else if (!text) {
        setDisplayText('');
    }
  }, [text, isTyping, speed]);

  const startTypingProcess = (newText) => {
    if(newText){
        setIsTyping(true); 
    } else {
        setIsTyping(false); 
        setDisplayText(''); 
    }
  };


  return [displayText, startTypingProcess];
};


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTyping] = useTypewriter(output, 20);

  const simulateResponse = (id, text) => {
    switch (id) {
        case 'xai':
            return `[EXBERT.XAI_REPORT]: Threat identified. EXPLANATION for "${text.substring(0, 20)}...": Model attention focused on token 'OR 1=1' (weight: 0.95) and 'admin' (weight: 0.7). Decision trace points to 'CLASSIC_SQLI' signature.`;
        case 'other':
            return `[GENERAL_MODEL_LOG]: Input string length: ${text.length} bytes. Token count: ${text.split(' ').length}. Hash signature: ${Math.random().toString(16).substring(2, 10)}. Operational status: NOMINAL.`;
        default:
            return "ERROR: Model not supported or input missing.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setOutput('');
    setError(null);
    startTyping('');

    // --- 1. Simulation for Non-EXBERT Models ---
    if (modelId !== 'exbert') {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        const simulated = simulateResponse(modelId, input);
        setOutput(simulated);
        startTyping(simulated);
        setLoading(false);
        return;
    }
    
    // --- 2. Live API Call for EXBERT Model ---
    if (!HF_API_TOKEN) {
        // این خطا نباید هنگام اجرا رخ دهد اگر متغیر تنظیم شده باشد
        setError("Hugging Face API Token (VITE_HF_API_TOKEN) is missing. Cannot execute live query. Please configure in Vercel.");
        setLoading(false);
        return;
    }


    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          // [اصلاح شده] توکن همیشه باید شامل Bearer باشد
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Wait-For-Model': 'true'
        },
        body: JSON.stringify({
          inputs: input,
        }),
      });

      if (response.status === 401 || response.status === 403) {
           throw new Error("Authorization failed. Please check if VITE_HF_API_TOKEN is correct and has 'read' access to the model.");
      }
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: "Unknown error format" }));
        console.error("HF API Error Response:", errorBody);
        throw new Error(errorBody.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();

      console.log("HF API Success Response:", result);

      // --- پردازش پاسخ (بخش حیاتی) ---
      let formattedOutput = "Could not parse API response or model returned unexpected structure.";
      
      if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
          const prediction = result[0].find(p => p.label && (p.label === 'LABEL_1' || p.label.toLowerCase() === 'exploitable'));
          const score = prediction ? prediction.score : (result[0][0] ? 1.0 - result[0][0].score : 0);
          const probability = (score * 100).toFixed(1);

          formattedOutput = `[EXBERT_ANALYSIS]: Input processed. Exploitability Probability: ${probability}%.`;

      } else if (result.error) {
          formattedOutput = `[API_ERROR]: ${result.error}`;
          if (result.error.includes("currently loading") && result.estimated_time) {
              formattedOutput += ` Model is loading, please wait ~${Math.ceil(result.estimated_time)} seconds and try again.`;
          } else if (result.error.includes("trust_remote_code")) {
               formattedOutput += ` Model requires custom code ('modeling_exbert.py') to be present in your HF repository.`;
          }
      }
      
      setOutput(formattedOutput);
      startTyping(formattedOutput);

    } catch (err) {
      console.error("Error during API call:", err);
      setError(`Error connecting to HF: ${err.message}`);
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
      
      {/* نمایش هشدار توکن */}
      {(modelId === 'exbert' && !HF_API_TOKEN) && (
          <p className="text-xs text-cyber-yellow mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-500/50">
            ⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) not configured. Live analysis is disabled.
          </p>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          disabled={loading}
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

      {/* نمایش خطا */}
      {error && (
        <p className="mt-2 text-xs text-cyber-red p-2 bg-red-900/30 rounded border border-red-500/50">
          {error}
        </p>
      )}

      <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto">
        {/* نمایش خروجی تایپ شده */}
        {typedOutput ? (
          <span>
            {typedOutput}
            {/* نمایش کرسر فقط اگر تایپ در حال انجام است */}
            {!loading && typedOutput === output ? null : <span className="typing-cursor"></span>}
          </span>
        ) : (
            // اگر خطایی وجود ندارد و در حال لودینگ نیست، پیام آماده‌باش را نشان بده
            !error && !loading ? (
                 <span className="text-gray-500">MODEL.RESPONSE.STANDBY_</span>
            ) : null
        )}
      </div>
    </div>
  );
};

export default AIModelCard;
