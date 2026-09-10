"use client";

import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [productDescription, setProductDescription] = useState("");
  const [language, setLanguage] = useState("english");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [script, setScript] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  
  const [videoUrl, setVideoUrl] = useState<string>("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateScript = async () => {
    if (!productDescription || !image) {
      setError("Please provide a product description and an image.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setStatusMessage("Generating marketing script...");
    
    try {
      const response = await fetch(`${API_URL}/api/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_description: productDescription, language }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate script. Please try again.");
      }
      
      const data = await response.json();
      setScript(data.script);
      setHighlights(data.highlights);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVoice = async () => {
    setError("");
    setIsGenerating(true);
    setStatusMessage("Generating voice narration...");
    
    try {
      const response = await fetch(`${API_URL}/api/generate-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, language }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate voice. Please try again.");
      }
      
      const blob = await response.blob();
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!image || !audioBlob) {
      setError("Missing image or audio.");
      return;
    }
    
    setError("");
    setIsGenerating(true);
    setStatusMessage("Preparing files...");
    
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("audio", audioBlob);
      formData.append("highlights", JSON.stringify(highlights));
      
      setStatusMessage("Sending to server and rendering video with FFmpeg (this may take a minute)...");
      const response = await fetch(`${API_URL}/api/generate-ad-video`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate video. Please try again.");
      }
      
      setStatusMessage("Validating output...");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStep(5);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setProductDescription("");
    setImage(null);
    setImagePreview("");
    setScript("");
    setHighlights([]);
    setAudioBlob(null);
    setAudioUrl("");
    setVideoUrl("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            AI Ad Maker
          </h1>
          <p className="text-neutral-400 mt-3 text-lg">
            Create professional marketing videos in minutes
          </p>
        </header>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10">
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-950/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-center">
                <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold mb-4">Step 1: Product Details</h2>
                
                <div 
                  className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center min-h-64"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg object-contain shadow-lg" />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </div>
                      <p className="text-neutral-300 font-medium">Click to upload product photo</p>
                      <p className="text-neutral-500 text-sm mt-2">JPG or PNG</p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Product Description (1 line)</label>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="e.g. Handmade leather wallet with minimalist design, $45"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">Language</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="lang" value="english" checked={language === "english"} onChange={() => setLanguage("english")} className="text-purple-500 focus:ring-purple-500 bg-neutral-900 border-neutral-700" />
                        <span>English</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="lang" value="urdu" checked={language === "urdu"} onChange={() => setLanguage("urdu")} className="text-purple-500 focus:ring-purple-500 bg-neutral-900 border-neutral-700" />
                        <span>Urdu</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateScript}
                  disabled={!image || !productDescription || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8"
                >
                  {isGenerating ? (
                    <><span className="animate-spin mr-3 border-2 border-white/30 border-t-white rounded-full w-5 h-5"></span> {statusMessage}</>
                  ) : "Generate Ad"}
                </button>
              </div>
            )}

            {/* STEP 2: SCRIPT */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Step 2: Review Script</h2>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">Generated by AI</span>
                </div>
                
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider">Voiceover Script</h3>
                  <p className="text-lg text-neutral-200 leading-relaxed font-serif italic">"{script}"</p>
                </div>
                
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wider">On-Screen Text Highlights</h3>
                  <ul className="space-y-3">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-center bg-neutral-900 px-4 py-3 rounded-lg border border-neutral-800">
                        <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-400 mr-3">{i+1}</span>
                        <span className="text-white font-medium">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button 
                    onClick={handleGenerateScript}
                    disabled={isGenerating}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-all"
                  >
                    {isGenerating ? "Regenerating..." : "Try Again"}
                  </button>
                  <button 
                    onClick={handleGenerateVoice}
                    disabled={isGenerating}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Approve Script
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VOICE */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-bold mb-4">Step 3: Review Voice</h2>
                
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-48">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path></svg>
                  </div>
                  {audioUrl && (
                    <audio controls src={audioUrl} className="w-full max-w-md bg-neutral-900 rounded-full" />
                  )}
                </div>

                <div className="flex space-x-4">
                  <button 
                    onClick={handleGenerateVoice}
                    disabled={isGenerating}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-all"
                  >
                    {isGenerating ? "Regenerating..." : "Try Again"}
                  </button>
                  <button 
                    onClick={() => setStep(4)}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Approve Voice
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VIDEO GENERATION (IDLE & IN-PROGRESS) */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-center py-8">
                <h2 className="text-3xl font-bold mb-2">Ready to Render</h2>
                <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                  Your script and voice are approved. Click below to generate the final video with visual effects and text overlays.
                </p>
                
                {!isGenerating ? (
                  <button 
                    onClick={handleGenerateVideo}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-5 px-10 rounded-full shadow-[0_0_40px_-10px_rgba(219,39,119,0.5)] hover:shadow-[0_0_60px_-10px_rgba(219,39,119,0.7)] transition-all transform hover:scale-105 text-lg"
                  >
                    Generate Video
                  </button>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-t-4 border-purple-500 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-r-4 border-pink-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Processing...</h3>
                    <p className="text-purple-400 font-medium">{statusMessage}</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: RESULT */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">Ad Generation Complete!</h2>
                  <p className="text-neutral-400">Your marketing video is ready to share.</p>
                </div>
                
                <div className="bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
                  {videoUrl && (
                    <video controls src={videoUrl} className="w-full aspect-video object-contain" poster={imagePreview}></video>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <a 
                    href={videoUrl}
                    download="marketing-ad.mp4"
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-lg text-center shadow-lg transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download MP4
                  </a>
                  <button 
                    onClick={() => setStep(4)}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-4 px-6 rounded-lg transition-all"
                  >
                    Regenerate Video
                  </button>
                </div>
                
                <div className="pt-8 border-t border-neutral-800 text-center">
                  <button 
                    onClick={handleReset}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    Create Another Ad →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
