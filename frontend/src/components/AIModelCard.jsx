// frontend/src/components/AIModelCard.jsx
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// --- Configuration for Hugging Face Inference API ---
// نام مدل شما در هاگینگ فیس
const HF_MODEL_NAME = "amirimmd/ExBERT-Classifier-CVE";
// URL پایه برای Inference API
const API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL_NAME}`;

// --- خواندن توکن از متغیرهای محیطی ---
// !!! مهم: این توکن باید در Vercel به عنوان Environment Variable تعریف شود
// نام متغیر محیطی باید با VITE_ شروع شود تا Vite آن را بشناسد
// [اصلاح شده] استفاده از process.env به جای import.meta.env برای سازگاری بهتر
const HF_API_TOKEN = process.env.VITE_HF_API_TOKEN;

// [DEBUG] Check if token is loaded
if (!HF_API_TOKEN) {
  console.warn("⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) is missing!");
  // نمایش یک هشدار اولیه در کنسول؛ می‌توانید در UI هم پیامی نشان دهید
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
        // اگر متن خالی شد، نمایشگر را هم خالی کن
        setDisplayText('');
    }
  }, [text, isTyping, speed]);

  // تابع برای شروع تایپ
  const startTypingProcess = (newText) => {
    if(newText){
        setIsTyping(true); // Signal to start typing the new text
    } else {
        setIsTyping(false); // Stop typing if text is empty
        setDisplayText(''); // Clear display immediately
    }
  };


  return [displayText, startTypingProcess]; // برگرداندن تابع کنترل شده
};


const AIModelCard = ({ title, description, placeholder, modelId }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(''); // متن کامل پاسخ
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // State برای نگهداری خطا
  const [typedOutput, startTyping] = useTypewriter(output, 20); // هوک تایپ‌رایتر

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !HF_API_TOKEN) {
        if(!HF_API_TOKEN) setError("Hugging Face API Token is missing. Configure VITE_HF_API_TOKEN.");
        return;
    };

    setLoading(true);
    setOutput(''); // پاک کردن پاسخ قبلی
    setError(null); // پاک کردن خطای قبلی
    startTyping(''); // توقف و پاک کردن تایپ‌رایتر

    try {
      // ارسال درخواست به Hugging Face Inference API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
          // هدر برای مدل‌های سفارشی (ممکن است لازم باشد)
          'X-Wait-For-Model': 'true' // صبر می‌کند تا مدل لود شود اگر سرد است
        },
        body: JSON.stringify({
          inputs: input,
          // پارامترهای اضافی (اختیاری)
          // parameters: { truncation: true }
        }),
      });

      if (!response.ok) {
        // تلاش برای خواندن پیام خطا از بدنه پاسخ
        const errorBody = await response.json().catch(() => ({ error: "Unknown error format" }));
        console.error("HF API Error Response:", errorBody);
        // نمایش خطای سرور یا پیام عمومی
        throw new Error(errorBody.error || `API request failed with status ${response.status}`);
      }

      const result = await response.json();

      console.log("HF API Success Response:", result); // لاگ کردن پاسخ برای دیباگ

      // --- پردازش پاسخ ---
      // ساختار پاسخ API ممکن است متفاوت باشد. باید بر اساس مدل خود تنظیم کنید.
      // مثال: اگر مدل لیستی از لیست‌ها با لیبل و امتیاز برمی‌گرداند:
      // [[{ 'label': 'LABEL_0', 'score': 0.1 }, { 'label': 'LABEL_1', 'score': 0.9 }]]
      let formattedOutput = "Could not parse API response."; // پیام پیش‌فرض
      if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
          // پیدا کردن لیبل با بالاترین امتیاز (فرض می‌کنیم لیبل 1 نشان‌دهنده exploitability است)
          // نام لیبل‌ها باید دقیقاً با خروجی مدل شما مطابقت داشته باشد (مثلاً LABEL_0, LABEL_1)
          const prediction = result[0].find(p => p.label === 'LABEL_1'); // یا نام لیبل مثبت شما (مثلاً 'exploitable')
          const negativePrediction = result[0].find(p => p.label === 'LABEL_0'); // یا نام لیبل منفی شما (مثلاً 'not_exploitable')

          if(prediction){
              const probability = prediction.score;
              formattedOutput = `[EXBERT_ANALYSIS]: Input processed. Exploitability Probability: ${(probability * 100).toFixed(1)}%.`;
          } else if (negativePrediction) {
              // اگر لیبل مثبت پیدا نشد، از لیبل منفی استفاده می‌کنیم
               formattedOutput = `[EXBERT_ANALYSIS]: Input processed. Exploitability Probability: ${((1 - negativePrediction.score) * 100).toFixed(1)}%. (Inferred from negative label)`;
          } else {
              // اگر هیچ کدام از لیبل‌های مورد انتظار نبود
               formattedOutput = `[EXBERT_ANALYSIS]: Received unexpected labels: ${JSON.stringify(result[0])}`;
          }
      } else if (result.error) {
          formattedOutput = `[API_ERROR]: ${result.error}`;
          // بررسی خطای خاص مربوط به بارگذاری مدل
          if (result.error.includes("currently loading") && result.estimated_time) {
              formattedOutput += ` Model is loading, please wait ~${Math.ceil(result.estimated_time)} seconds and try again.`;
          } else if (result.error.includes("trust_remote_code")) {
               formattedOutput += ` Model requires 'trust_remote_code=True'. Inference API might not support this directly for free tier or requires configuration.`;
          }
      }
        else {
          // اگر فرمت پاسخ ناشناخته بود
          formattedOutput = `[UNEXPECTED_RESPONSE]: ${JSON.stringify(result).substring(0, 100)}...`;
      }


      setOutput(formattedOutput); // تنظیم متن کامل پاسخ
      startTyping(formattedOutput); // شروع تایپ پاسخ جدید

    } catch (err) {
      console.error("Error during API call:", err);
      setError(`Error: ${err.message}`); // نمایش خطا به کاربر
      setOutput(''); // پاک کردن خروجی در صورت خطا
      startTyping(''); // توقف تایپ
    } finally {
      setLoading(false);
      // setInput(''); // پاک کردن ورودی پس از ارسال (اختیاری)
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>
      {/* نمایش هشدار توکن */}
      {!HF_API_TOKEN && (
          <p className="text-xs text-cyber-yellow mb-2 p-2 bg-yellow-900/30 rounded border border-yellow-500/50">
            ⚠️ Hugging Face API Token (VITE_HF_API_TOKEN) not configured. AI analysis is disabled.
          </p>
      )}
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="4"
          className="cyber-textarea w-full"
          placeholder={placeholder}
          disabled={loading || !HF_API_TOKEN} // غیرفعال کردن اگر توکن نباشد
        />
        <button type="submit" className="cyber-button w-full mt-3 flex items-center justify-center" disabled={loading || !HF_API_TOKEN}>
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
                 <span className="text-gray-500">MODEL.RESPONSE_STANDBY...</span>
            ) : null // در غیر این صورت (خطا یا لودینگ)، چیزی نشان نده چون پیام خطا/لودینگ جداگانه داریم
        )}
      </div>
    </div>
  );
};

export default AIModelCard;

