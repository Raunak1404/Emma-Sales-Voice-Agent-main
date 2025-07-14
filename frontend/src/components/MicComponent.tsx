import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

interface MicComponentProps {
  /** Custom styling classes */
  className?: string;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops */
  onRecordingStop?: () => void;
  /** Callback when voice response is received */
  onResponseReceived?: (response: string) => void;
  /** Custom button size */
  size?: "sm" | "default" | "lg" | "icon";
  /** Whether to show recording status text */
  showStatus?: boolean;
}

export default function MicComponent({
  className = "",
  onRecordingStart,
  onRecordingStop,
  onResponseReceived,
  size = "default",
  showStatus = true
}: MicComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("Ready to chat");

  const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
    onWebSocketOpen: () => {
      console.log("Voice chat connected");
      setStatus("Connected");
    },
    onWebSocketClose: () => {
      console.log("Voice chat disconnected");
      setStatus("Disconnected");
    },
    onWebSocketError: (event) => {
      console.error("Voice chat error:", event);
      setStatus("Connection error");
    },
    onReceivedError: (message) => {
      console.error("Voice chat error:", message);
      setStatus("Error occurred");
    },
    onReceivedResponseAudioDelta: (message) => {
      if (isRecording) {
        playAudio(message.delta);
        setStatus("AI responding...");
      }
    },
    onReceivedInputAudioBufferSpeechStarted: () => {
      stopAudioPlayer();
      setStatus("Listening...");
    },
    onReceivedExtensionMiddleTierToolResponse: (message) => {
      if (onResponseReceived) {
        onResponseReceived(message.tool_result);
      }
    }
  });

  const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
  const { start: startAudioRecording, stop: stopAudioRecording } = useAudioRecorder({ 
    onAudioRecorded: addUserAudio 
  });

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        // Start recording
        setStatus("Starting...");
        startSession();
        await startAudioRecording();
        resetAudioPlayer();
        setIsRecording(true);
        setStatus("Recording - speak now");
        onRecordingStart?.();
      } catch (error) {
        console.error("Failed to start recording:", error);
        setStatus("Failed to start - check microphone permissions");
      }
    } else {
      try {
        // Stop recording
        await stopAudioRecording();
        stopAudioPlayer();
        inputAudioBufferClear();
        setIsRecording(false);
        setStatus("Processing...");
        onRecordingStop?.();
        
        // Reset status after a delay
        setTimeout(() => setStatus("Ready to chat"), 2000);
      } catch (error) {
        console.error("Failed to stop recording:", error);
        setStatus("Error stopping recording");
      }
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Button
        onClick={handleToggleRecording}
        size={size}
        className={`transition-all duration-200 ${
          isRecording 
            ? "bg-red-600 hover:bg-red-700 animate-pulse" 
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
        {size !== "icon" && (
          <span className="ml-2">
            {isRecording ? "Stop" : "Talk"}
          </span>
        )}
      </Button>
      
      {showStatus && (
        <div className="text-center">
          <p className="text-sm text-gray-600 max-w-48">
            {status}
          </p>
          {isRecording && (
            <div className="flex items-center justify-center mt-1">
              <div className="flex space-x-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-4 bg-red-500 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '1s'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}