import { useState } from "react";

/**
 * Standalone MicComponent without external dependencies
 * This version includes inline icons and styles for easy embedding
 */

interface StandaloneMicComponentProps {
  className?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onResponseReceived?: (response: string) => void;
  size?: "small" | "medium" | "large";
  showStatus?: boolean;
}

export default function StandaloneMicComponent({
  className = "",
  onRecordingStart,
  onRecordingStop,
  onResponseReceived,
  size = "medium",
  showStatus = true
}: StandaloneMicComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("Ready to chat");

  // Size variants
  const sizeClasses = {
    small: "w-12 h-12 text-sm",
    medium: "w-16 h-16 text-base",
    large: "w-20 h-20 text-lg"
  };

  const iconSize = {
    small: "16",
    medium: "20", 
    large: "24"
  };

  // Inline SVG icons
  const MicIcon = () => (
    <svg width={iconSize[size]} height={iconSize[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <path d="M12 19v4"/>
      <path d="M8 23h8"/>
    </svg>
  );

  const MicOffIcon = () => (
    <svg width={iconSize[size]} height={iconSize[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12l1.27-1.27A5.99 5.99 0 0 0 19 12v-2"/>
      <path d="M12 1a3 3 0 0 0-3 3v8"/>
      <path d="M8 21h8"/>
      <path d="M12 17v4"/>
    </svg>
  );

  // Mock functions - in real implementation, these would connect to the backend
  const startVoiceChat = async () => {
    setStatus("Connecting...");
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // In the real implementation, this would:
      // 1. Connect to WebSocket
      // 2. Start audio recording
      // 3. Send audio to backend
      
      setIsRecording(true);
      setStatus("Listening - speak now");
      onRecordingStart?.();
      
      // Mock: Stop recording after 10 seconds for demo
      setTimeout(() => {
        stopVoiceChat();
      }, 10000);
      
    } catch (error) {
      console.error("Microphone access denied:", error);
      setStatus("Microphone permission required");
    }
  };

  const stopVoiceChat = () => {
    setIsRecording(false);
    setStatus("Processing...");
    onRecordingStop?.();
    
    // Mock response
    setTimeout(() => {
      setStatus("Ready to chat");
      if (onResponseReceived) {
        onResponseReceived("Mock AI response received");
      }
    }, 1500);
  };

  const handleClick = () => {
    if (isRecording) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} style={{ fontFamily: 'system-ui, sans-serif' }}>
      <button
        onClick={handleClick}
        className={`
          ${sizeClasses[size]}
          rounded-full border-none cursor-pointer
          transition-all duration-200 ease-in-out
          flex items-center justify-center
          font-semibold text-white
          shadow-lg hover:shadow-xl
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
          }
        `}
        style={{
          animation: isRecording ? 'pulse 1s infinite' : 'none'
        }}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? <MicOffIcon /> : <MicIcon />}
      </button>
      
      {showStatus && (
        <div className="text-center max-w-48">
          <p className="text-sm text-gray-600 margin-0">
            {status}
          </p>
          {isRecording && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex space-x-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-4 bg-red-500 rounded-full"
                    style={{
                      animation: `recording-bars 1s infinite ease-in-out`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes recording-bars {
          0%, 100% { height: 8px; }
          50% { height: 16px; }
        }
      `}</style>
    </div>
  );
}