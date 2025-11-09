// --- components/ai/AIModels.jsx ---
// (شامل کامپوننت‌های AIModels, ShapVisualization, MessageComponent, ModelSidebar)

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  BrainCircuit, ShieldAlert, Swords, 
  Loader2, Filter, DatabaseZap, Clipboard, 
  User, Database, BarChart2,
  Swords as SwordsIcon,
  Menu, // For desktop sidebar
  X, // For closing sidebar
  Send, // Chat send button
  Bot, // AI icon
  ChevronDown, // For mobile model selector
  Rss, // For NVD Tab
  FileCode // For ExploitDB Tab
} from 'https://esm.sh/lucide-react@0.395.0'; 

// --- [START] Logic from former AIModelCard ---
// This logic is now used by the new AIModels chat component
const HF_USER = "amirimmd";
const HF_SPACE_NAME = "ExBERT-Classifier-Inference";
const BASE_API_URL = `https://${HF_USER}-${HF_SPACE_NAME}.hf.space`;
const API_PREFIX = "/gradio_api";
const QUEUE_JOIN_URL = `${BASE_API_URL}${API_PREFIX}/queue/join`;
const QUEUE_DATA_URL = (sessionHash) => `${BASE_API_URL}${API_PREFIX}/queue/data?session_hash=${sessionHash}`;
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || ""; 

// Session hash generator
const generateSessionHash = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Typewriter hook
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

// Simulation function for 'other' model
const simulateAnalysis = (query, modelId) => {
    let simulatedResponse = '';
    switch (modelId) {
      // 'xai' is now handled by its own function
      case 'other': simulatedResponse = `[SIMULATED_GENERAL_REPORT]:\nQuery processed by General Purpose Model.\nInput Length: ${query.length} chars.\nStatus: OK`; break;
      default: simulatedResponse = "ERROR: Simulated model not found.";
    }
    return simulatedResponse;
};
// --- [END] Logic from former AIModelCard ---


// --- [NEW] SHAP Visualization Component ---
const ShapVisualization = ({ shapData }) => {
    if (!shapData || shapData.length === 0) return null;

    // 1. Find min/max absolute values for normalization
    let maxAbsVal = 0;
    shapData.forEach(([, val]) => {
        if (Math.abs(val) > maxAbsVal) {
            maxAbsVal = Math.abs(val);
        }
    });
    
    if (maxAbsVal === 0) maxAbsVal = 1; // Avoid division by zero

    const getColor = (value) => {
        // Opacity is scaled from 0% to 80%
        const alpha = Math.min(Math.abs(value) / maxAbsVal, 1.0) * 0.8; 
        if (value > 0) { // High Attention (Red, predicts Label 1/2)
            return `rgba(255, 0, 0, ${alpha})`;
        } else if (value < 0) { // Low Attention (Green, predicts Label 0)
            return `rgba(0, 255, 0, ${alpha})`;
        }
        return 'rgba(255, 255, 255, 0.05)'; // Neutral (near zero)
    };

    return (
        <div className="mt-3 p-2 bg-dark-bg/50 rounded border border-gray-700">
            <p className="text-xs font-bold text-gray-400 mb-2">XAI - SHAP Word Importance:</p>
            <div className="flex flex-wrap" style={{ gap: '4px' }}>
                {shapData.map(([token, value], index) => (
                    <span 
                        key={index} 
                        title={`SHAP: ${value.toFixed(4)}`}
                        className="p-1 rounded"
                        // Add a space for readability if the token isn't punctuation
                        style={{ backgroundColor: getColor(value), marginRight: '4px', marginBottom: '4px' }}
                    >
                        {token}
                    </span>
                ))}
            </div>
            <div className="flex justify-between text-xs mt-2 text-gray-500">
                <span><span className="w-3 h-3 inline-block rounded-sm bg-cyber-green/50 mr-1 align-middle"></span> Low (Label 0)</span>
                <span><span className="w-3 h-3 inline-block rounded-sm bg-cyber-red/50 mr-1 align-middle"></span> High (Label 1/2)</span>
            </div>
        </div>
    );
};


// --- [START] New AIModels Chat Component ---
export const AIModels = ({ setActiveTab }) => {
    const [activeModel, setActiveModel] = useState('exbert');
    const [messages, setMessages] = useState([
        { id: 'welcome', sender: 'ai', model: 'exbert', text: ':: CONNECTION ESTABLISHED ::\nWelcome to the Intelligent Analysis Unit. Select a model and submit your query.', shapData: null }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // Sidebar is open by default on desktop
    const [sidebarOpen, setSidebarOpen] = useState(true); 
    // Mobile model selector is closed by default
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false); 
    const [statusText, setStatusText] = useState(''); // For queue status

    const eventSourceRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Typewriter hook for the incoming message
    const [typedMessage, startTypingProcess, isTyping] = useTypewriter('', 20);
    const [lastAiMessageText, setLastAiMessageText] = useState('');
    // [NEW] State to hold SHAP data while text is typing
    const [pendingShapData, setPendingShapData] = useState(null);
    const prevIsTyping = useRef(false);

    const models = {
      'exbert': { title: 'MODEL::EXBERT_', description: 'Exploitability Probability Analysis' },
      'xai': { title: 'MODEL::EXBERT.XAI_', description: '[SIMULATED] Explainable AI (SHAP)' },
      'other': { title: 'MODEL::GENERAL.PURPOSE_', description: '[SIMULATED] General Purpose Model' },
    };

    // Effect to add the message to the list after typing is complete
    useEffect(() => {
        if (prevIsTyping.current && !isTyping && lastAiMessageText) {
            const aiMessage = { 
                id: Date.now(), 
                sender: 'ai', 
                model: activeModel, 
                text: lastAiMessageText,
                shapData: pendingShapData // [NEW] Add pending SHAP data
            };
            setMessages(prev => [...prev, aiMessage]);
            setLastAiMessageText('');
            setPendingShapData(null); // [NEW] Clear pending data
        }
        prevIsTyping.current = isTyping;
    }, [isTyping, lastAiMessageText, activeModel, startTypingProcess, pendingShapData]); // [NEW] Add dependency

    // Effect to auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typedMessage]); // Scroll on new message or new typed char

    // Cleanup EventSource on unmount
    useEffect(() => {
      return () => {
        if (eventSourceRef.current) {
          console.log("Closing existing EventSource connection on component unmount.");
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }, []);

    // [NEW] Simulation function for XAI
    const simulateXaiAnalysis = (query) => {
        const tokens = query.split(/\s+/).filter(Boolean); // Split by space and remove empty
        // 60% chance of Label 1
        const label = Math.random() > 0.4 ? "1" : "0"; 
        
        // [MODIFIED] Logical probability based on label
        let probability;
        if (label === "1") {
            // High probability for high-risk label
            probability = Math.random() * (0.98 - 0.7) + 0.7; // 70%-98%
        } else {
            // Low probability for low-risk label
            probability = Math.random() * (0.40 - 0.05) + 0.05; // 5-40%
        }
        
        const shapData = tokens.map(token => {
            // Generate a random SHAP value. 
            // If Label 1, bias towards positive. If 0, bias towards negative.
            let shapVal = (Math.random() - 0.5) * 2; // -1.0 to 1.0
            if (label === "1") {
                shapVal = (Math.random() - 0.3) * 1.5; // Biased positive
            } else {
                shapVal = (Math.random() - 0.7) * 1.5; // Biased negative
            }
            // Simple keyword check
            if (token.toLowerCase().match(/vulnerability|exploit|rce|cve|buffer|overflow/)) shapVal = 0.9 + Math.random() * 0.1;
            if (token.toLowerCase().match(/the|a|is|and|of|for/)) shapVal = (Math.random() - 0.5) * 0.1; // Low impact for common words
            
            return [token, parseFloat(shapVal.toFixed(4))];
        });

        const text = `[XAI_REPORT]:\nPredicted Label: ${label}\nProbability: ${probability.toFixed(3)}`;
        return { text, shapData };
    };

    // Send message function (combined logic from AIModelCard)
    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setLoading(true);
        setInput('');
        setStatusText('');
        if(inputRef.current) inputRef.current.style.height = 'auto'; // Reset textarea height
        
        const newUserMessage = { id: Date.now(), sender: 'user', text: query, model: activeModel };
        setMessages(prev => [...prev, newUserMessage]);
        
        if (eventSourceRef.current) {
            console.log("Closing previous EventSource before new request.");
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // --- Simulation Logic ---
        if (activeModel === 'xai') { // [NEW] Handle XAI
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
            const { text, shapData } = simulateXaiAnalysis(query);
            setLastAiMessageText(text);
            setPendingShapData(shapData); // [NEW]
            startTypingProcess(text);
            setLoading(false);
            return;
        }
        if (activeModel === 'other') { // [CHANGED]
            await new Promise(resolve => setTimeout(resolve, 1000));
            const response = simulateAnalysis(query, activeModel);
            setLastAiMessageText(response);
            setPendingShapData(null); // No SHAP data for this model
            startTypingProcess(response);
            setLoading(false);
            return;
        }
        
        // --- Real ExBERT Logic (/queue/join) ---
        const sessionHash = generateSessionHash(); 
        
        try {
            console.log(`Step 1: Joining Gradio Queue at ${QUEUE_JOIN_URL}...`);
            const joinHeaders = {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            };
            const payload = {
                "data": [query],
                "event_data": null,
                "fn_index": 2,       
                "trigger_id": 12,    
                "session_hash": sessionHash
            };

            const joinResponse = await fetch(QUEUE_JOIN_URL, {
                method: 'POST',
                headers: joinHeaders, 
                body: JSON.stringify(payload) 
            });

            if (!joinResponse.ok) {
                 const errorText = await joinResponse.text();
                 console.error("Queue Join Error:", joinResponse.status, errorText);
                 let detailedError = `Failed to join queue: ${joinResponse.status}.`;
                 if (joinResponse.status === 404) {
                     detailedError = "API ERROR: 404 Not Found. Check Space URL and /queue/join endpoint.";
                 }
                 throw new Error(detailedError);
            }

            const joinResult = await joinResponse.json();
            
            if (!joinResult.event_id) {
                 if (joinResult.error) { throw new Error(`Queue join returned error: ${joinResult.error}`); }
                 throw new Error("Failed to get event_id from queue join.");
            }
            console.log(`Step 2: Joined queue successfully. Listening for session ${sessionHash}...`);

            const dataUrl = QUEUE_DATA_URL(sessionHash);
            eventSourceRef.current = new EventSource(dataUrl); 

            eventSourceRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    switch (message.msg) {
                        case "process_starts":
                            setStatusText("Processing started...");
                            break;
                        case "process_completed":
                            if (message.success && message.output && message.output.data && message.output.data.length > 0) {
                                const rawPrediction = message.output.data[0];
                                const formattedOutput = `[EXBERT_REPORT]:\n${rawPrediction}`;
                                setLastAiMessageText(formattedOutput);
                                setPendingShapData(null); // ExBERT has no SHAP data
                                startTypingProcess(formattedOutput);
                            } else {
                                const errorMsg = message.output?.error || "Unknown server processing error.";
                                setLastAiMessageText(`Processing failed: ${errorMsg}`);
                                startTypingProcess(`Processing failed: ${errorMsg}`);
                            }
                            if(eventSourceRef.current) eventSourceRef.current.close();
                            eventSourceRef.current = null;
                            setLoading(false);
                            setStatusText('');
                            break;
                         case "queue_full":
                              const queueError = "API Error: The queue is full, please try again later.";
                              setLastAiMessageText(queueError);
                              startTypingProcess(queueError);
                              if(eventSourceRef.current) eventSourceRef.current.close();
                              eventSourceRef.current = null;
                              setLoading(false);
                              setStatusText('Queue Full.');
                              break;
                         case "estimation":
                              const queuePosition = message.rank !== undefined ? message.rank + 1 : '?';
                              const queueSize = message.queue_size !== undefined ? message.queue_size : '?';
                              const eta = message.rank_eta !== undefined ? message.rank_eta.toFixed(1) : '?';
                              const waitMsg = `In queue (${queuePosition}/${queueSize}). Est. wait: ${eta}s...`;
                              setStatusText(waitMsg);
                              break;
                         case "close_stream":
                              if(eventSourceRef.current) eventSourceRef.current.close();
                              eventSourceRef.current = null;
                              if (loading) { 
                                  setLoading(false);
                                  if (!lastAiMessageText && !isTyping) {
                                      const closeError = "Stream closed unexpectedly before result.";
                                      setLastAiMessageText(closeError);
                                      startTypingProcess(closeError);
                                  }
                              }
                              break;
                        default:
                            break;
                    }
                } catch (parseError) {
                    console.warn("Could not parse SSE message:", event.data);
                }
            };

            eventSourceRef.current.onerror = (error) => {
                let errorMsg = "Error connecting to API stream.";
                 if (!navigator.onLine) {
                     errorMsg += " Check your network connection.";
                 } else {
                     errorMsg += " Could not maintain connection. Check Space status/logs."; 
                 }
                setLastAiMessageText(errorMsg);
                startTypingProcess(errorMsg);
                 if(eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null;
                setLoading(false);
                setStatusText('Connection Error.');
            };

        } catch (err) {
            let displayError = err.message || "An unknown error occurred.";
            if (err.message.includes("Failed to fetch")) {
                displayError = "API ERROR: Network error or CORS issue. Check browser console and Space status.";
            } else if (err.message.includes("503")) {
                 displayError = "API ERROR: 503 Service Unavailable. The Space might be sleeping/overloaded. Wait and retry.";
            }
           setLastAiMessageText(displayError);
           startTypingProcess(displayError);
           setLoading(false);
           setStatusText('Failed to connect.');
            if (eventSourceRef.current) {
               eventSourceRef.current.close();
               eventSourceRef.current = null;
            }
        }
    };
    
    // Internal component for rendering messages
    const MessageComponent = ({ msg, isTyping = false, colorOverride = '' }) => {
        const isAi = msg.sender === 'ai';

        // [MODIFIED] Logic for coloring text output (for ExBERT and XAI)
        const labelMatch = msg.text.match(/Predicted Label: (\d)/);
        const label = labelMatch ? labelMatch[1] : null;
        
        let labelColor = '';
        if (msg.model === 'exbert' || msg.model === 'xai') {
            if (label === '0') labelColor = 'text-cyber-green';
            // Label 1 and 2 are red
            else if (label === '1' || label === '2') labelColor = 'text-cyber-red';
        }
        
        const finalColor = colorOverride || labelColor;

        return (
            <div className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
                <div className={`flex max-w-xs md:max-w-md lg:max-w-2xl ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAi ? 'bg-cyber-card text-cyber-green' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    {/* Message Text */}
                    <div className={`mx-3 rounded-lg p-3 ${isAi ? 'bg-cyber-card' : 'bg-cyber-green text-dark-bg'}`}>
                        {isAi && (
                            <span className="text-xs font-bold text-cyber-green block mb-1">
                                {models[msg.model]?.title || 'AI Model'}
                            </span>
                        )}
                        <p className={`text-sm whitespace-pre-wrap break-words ${finalColor}`}>
                            {msg.text}
                            {isTyping && <span className="typing-cursor"></span>}
                        </p>
                        {/* [NEW] Render SHAP visualization if data exists and typing is done */}
                        {!isTyping && msg.shapData && <ShapVisualization shapData={msg.shapData} />}
                    </div>
                </div>
            </div>
        );
    };

    // Internal component for Desktop Sidebar
    const ModelSidebar = () => (
        <div className={`hidden md:flex flex-col flex-shrink-0 bg-cyber-card border-r border-cyber-cyan/20 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-72 p-4' : 'w-0 p-0'}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white whitespace-nowrap">Select Model</h3>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            <div className="flex flex-col space-y-2">
                {Object.keys(models).map(key => (
                    <button
                        key={key}
                        onClick={() => {
                            setActiveModel(key);
                            // Start new conversation on model switch
                            setMessages([
                                { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: Model switched to ${models[key].title} ::\nReady for query...`, shapData: null }
                            ]);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${activeModel === key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}`}
                    >
                        <span className="font-bold block">{models[key].title}</span>
                        <span className="text-xs text-gray-400">{models[key].description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
    // Handle textarea auto-resize
    const handleInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    };

    // [MODIFIED] Removed fixed height h-[85vh] to allow natural flow on mobile
    return (
        <section id="ai-models-section" className="mb-12">
            <div className="flex flex-col md:flex-row md:h-[85vh] bg-cyber-card border border-solid border-cyber-cyan/30 rounded-2xl animate-border-pulse overflow-hidden shadow-lg shadow-cyber-green/10">
                
                {/* --- Sidebar (Desktop) --- */}
                <ModelSidebar />

                {/* --- Main Chat Area --- */}
                {/* [MODIFIED] Added min-h-[70vh] for mobile to ensure it fills most of the screen */}
                <div className="flex-1 flex flex-col h-full min-h-[70vh] md:min-h-0 bg-dark-bg/50">
                    
                    {/* Chat Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-cyber-cyan/20 bg-cyber-card">
                        {/* Desktop: Sidebar Toggle Button */}
                        <button onClick={() => setSidebarOpen(true)} className={`hidden md:block text-cyber-cyan hover:text-cyber-green ${sidebarOpen ? 'hidden' : ''}`}>
                            <Menu size={24} />
                        </button>
                        
                        {/* Mobile: Model Selector */}
                        <div className="relative md:hidden">
                            <button onClick={() => setModelSelectorOpen(o => !o)} className="flex items-center text-lg font-bold text-white">
                                {models[activeModel].title}
                                <ChevronDown size={20} className={`ml-1 transition-transform ${modelSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Mobile: Model Dropdown Menu */}
                            {modelSelectorOpen && (
                                <div className="absolute top-full left-0 mt-2 w-60 bg-cyber-card border border-cyber-cyan/30 rounded-lg shadow-lg z-20">
                                    {Object.keys(models).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setActiveModel(key);
                                                setModelSelectorOpen(false);
                                                // Start new conversation
                                                setMessages([
                                                    { id: 'welcome-' + key, sender: 'ai', model: key, text: `:: Model switched to ${models[key].title} ::\nReady for query...`, shapData: null }
                                                ]);
                                            }}
                                            className={`w-full text-left p-3 transition-colors duration-150 ${activeModel === key ? 'bg-cyber-green/20 text-cyber-green' : 'text-cyber-text hover:bg-gray-800/50'}`}
                                        >
                                            <span className="font-bold block">{models[key].title}</span>
                                            <span className="text-xs text-gray-400">{models[key].description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Desktop: Model Title */}
                        <div className="hidden md:block text-center">
                            <h3 className="text-lg font-bold text-white">{models[activeModel].title}</h3>
                            <p className="text-xs text-gray-400">{models[activeModel].description}</p>
                        </div>
                        
                        {/* Spacer */}
                        <div className="w-8">
                            {/* <User size={24} className="text-cyber-cyan" /> */}
                        </div>
                    </div>

                    {/* Message List */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 scroll-smooth md:pb-0 pb-32"> {/* [MODIFIED] Added pb-32 for mobile to clear fixed input */}
                        {messages.map(msg => (
                            <MessageComponent key={msg.id} msg={msg} />
                        ))}
                        {/* Typing message */}
                        {isTyping && (
                            <MessageComponent 
                                msg={{ id: 'typing', sender: 'ai', model: activeModel, text: typedMessage }} 
                                isTyping={true} 
                                // [NEW] Pass color override based on the full text being typed
                                colorOverride={
                                    (lastAiMessageText.includes('Predicted Label: 0')) ? 'text-cyber-green' :
                                    (lastAiMessageText.includes('Predicted Label: 2') || lastAiMessageText.includes('Predicted Label: 1')) ? 'text-cyber-red' : ''
                                }
                            />
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {/* [MODIFIED] Added fixed positioning for mobile, relative for desktop */}
                    <div className="flex-shrink-0 p-4 border-t border-cyber-cyan/20 bg-dark-bg md:relative fixed bottom-16 left-0 right-0 w-full">
                        {/* Queue Status */}
                        { (loading || statusText) && (
                            <div className="text-xs text-cyber-cyan mb-2 flex items-center">
                                <Loader2 size={14} className="animate-spin mr-2" />
                                {statusText || 'Processing...'}
                            </div>
                        )}
                        <div className="flex items-end space-x-3">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onInput={handleInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows="1"
                                className="cyber-textarea w-full resize-none max-h-32"
                                placeholder="Enter query for analysis..."
                                disabled={loading}
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={loading || !input.trim()}
                                className="cyber-button !w-auto px-4 py-3 rounded-lg flex-shrink-0"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Send size={20} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};