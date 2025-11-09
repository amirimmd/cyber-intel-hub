// --- components/CopyButton.jsx ---
import React, { useState } from 'react';
import { Clipboard } from 'https://esm.sh/lucide-react@0.395.0'; 

// --- Helper Component: CopyButton ---
export const CopyButton = ({ textToCopy, isId = false }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation(); 
        try {
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed'; 
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy'); 
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500); 
        } catch (err) {
            console.error('Failed to copy text:', err);
            // Don't use alert()
            const messageBox = document.createElement('div');
            messageBox.textContent = 'Could not copy text. Please try manually.';
            messageBox.className = 'fixed bottom-4 right-4 bg-cyber-red text-dark-bg p-3 rounded-lg shadow-lg z-50';
            document.body.appendChild(messageBox);
            setTimeout(() => document.body.removeChild(messageBox), 3000);
        }
    };

    const buttonClass = isId ? 
        'ml-1 px-1 py-0.5 text-xs rounded transition-all duration-150' : 
        'ml-2 px-2 py-1 text-xs font-mono rounded-full transition-all duration-150 flex-shrink-0';
    
    const baseStyle = copied ? 
        'bg-cyber-green text-dark-bg shadow-lg shadow-cyber-green/50' : 
        'bg-gray-700/50 text-cyber-cyan hover:bg-cyber-cyan/30';

    return (
        <button 
            onClick={handleCopy} 
            title={isId ? `Copy ${textToCopy}` : "Copy full vulnerability description"}
            className={`flex items-center justify-center ${buttonClass} ${baseStyle}`}
        >
            {copied ? (isId ? 'OK' : 'COPIED!') : <Clipboard className="w-3 h-3 inline-block" />}
        </button>
    );
};