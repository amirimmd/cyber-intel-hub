import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react';

const AIModels = () => {
  const [selectedModel, setSelectedModel] = useState('ExBERT-Phase2');
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: 'VulnSight AI initialized. Select a model and provide a vulnerability description for analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const models = [
    { id: 'ExBERT-Phase2', name: 'ExBERT Baseline (Phase 2)', status: 'Stable' },
    { id: 'ExBERT-Phase3-V1', name: 'ExBERT Optimized (Phase 3)', status: 'Beta' },
    { id: 'ExBERT-Phase3-V2', name: 'ExBERT Experimental', status: 'Alpha' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const aiResponse = { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: `Analysis complete using [${selectedModel}]. Probability of exploitation: 85%. This appears to be a buffer overflow vulnerability.` 
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative">
      
      {/* Header */}
      <div className="h-16 border-b border-[#1f1f1f] flex items-center justify-between px-6 bg-[#0a0a0a]/90 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-500 w-5 h-5" />
          <span className="font-bold text-gray-200">AI Analyst</span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-[#111] border border-[#333] hover:border-cyan-500/50 px-4 py-2 rounded text-xs font-mono text-cyan-400 transition-all min-w-[240px] justify-between"
          >
            <span>{models.find(m => m.id === selectedModel)?.name}</span>
            <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-[280px] bg-[#111] border border-[#333] rounded shadow-2xl shadow-black z-50 overflow-hidden">
              {models.map(model => (
                <div 
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsDropdownOpen(false);
                  }}
                  className="px-4 py-3 hover:bg-[#1f1f1f] cursor-pointer border-b border-[#1f1f1f] last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-xs font-bold">{model.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      model.status === 'Stable' ? 'border-green-500/30 text-green-400' : 'border-yellow-500/30 text-yellow-400'
                    }`}>
                      {model.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono mt-1">{model.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#333]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded bg-purple-900/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}
            <div className={`max-w-[80%] p-4 rounded-lg text-sm leading-relaxed border ${
              msg.role === 'user' 
                ? 'bg-cyan-900/10 border-cyan-500/20 text-cyan-100 rounded-tr-none' 
                : 'bg-[#111] border-[#333] text-gray-300 rounded-tl-none font-mono'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded bg-cyan-900/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <User size={16} className="text-cyan-400" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a] shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Enter vulnerability description..."
            className="w-full bg-[#111] border border-[#333] rounded-lg pl-4 pr-12 py-4 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
          />
          <button onClick={handleSend} className="absolute right-2 top-2 p-2 text-cyan-400">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModels;
