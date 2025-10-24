    // frontend/src/components/AIModelCard.jsx
    import React, { useState, useRef, useEffect } from 'react';
    import { Loader2 } from 'lucide-react';
    
    // Typewriter Hook
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
        }
      }, [text, isTyping, speed]);
    
      return [displayText, setIsTyping];
    };
    
    const AIModelCard = ({ title, description, placeholder, modelId }) => {
      const [input, setInput] = useState('');
      const [output, setOutput] = useState('');
      const [loading, setLoading] = useState(false);
      const [typedOutput, startTyping] = useTypewriter(output, 20);
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
    
        setLoading(true);
        setOutput(''); // Clear previous output
        
        // --- API Call Simulation ---
        // In a real app, you would make an API call to your AI model here
        // await fetch('/api/query-model', { method: 'POST', body: JSON.stringify({ model: modelId, text: input }) })
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    
        let simulatedResponse = '';
        switch (modelId) {
          case 'exbert':
            simulatedResponse = `[EXBERT_REPORT]: Analysis of "${input.substring(0, 20)}..." completed. Threat probability: 82.1%. Detected indicators: 'SQL_INJECTION_PATTERN', 'AUTH_BYPASS_ATTEMPT'. Recommended action: BLOCK_IP.`;
            break;
          case 'xai':
            simulatedResponse = `[EXBERT.XAI_REPORT]: Threat identified. EXPLANATION: Model attention focused on token 'OR 1=1' (weight: 0.95) and 'admin' (weight: 0.7). Decision trace points to 'CLASSIC_SQLI' signature.`;
            break;
          case 'other':
            simulatedResponse = `[GENERAL_MODEL_LOG]: Input string length: ${input.length} bytes. Token count: ${input.split(' ').length}. Hash signature: ${Math.random().toString(16).substring(2, 10)}. Operational status: NOMINAL.`;
            break;
          default:
            simulatedResponse = "ERROR: Model not found.";
        }
        
        setOutput(simulatedResponse);
        startTyping(true);
        setLoading(false);
        setInput('');
      };
    
      return (
        <div className="bg-gray-900 rounded-lg p-5 shadow-inner shadow-cyber-green/10 border border-cyber-green/20 flex flex-col h-full">
          <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
          <p className="text-sm text-gray-400 mb-4 flex-grow">{description}</p>
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
          <div className="mt-4 bg-dark-bg rounded-lg p-3 text-cyber-green text-sm min-h-[100px] border border-cyber-green/30 overflow-auto">
            {output ? (
              <span>
                {typedOutput}
                {loading || typedOutput === output ? null : <span className="typing-cursor"></span>}
              </span>
            ) : (
              <span className="text-gray-500">MODEL.RESPONSE_STANDBY...</span>
            )}
          </div>
        </div>
      );
    };
    
    export default AIModelCard;
    

