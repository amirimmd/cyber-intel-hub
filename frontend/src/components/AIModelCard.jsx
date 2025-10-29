// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration for Hugging Face Gradio Space API ---
// نام کاربری شما در Hugging Face
const HF_USER = "amirimmd"; 
// نام Space که شما ایجاد کردید
const HF_SPACE_NAME = "ExBERT-Classifier-Inference"; 

// [مهم]: آدرس API Space برای فراخوانی تابع predict در Gradio
// Gradio API از ساختار /run/predict برای فراخوانی تابع اصلی استفاده می کند.
const API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space/run/predict`; 

// --- خواندن توکن از متغیرهای محیطی ---
// توجه: ما از process.env استفاده می کنیم و فرض می کنیم Vercel آن را در Build Time تزریق می کند.
const HF_API_TOKEN = process.env.VITE_HF_API_TOKEN; 

// [DEBUG] Check if token is loaded
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
}

// Typewriter Hook (بدون تغییر)
const useTypewriter = (text, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const startTypingProcess = useCallback((newText) => {
    if(newText){
        setIsTyping(true);
        // تنظیم خروجی کامل برای استفاده در useEffect
        // استفاده از یک ترفند کوچک برای تغییر state تا useEffect trigger شود
        // اگر متن یکسان باشد، مستقیماً state را تغییر نمی دهیم
        if (newText === text) {
             setDisplayText(newText + ' ');
             setDisplayText(newText);
        }
        else {
             setDisplayText(newText);
        }
    } else {
        setIsTyping(false);
        setDisplayText('');
    }
  }, [text]); // dependency array includes text

  useEffect(() => {
    if (isTyping && text) {
      let i = 0;
      // مطمئن شویم که متن نمایش داده شده را از ابتدا شروع می کنیم
      setDisplayText('');
      
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
    } else if (!text && isTyping) {
        setIsTyping(false);
        setDisplayText('');
    }
  }, [text, isTyping, speed]); // Re-run when text changes

  // نکته: ما displayText را از useEffect می گیریم، اما تابع شروع را از useCallback
  return [displayText, startTypingProcess];
};


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typedOutput, startTyping] = useTypewriter(output, 20);

  // این تابع شبیه سازی است و فقط برای مدل های غیر از EXBERT استفاده می شود
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
    setOutput('');
    setError(null);
    startTyping('');

    // --- مدیریت مدل های شبیه سازی شده ---
    if (modelId !== 'exbert') {
      const response = simulateAnalysis(query, modelId);
      // شبیه سازی تاخیر شبکه
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOutput(response);
      startTyping(response);
      setLoading(false);
      return;
    }
    
    // --- اتصال واقعی به Gradio Space (فقط برای ExBERT) ---
    if (!HF_API_TOKEN) {
        setError("API Token Missing. Please configure VITE_HF_API_TOKEN.");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // بدنه درخواست استاندارد Gradio API: یک آرایه از ورودی های تابع پایتون شما
        body: JSON.stringify({
          data: [query], // تابع پایتون predict_exploitability یک ورودی (description) دارد
        }),
      });

      if (!response.ok) {
        // در صورت عدم موفقیت، سعی می کنیم پیام خطا را بخوانیم
        const errorText = await response.text(); // خواندن پاسخ به صورت متن
        console.error("HF API Error Text:", errorText);

        // تلاش برای استخراج پیام خطا از بدنه
        let errorMessage = `HTTP Error ${response.status}. Model may be loading.`;
        try {
             const errorJson = JSON.parse(errorText);
             if (errorJson.error) errorMessage = errorJson.error;
             if (errorText.includes("currently loading")) errorMessage = "Model is starting up (Cold Start). Please wait 30s and try again.";
        } catch {}

        throw new Error(errorMessage);
      }

      const result = await response.json();

      console.log("HF Gradio API Success Response:", result);

      // --- پردازش پاسخ Gradio ---
      // Gradio API پاسخ را به شکل: { "data": [خروجی تابع پایتون شما] } برمی گرداند
      let formattedOutput = "Error: Could not parse prediction result."; 
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          // خروجی شما یک رشته یا عدد است که توسط تابع پایتون predict_exploitability برگردانده می شود
          const rawPrediction = result.data[0]; 

          if (typeof rawPrediction === 'string') {
               // اگر خروجی نهایی پایتون یک رشته متنی است
               formattedOutput = rawPrediction;
          } else if (typeof rawPrediction === 'number' && rawPrediction >= 0 && rawPrediction <= 1) {
               // اگر خروجی یک عدد (احتمال) بین 0 و 1 است
               formattedOutput = `[EXBERT_REPORT]: Analysis complete. Exploitability Probability: ${(rawPrediction * 100).toFixed(1)}%.`;
          } else {
               formattedOutput = `[EXBERT_REPORT]: Analysis received. Raw output: ${JSON.stringify(rawPrediction)}`;
          }
      }

      setOutput(formattedOutput);
      startTyping(formattedOutput);

    } catch (err) {
      console.error("Error during API call:", err);
      setError(`API ERROR: ${err.message}`);
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
            {/* نمایش کرسر فقط اگر تایپ در حال انجام نیست و خروجی کامل است */}
            {!loading && typedOutput === output && output.length > 0 ? <span className="typing-cursor"></span> : null}
          </span>
        ) : (
            // اگر خطایی وجود ندارد و در حال لودینگ نیست، پیام آماده‌باش را نشان بده
            !error && !loading ? (
                 <span className="text-gray-500">MODEL.RESPONSE.STANDBY...</span>
            ) : null 
        )}
      </div>
    </div>
  );
};

export default AIModelCard;
