"use client";

import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const [productDescription, setProductDescription] = useState("");
  const [language, setLanguage] = useState("english");
  
  // Input modes
  const [inputType, setInputType] = useState<"image" | "image_motion" | "video">("image");
  const [audioMode, setAudioMode] = useState<"voice" | "bgm">("voice");
  const [musicTrack, setMusicTrack] = useState<"upbeat" | "calm" | "corporate">("upbeat");
  
  // File states
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");

  const [script, setScript] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  
  const [videoUrl, setVideoUrl] = useState<string>("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (inputType === "image" || inputType === "image_motion") {
        setImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
      }
    }
  };

  const handleGenerateScript = async () => {
    if (!productDescription || ((inputType === "image" || inputType === "image_motion") ? !image : !videoFile)) {
      setError("Please provide a product description and an upload.");
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
    setStatusMessage(audioMode === "bgm" ? "Preparing background audio..." : "Generating voice narration...");
    
    try {
      const targetLang = audioMode === "bgm" ? "silent" : language;
      const response = await fetch(`${API_URL}/api/generate-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          script, 
          language: targetLang,
          audio_mode: audioMode === "bgm" ? "music" : "voice",
          music_track: audioMode === "bgm" ? musicTrack : null
        }),
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
    if (((inputType === "image" || inputType === "image_motion") && !image) || (inputType === "video" && !videoFile) || !audioBlob) {
      setError("Missing input file or audio.");
      return;
    }
    
    setError("");
    setIsGenerating(true);
    setStatusMessage("Preparing files...");
    
    try {
      let finalVideoFile = videoFile;
      
      if (inputType === "image_motion" && image) {
        setStatusMessage("Auto-generating motion video from your image (this may take 1-2 minutes)...");
        const motionFormData = new FormData();
        motionFormData.append("image", image);
        
        const motionResponse = await fetch(`${API_URL}/api/generate-motion-video`, {
          method: "POST",
          body: motionFormData,
        });
        
        if (!motionResponse.ok) {
          const errorData = await motionResponse.json().catch(() => null);
          throw new Error(errorData?.detail || "Automatic motion video generation is currently unavailable — all free providers are down or busy right now.");
        }
        
        const motionBlob = await motionResponse.blob();
        finalVideoFile = new File([motionBlob], "generated_motion.mp4", { type: "video/mp4" });
      }

      const formData = new FormData();
      if (inputType === "image" && image) {
        formData.append("image", image);
      } else if ((inputType === "video" || inputType === "image_motion") && finalVideoFile) {
        formData.append("video", finalVideoFile);
      }
      
      formData.append("audio", audioBlob);
      formData.append("highlights", JSON.stringify(highlights));
      
      setStatusMessage("Sending to server and rendering final video with FFmpeg (this may take a minute)...");
      const response = await fetch(`${API_URL}/api/generate-ad-video`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to generate video. Please try again.");
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
    setVideoFile(null);
    setVideoPreview("");
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
                
                {/* Input Toggle */}
                <div className="flex bg-neutral-800 rounded-lg p-1 flex-col md:flex-row gap-1">
                  <button 
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${inputType === "image" ? "bg-neutral-700 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                    onClick={() => setInputType("image")}
                  >
                    Use Photo (auto zoom effect)
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${inputType === "image_motion" ? "bg-purple-700 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                    onClick={() => setInputType("image_motion")}
                  >
                    Auto-generate motion with AI ✨
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${inputType === "video" ? "bg-neutral-700 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                    onClick={() => setInputType("video")}
                  >
                    Upload Your Own Video Clip
                  </button>
                </div>

                {inputType === "video" && (
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-sm text-purple-200">
                    <p className="mb-2 font-medium">💡 Generate a short video of your product using a free tool like:</p>
                    <div className="flex space-x-4">
                      <a href="https://klingai.com" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Kling AI</a>
                      <a href="https://lumalabs.ai/dream-machine" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Luma Dream Machine</a>
                      <a href="https://pika.art" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 underline">Pika</a>
                    </div>
                    <p className="mt-2 text-neutral-400 text-xs">Download the result and upload it below. We'll add the audio and text overlays automatically.</p>
                  </div>
                )}

                <div 
                  className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center min-h-64"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept={inputType === "image" || inputType === "image_motion" ? "image/*" : "video/*"}
                    onChange={handleFileUpload}
                  />
                  {(inputType === "image" || inputType === "image_motion") && imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg object-contain shadow-lg" />
                  ) : inputType === "video" && videoPreview ? (
                    <video src={videoPreview} className="max-h-64 rounded-lg object-contain shadow-lg" controls loop muted />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </div>
                      <p className="text-neutral-300 font-medium">Click to upload {inputType === "image" ? "product photo" : "product video"}</p>
                      <p className="text-neutral-500 text-sm mt-2">{inputType === "image" ? "JPG or PNG" : "MP4, WebM, etc. (max 50MB)"}</p>
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
                  disabled={(inputType === "image" ? !image : !videoFile) || !productDescription || isGenerating}
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
                    onClick={() => setStep(3)}
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
                <h2 className="text-2xl font-bold mb-4">Step 3: Review Audio</h2>
                
                <div className="flex bg-neutral-800 rounded-lg p-1 mb-6">
                  <button 
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${audioMode === "voice" ? "bg-neutral-700 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                    onClick={() => { setAudioMode("voice"); setAudioUrl(""); }}
                  >
                    Voice Narration
                  </button>
                  <button 
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${audioMode === "bgm" ? "bg-neutral-700 text-white shadow" : "text-neutral-400 hover:text-white"}`}
                    onClick={() => { setAudioMode("bgm"); setAudioUrl(""); }}
                  >
                    Background Music Only (Silent)
                  </button>
                </div>
                
                {audioMode === "bgm" && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-neutral-300 text-sm mb-6">
                    <p className="mb-3">Select a background music track. Voice narration will be skipped.</p>
                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
                      <label className="flex-1 flex items-center space-x-2 cursor-pointer bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-purple-500/50 transition-colors">
                        <input type="radio" name="music_track" value="upbeat" checked={musicTrack === "upbeat"} onChange={() => { setMusicTrack("upbeat"); setAudioUrl(""); }} className="text-purple-500 focus:ring-purple-500 bg-neutral-900 border-neutral-700" />
                        <span className="font-medium">Upbeat</span>
                      </label>
                      <label className="flex-1 flex items-center space-x-2 cursor-pointer bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-purple-500/50 transition-colors">
                        <input type="radio" name="music_track" value="calm" checked={musicTrack === "calm"} onChange={() => { setMusicTrack("calm"); setAudioUrl(""); }} className="text-purple-500 focus:ring-purple-500 bg-neutral-900 border-neutral-700" />
                        <span className="font-medium">Calm</span>
                      </label>
                      <label className="flex-1 flex items-center space-x-2 cursor-pointer bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-purple-500/50 transition-colors">
                        <input type="radio" name="music_track" value="corporate" checked={musicTrack === "corporate"} onChange={() => { setMusicTrack("corporate"); setAudioUrl(""); }} className="text-purple-500 focus:ring-purple-500 bg-neutral-900 border-neutral-700" />
                        <span className="font-medium">Corporate</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-48">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"></path></svg>
                  </div>
                  
                  {!audioUrl ? (
                    <button 
                      onClick={handleGenerateVoice}
                      disabled={isGenerating}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 px-6 rounded-lg transition-all"
                    >
                      {isGenerating ? "Processing..." : (audioMode === "voice" ? "Generate Voice" : "Prepare Audio")}
                    </button>
                  ) : (
                    <audio controls src={audioUrl} className="w-full max-w-md bg-neutral-900 rounded-full" />
                  )}
                </div>

                <div className="flex space-x-4">
                  <button 
                    onClick={handleGenerateVoice}
                    disabled={isGenerating || !audioUrl}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isGenerating ? "Processing..." : "Regenerate"}
                  </button>
                  <button 
                    onClick={() => setStep(4)}
                    disabled={!audioUrl}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve Audio
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VIDEO GENERATION (IDLE & IN-PROGRESS) */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-center py-8">
                <h2 className="text-3xl font-bold mb-2">Ready to Render</h2>
                <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                  Your script and audio are approved. Click below to generate the final video with visual effects and text overlays.
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
                    <video controls src={videoUrl} className="w-full aspect-video object-contain" poster={inputType === "image" ? imagePreview : undefined}></video>
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
