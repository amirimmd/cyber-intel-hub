import React from 'react';

const AIModels = () => {
  return (
    <div className="w-full h-full flex flex-col bg-[#050505] relative overflow-hidden">
      {/* This iframe loads the Streamlit app hosted on Hugging Face Spaces.
        It provides the actual AI inference, model selection, and SHAP visualization.
      */}
      <iframe
        src="https://amirimmd-exbert-classifier-inference.hf.space"
        className="w-full h-full border-none"
        title="VulnSight AI Engine"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      />
      
      {/* Optional: Overlay loading state or styling can be added here if needed */}
    </div>
  );
};

export default AIModels;
