
import React, { useState, useCallback, useRef } from "react";
import { Document } from "@/entities/Document";
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, // Renamed to avoid conflict with default export 'Upload' component
  FileText, 
  Image, 
  Camera, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORIES = [
  { value: "legal", label: "Legal Documents", icon: "⚖️", description: "Contracts, FIRs, court notices" },
  { value: "medical", label: "Medical Documents", icon: "🏥", description: "Prescriptions, reports, scans" },
  { value: "government", label: "Government Forms", icon: "🏛️", description: "Schemes, applications, notices" },
  { value: "financial", label: "Financial Documents", icon: "💰", description: "Loan agreements, insurance" },
  { value: "employment", label: "Employment Papers", icon: "💼", description: "Contracts, offer letters" },
  { value: "academic", label: "Academic Papers", icon: "📚", description: "Research papers, articles" },
];

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi", label: "हिंदी" },
  { value: "tamil", label: "தமிழ்" },
  { value: "bengali", label: "বাংলা" },
  { value: "malayalam", label: "മലയാളം" },
];

const languageMap = {
    english: 'English',
    hindi: 'Hindi',
    tamil: 'Tamil',
    bengali: 'Bengali',
    malayalam: 'Malayalam'
};

export default function Upload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("english");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Get category from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && CATEGORIES.find(c => c.value === categoryParam)) {
      setCategory(categoryParam);
    }
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, []);

  const validateFile = (file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF, JPEG, or PNG file");
      return false;
    }
    
    if (file.size > maxSize) {
      setError("File size must be less than 10MB");
      return false;
    }
    
    setError("");
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraReady(true);
    } catch (err) {
      setError("Unable to access camera. Please ensure you've granted permission.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !isCameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setShowCamera(false);
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  React.useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  const processDocument = async () => {
    if (!selectedFile || !category) {
      setError("Please select a file and category");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setError("");

    try {
      // Upload file
      setProgress(20);
      const { file_url } = await UploadFile({ file: selectedFile });
      
      // Extract text from document
      setProgress(40);
      let extractedText = "";
      
      if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
        const extractResult = await ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              text_content: { type: "string", description: "Extracted text content from the document" }
            }
          }
        });
        
        if (extractResult.status === "success") {
          extractedText = extractResult.output.text_content || "";
        }
      }

      setProgress(60);

      // --- AI Prompt and Schema Generation based on Category ---
      let prompt = "";
      let response_json_schema = {};

      if (category === 'medical') {
        prompt = `
You are an expert medical document analyst. Analyze this medical document for a common person and provide:
1. A clear, simple summary in ${languageMap[language] || 'the specified language'}.
2. 3-5 key bullet points highlighting the most important information.
3. An estimated severity percentage with a brief explanation (e.g., "Severity: 75% - High. This indicates a condition that requires prompt medical attention.").
4. Practical, safe, and clear next steps for the user. IMPORTANT: Always advise the user to consult a qualified medical professional and that this is not a substitute for professional medical advice.

Document content:
${extractedText}

Make the language extremely simple and accessible. Avoid technical jargon.`;
        
        response_json_schema = {
          type: "object",
          properties: {
            simplified_summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            medical_severity: { type: "string", description: "The estimated severity, including percentage and a short description." },
            suggested_next_steps: { type: "string", description: "Clear next steps for the user, including consulting a doctor." }
          }
        };

      } else if (category === 'legal') {
        prompt = `
You are an expert legal document analyst. Analyze this legal document for a common person and provide:
1. A clear, simple summary in ${languageMap[language] || 'the specified language'}.
2. 3-5 key bullet points highlighting the most important information.
3. A summary of potentially applicable rights, laws, or legal sections relevant to the document's content.
4. Practical next steps the user might consider. IMPORTANT: Always include a disclaimer that you are an AI assistant, not a lawyer, and the user should consult with a qualified legal professional for advice.

Document content:
${extractedText}

Make the language extremely simple and accessible. Avoid technical jargon.`;
        
        response_json_schema = {
          type: "object",
          properties: {
            simplified_summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            legal_rights_summary: { type: "string", description: "A summary of relevant rights and laws." },
            suggested_next_steps: { type: "string", description: "Suggested next steps, including consulting a lawyer." }
          }
        };

      } else { // Generic prompt for other categories
        prompt = `
You are an expert document simplifier. Analyze this ${category} document and provide:
1. A clear, simple summary in ${languageMap[language] || 'the specified language'}
2. 3-5 key bullet points highlighting the most important information

Document content:
${extractedText}

Make the language simple and accessible for common people. Avoid technical jargon.`;

        response_json_schema = {
          type: "object",
          properties: {
            simplified_summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } }
          }
        };
      }

      const aiResponse = await InvokeLLM({
        prompt,
        response_json_schema
      });

      setProgress(80);

      // Save document to database
      const documentData = {
        title: selectedFile.name,
        category,
        file_url,
        original_text: extractedText,
        simplified_summary: aiResponse.simplified_summary,
        key_points: aiResponse.key_points || [],
        language,
        processing_status: "completed",
        file_type: selectedFile.type,
        medical_severity: aiResponse.medical_severity || null,
        legal_rights_summary: aiResponse.legal_rights_summary || null,
        suggested_next_steps: aiResponse.suggested_next_steps || null,
      };

      await Document.create(documentData);
      
      setProgress(100);
      
      // Navigate to dashboard after successful upload
      setTimeout(() => {
        navigate(createPageUrl("Dashboard"));
      }, 1000);
      
    } catch (error) {
      setError("Failed to process document. Please try again.");
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryDetails = (value) => {
    return CATEGORIES.find(c => c.value === value);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="shrink-0 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Upload Document
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Upload any document for AI-powered simplification
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Progress */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6"
            >
              <Card className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Processing Document</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">AI is analyzing your document...</p>
                    </div>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">{progress}% complete</div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!isProcessing && (
          <>
            {/* Category Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <Card className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Document Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CATEGORIES.map((cat) => (
                      <motion.div
                        key={cat.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          category === cat.value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/30'
                        }`}
                        onClick={() => setCategory(cat.value)}
                      >
                        <div className="text-2xl mb-2">{cat.icon}</div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{cat.label}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{cat.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* File Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Card className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Upload Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Drag & Drop */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <UploadIcon className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Drop files here</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        or click to browse
                      </p>
                      <Button variant="outline" className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">
                        Select File
                      </Button>
                    </div>

                    {/* Camera Capture */}
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-all">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Use Camera</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Take a photo of your document
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setShowCamera(true)}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Open Camera
                      </Button>
                    </div>
                  </div>

                  {/* Selected File Display */}
                  <AnimatePresence>
                    {selectedFile && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                            {selectedFile.type === 'application/pdf' ? (
                              <FileText className="w-5 h-5 text-white" />
                            ) : (
                              <Image className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">{selectedFile.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Language Selection & Process Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Preferred Language for Summary
                      </label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={processDocument}
                      disabled={!selectedFile || !category}
                      className="neon-button px-8 py-6 text-lg w-full md:w-auto"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Process Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {/* Camera Modal */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCamera(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Capture Document</h3>
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCamera(false)}
                    className="flex-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="flex-1 neon-button"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
