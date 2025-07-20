
import React, { useState, useEffect, useRef } from "react";
import { Document } from "@/entities/Document";
import { Conversation } from "@/entities/Conversation";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send,
  FileText,
  MessageSquare,
  Bot,
  User as UserIcon,
  ArrowLeft,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  StopCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";

const languageMap = {
    english: { name: 'English', code: 'en-US' },
    hindi: { name: 'Hindi', code: 'hi-IN' },
    tamil: { name: 'Tamil', code: 'ta-IN' },
    bengali: { name: 'Bengali', code: 'bn-IN' },
    malayalam: { name: 'Malayalam', code: 'ml-IN' }
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = false;
}

export default function Chat() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("english");
  const messagesEndRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voices, setVoices] = useState([]);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    loadInitialData();
    
    // Check speech recognition support
    if (recognition) {
        setSpeechRecognitionSupported(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputMessage(prev => prev + transcript);
            setIsListening(false);
        };
        recognition.onerror = (event) => {
            let message = "";
            switch (event.error) {
                case 'no-speech':
                    message = "I didn't hear anything. Please try again.";
                    break;
                case 'audio-capture':
                    message = "Couldn't capture audio. Please check your microphone.";
                    break;
                case 'not-allowed':
                    message = "Microphone access denied. Please allow it in browser settings.";
                    break;
                case 'aborted':
                    message = "Speech recognition aborted.";
                    break;
                case 'network':
                    message = "Network error during speech recognition.";
                    break;
                case 'bad-grammar':
                    message = "Bad grammar in speech recognition.";
                    break;
                case 'language-not-supported':
                    message = "Selected language not supported for speech recognition.";
                    break;
                default:
                    message = "An error occurred with speech recognition.";
                    console.error("Speech recognition error:", event.error);
                    break;
            }
            setFeedbackMessage(message);
            setTimeout(() => setFeedbackMessage(""), 4000); // Clear message after 4s
            setIsListening(false);
        };
        recognition.onend = () => {
            setIsListening(false);
        };
    }
    
    // Check speech synthesis support and load voices
    if (window.speechSynthesis) {
        setSpeechSynthesisSupported(true);
        
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
            }
        };
        
        // Load voices immediately if available
        loadVoices();
        
        // Also load when voices change (some browsers load async)
        window.speechSynthesis.onvoiceschanged = loadVoices;
        
        // Cleanup function
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (recognition) {
                recognition.stop();
            }
        };
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get document from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const documentId = urlParams.get('document');
    if (documentId && documents.length > 0) {
      const doc = documents.find(d => d.id === documentId);
      if (doc) {
        setSelectedDocument(doc);
        loadConversation(documentId);
      }
    }
  }, [documents]);

  useEffect(() => {
    if (recognition) {
      recognition.lang = languageMap[language]?.code || 'en-US';
    }
    // Cancel any ongoing speech when language changes
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    }
  }, [language]);

  const loadInitialData = async () => {
    try {
      const [userData, docsData] = await Promise.all([
        User.me().catch(() => null),
        Document.list('-created_date')
      ]);
      setUser(userData);
      
      // Only show completed documents
      const completedDocs = docsData.filter(doc => doc.processing_status === 'completed');
      setDocuments(completedDocs);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadConversation = async (documentId) => {
    try {
      const conversations = await Conversation.filter({ document_id: documentId }, '-created_date', 1);
      if (conversations.length > 0) {
        setConversation(conversations[0]);
        setMessages(conversations[0].messages || []);
        setLanguage(conversations[0].language || 'english');
      } else {
        setConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDocumentSelect = (documentId) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setSelectedDocument(doc);
      loadConversation(documentId);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedDocument || isLoading) return;

    // Stop any ongoing speech when sending a new message
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    }

    const userMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Generate AI response
      const prompt = `
You are an expert document analyst helping users understand their documents. 
The user has uploaded a ${selectedDocument.category} document titled "${selectedDocument.title}".

Document content:
${selectedDocument.original_text || selectedDocument.simplified_summary}

Previous conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

User question: ${userMessage.content}

Please provide a helpful, accurate response in ${languageMap[language]?.name || 'the specified language'}. 
Keep the language simple and avoid technical jargon. If the question is not related to the document, politely redirect them back to the document content.
`;

      const aiResponse = await InvokeLLM({ prompt });

      const assistantMessage = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);

      // Save or update conversation
      const conversationData = {
        document_id: selectedDocument.id,
        messages: updatedMessages,
        language
      };

      if (conversation) {
        await Conversation.update(conversation.id, conversationData);
      } else {
        const newConversation = await Conversation.create(conversationData);
        setConversation(newConversation);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your message right now. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (!recognition) return;
    setFeedbackMessage(""); // Clear any previous feedback

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setInputMessage(""); // Clear input before starting
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setFeedbackMessage("Could not start listening. Please try again.");
        setTimeout(() => setFeedbackMessage(""), 3000);
        setIsListening(false);
      }
    }
  };

  const speakMessage = (message) => {
    if (!window.speechSynthesis || !message || !message.content || !speechSynthesisSupported) {
        console.warn("Speech synthesis not supported or message content missing");
        return;
    }

    // If already speaking this message, stop it
    if (speakingMessageId === message.timestamp) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    try {
        const utterance = new SpeechSynthesisUtterance(message.content);
        const langCode = languageMap[language]?.code || 'en-US';
        
        let selectedVoice = voices.find(v => v.lang === langCode) || voices.find(v => v.lang.startsWith(langCode.split('-')[0])) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.lang = langCode;
        utterance.pitch = 1.1; // Make it slightly higher pitched
        utterance.rate = 1; // Normal speed
        utterance.volume = 1;

        utterance.onstart = () => {
            setSpeakingMessageId(message.timestamp);
        };
        
        utterance.onend = () => {
            setSpeakingMessageId(null);
        };
        
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            setSpeakingMessageId(null);
        };
        
        window.speechSynthesis.speak(utterance);
        
    } catch (error) {
        console.error("Error creating speech utterance:", error);
        setSpeakingMessageId(null);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      legal: "⚖️",
      medical: "🏥", 
      government: "🏛️",
      financial: "💰",
      employment: "💼",
      academic: "📚",
    };
    return icons[category] || "📄";
  };

  const getCategoryColor = (category) => {
    const colors = {
      legal: "from-red-500 to-pink-500",
      medical: "from-emerald-500 to-teal-500",
      government: "from-blue-500 to-indigo-500",
      financial: "from-yellow-500 to-orange-500",
      employment: "from-purple-500 to-violet-500",
      academic: "from-cyan-500 to-blue-500",
    };
    return colors[category] || "from-slate-500 to-gray-500";
  };

  const languages = [
    { value: "english", label: "English" },
    { value: "hindi", label: "हिंदी" },
    { value: "tamil", label: "தமிழ்" },
    { value: "bengali", label: "বাংলা" },
    { value: "malayalam", label: "മലയാളം" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="flex h-screen">
        {/* Sidebar - Document Selection */}
        <div className="w-80 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col">
          <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigate(createPageUrl("Dashboard"))}
                className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              </Button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Chat</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ask questions</p>
              </div>
            </div>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Your Documents
            </h3>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No completed documents yet</p>
              </div>
            ) : (
              documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedDocument?.id === doc.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700'
                      : 'bg-white/50 dark:bg-slate-800/30 hover:bg-white/80 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                  }`}
                  onClick={() => handleDocumentSelect(doc.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 bg-gradient-to-br ${getCategoryColor(doc.category)} rounded-lg flex items-center justify-center text-sm`}>
                      {getCategoryIcon(doc.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                        {doc.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs capitalize mt-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {doc.category}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedDocument ? (
            <>
              {/* Chat Header */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getCategoryColor(selectedDocument.category)} rounded-xl flex items-center justify-center`}>
                    <span className="text-lg">{getCategoryIcon(selectedDocument.category)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{selectedDocument.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ask me anything about this document
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Start a conversation
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Ask questions about your document and I'll help explain it
                      </p>
                      <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Try asking:</p>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500 dark:text-slate-400">"What are the key points?"</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">"What should I do next?"</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">"Explain this in simple terms"</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.role === 'user' ? 'order-2' : ''}`}>
                        <div className={`flex items-center gap-2 mb-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-r from-indigo-500 to-blue-500' 
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}>
                            {message.role === 'user' ? (
                              <UserIcon className="w-3 h-3 text-white" />
                            ) : (
                              <Bot className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {message.role === 'user' ? (user?.full_name?.split(' ')[0] || 'You') : 'CommonEase AI'}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl relative ${
                          message.role === 'user' 
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' 
                            : 'bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 pr-10'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          {message.role === 'assistant' && speechSynthesisSupported && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute bottom-1 right-1 w-8 h-8 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                                onClick={() => speakMessage(message)}
                                title={speakingMessageId === message.timestamp ? "Stop speaking" : "Listen to message"}
                            >
                                {speakingMessageId === message.timestamp ? (
                                    <StopCircle className="w-4 h-4 text-indigo-600" />
                                ) : (
                                    <Volume2 className="w-4 h-4" />
                                )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="max-w-[70%]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">CommonEase AI</span>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            <span className="text-slate-600 dark:text-slate-300">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800 p-6">
                <div className="flex gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={feedbackMessage || "Ask a question or use the mic..."}
                    className="flex-1 bg-white/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
                    disabled={isLoading || isListening}
                  />
                  {speechRecognitionSupported && (
                      <Button
                          variant="outline"
                          size="icon"
                          onClick={toggleListening}
                          className={`shrink-0 ${isListening ? 'bg-red-100 text-red-600 border-red-300 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700 animate-pulse' : 'bg-white/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                          disabled={isLoading}
                          title={isListening ? "Stop listening" : "Start voice input"}
                      >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                  )}
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="neon-button px-6 shrink-0"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  Select a Document
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Choose a document from the sidebar to start asking questions
                </p>
                {documents.length === 0 && (
                  <Button 
                    onClick={() => navigate(createPageUrl("Upload"))}
                    className="neon-button"
                  >
                    Upload Your First Document
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
