import React from 'react';
import { MicComponent } from '@/components';

/**
 * Example of how to use the MicComponent in your React application
 */
export default function MicComponentExample() {
  const handleRecordingStart = () => {
    console.log('Recording started!');
  };

  const handleRecordingStop = () => {
    console.log('Recording stopped!');
  };

  const handleResponseReceived = (response: string) => {
    console.log('AI Response received:', response);
    // You can parse and handle the response here
    // For example, display grounding files or conversation history
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          AI Sales Agent
        </h1>
        <p className="text-gray-600 mb-8">
          Click the microphone to start talking with Emma
        </p>
        
        {/* Basic usage */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Simple Usage</h3>
          <MicComponent />
        </div>
        
        {/* Advanced usage with callbacks */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">With Callbacks</h3>
          <MicComponent
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onResponseReceived={handleResponseReceived}
            size="lg"
            className="mb-4"
          />
        </div>
        
        {/* Compact version */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Icon Only</h3>
          <MicComponent
            size="icon"
            showStatus={false}
            className="mx-auto"
          />
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2">Features:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Real-time voice recording</li>
            <li>• WebSocket connection to backend</li>
            <li>• Audio playback of AI responses</li>
            <li>• Visual feedback and status updates</li>
            <li>• Customizable styling and callbacks</li>
          </ul>
        </div>
      </div>
    </div>
  );
}