import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { useAudioChat } from './hooks/useAudioChat';

function App() {
  const {
    isConnected,
    isListening,
    error,
    disconnect,
    startListening,
    stopListening,
    checkPermissions,
  } = useAudioChat();
  
  const [isMuted, setIsMuted] = useState(false);
  const [showPermissionRequest, setShowPermissionRequest] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'ai' }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        const hasPermission = await checkPermissions();
        setPermissionGranted(hasPermission);
        setShowPermissionRequest(!hasPermission);
      } catch (error) {
        setShowPermissionRequest(true);
        setPermissionGranted(false);
      }
    };

    checkInitialPermission();
  }, [checkPermissions]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePermissionRequest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission
      setPermissionGranted(true);
      setShowPermissionRequest(false);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: 'Microphone access denied. Please enable it in your browser settings to use the app.', 
        sender: 'ai' 
      }]);
      setPermissionGranted(false);
    }
  };

  const toggleMicrophone = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    if (error) {
      setMessages(prev => [...prev, { text: `Error: ${error}`, sender: 'ai' }]);
    }
  }, [error]);

  if (showPermissionRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/30 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-8 text-center">
          <Mic className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Microphone Access Required</h2>
          <p className="text-white/80 mb-6">
            To use the AI Language Tutor, we need access to your microphone. This allows you to have voice conversations with your AI tutor.
          </p>
          <button
            onClick={handlePermissionRequest}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors duration-200"
          >
            Allow Microphone Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/30 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header with connection status */}
        <div className="p-6 text-center border-b border-white/10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-white/80 text-sm">
              {isConnected ? 'Connected' : 'Ready to connect'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Language Tutor</h1>
        </div>

        {/* Chat area */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 text-white/90'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Control panel */}
        <div className="p-6 bg-black/40">
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            
            <button
              onClick={toggleMicrophone}
              className={`p-6 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              disabled={!permissionGranted}
            >
              {isListening ? <PhoneOff size={32} /> : <Phone size={32} />}
            </button>

            <button
              onClick={toggleMicrophone}
              className={`p-4 rounded-full transition-all duration-200 ${
                isListening
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              disabled={!permissionGranted}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;