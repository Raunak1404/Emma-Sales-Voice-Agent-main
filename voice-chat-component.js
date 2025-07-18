/**
 * Standalone Voice Chat Component
 * A complete voice chat solution that can be easily integrated into any HTML page
 * 
 * Usage:
 * <script src="voice-chat-component.js"></script>
 * <script>
 *   const voiceChat = new VoiceChatComponent({
 *     wsUrl: 'wss://your-backend-url.com/realtime',
 *     containerId: 'voice-chat-container'
 *   });
 * </script>
 */

class VoiceChatComponent {
  constructor(options = {}) {
    console.log('🚀 VoiceChatComponent initializing...');
    
    // Configuration
    this.config = {
      wsUrl: options.wsUrl || 'ws://localhost:8765/realtime',
      containerId: options.containerId || 'voice-chat-container',
      position: options.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left
      size: options.size || 'medium', // small, medium, large
      showModal: options.showModal !== false, // true by default
      autoConnect: options.autoConnect !== false, // true by default
      debug: options.debug !== false // Enable debug by default for troubleshooting
    };

    console.log('📝 Config:', this.config);

    // State
    this.isRecording = false;
    this.isConnected = false;
    this.websocket = null;
    this.audioContext = null;
    this.playbackContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.playbackWorklet = null;
    this.audioBuffer = new Uint8Array();
    this.bufferSize = 4800;

    // Initialize component when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    console.log('🔧 Initializing voice chat component...');
    
    try {
      this.createStyles();
      console.log('✅ Styles created');
      
      this.createHTML();
      console.log('✅ HTML created');
      
      this.attachEventListeners();
      console.log('✅ Event listeners attached');
      
      this.log('Voice Chat Component initialized successfully!');
      
      // Verify button exists
      const button = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
      if (button) {
        console.log('✅ Button verified:', button);
      } else {
        console.error('❌ Button not found after initialization!');
      }
      
    } catch (error) {
      console.error('❌ Component initialization failed:', error);
    }
  }

  createStyles() {
    // Remove existing styles to avoid duplicates
    const existingStyle = document.getElementById('voice-chat-component-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'voice-chat-component-styles';
    style.textContent = `
      .voice-chat-component {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 9999;
      }

      .voice-chat-floating {
        position: fixed;
        z-index: 9999;
      }

      .voice-chat-bottom-right {
        bottom: 30px;
        right: 30px;
      }

      .voice-chat-bottom-left {
        bottom: 30px;
        left: 30px;
      }

      .voice-chat-top-right {
        top: 30px;
        right: 30px;
      }

      .voice-chat-top-left {
        top: 30px;
        left: 30px;
      }

      .voice-chat-btn {
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0, 123, 255, 0.4);
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        position: relative;
        overflow: hidden;
        outline: none;
      }

      .voice-chat-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(0, 123, 255, 0.5);
      }

      .voice-chat-btn.recording {
        background: linear-gradient(135deg, #dc3545, #c82333);
        animation: voice-chat-pulse 1s infinite;
      }

      .voice-chat-btn.connecting {
        background: linear-gradient(135deg, #ffc107, #e0a800);
      }

      .voice-chat-btn.error {
        background: linear-gradient(135deg, #dc3545, #c82333);
      }

      .voice-chat-btn-small {
        width: 45px;
        height: 45px;
      }

      .voice-chat-btn-medium {
        width: 60px;
        height: 60px;
      }

      .voice-chat-btn-large {
        width: 75px;
        height: 75px;
      }

      .voice-chat-mic-icon {
        width: 24px;
        height: 24px;
        fill: currentColor;
        transition: all 0.3s ease;
      }

      .voice-chat-btn-small .voice-chat-mic-icon {
        width: 18px;
        height: 18px;
      }

      .voice-chat-btn-medium .voice-chat-mic-icon {
        width: 24px;
        height: 24px;
      }

      .voice-chat-btn-large .voice-chat-mic-icon {
        width: 30px;
        height: 30px;
      }

      .voice-chat-pulse-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: rgba(0, 123, 255, 0.3);
        animation: voice-chat-pulse-ring 2s infinite;
        pointer-events: none;
      }

      .voice-chat-pulse-ring-small {
        width: 45px;
        height: 45px;
      }

      .voice-chat-pulse-ring-medium {
        width: 60px;
        height: 60px;
      }

      .voice-chat-pulse-ring-large {
        width: 75px;
        height: 75px;
      }

      .voice-chat-status {
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        color: #666;
        background: rgba(255, 255, 255, 0.9);
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .voice-chat-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .voice-chat-modal.active {
        opacity: 1;
        pointer-events: auto;
      }

      .voice-chat-modal-content {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
        position: relative;
      }

      .voice-chat-modal.active .voice-chat-modal-content {
        transform: scale(1);
      }

      .voice-chat-modal-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .voice-chat-modal-close:hover {
        color: #333;
      }

      .voice-chat-modal-mic {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 20px auto;
        box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
      }

      .voice-chat-modal-mic:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
      }

      .voice-chat-modal-mic.recording {
        background: linear-gradient(135deg, #dc3545, #c82333);
        animation: voice-chat-pulse 1s infinite;
      }

      .voice-chat-modal-mic .voice-chat-mic-icon {
        width: 32px;
        height: 32px;
        fill: currentColor;
      }

      .voice-chat-recording-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-top: 15px;
      }

      .voice-chat-recording-bar {
        width: 3px;
        height: 16px;
        background: #dc3545;
        border-radius: 2px;
        animation: voice-chat-recording-bars 1s infinite ease-in-out;
      }

      .voice-chat-recording-bar:nth-child(1) { animation-delay: 0s; }
      .voice-chat-recording-bar:nth-child(2) { animation-delay: 0.1s; }
      .voice-chat-recording-bar:nth-child(3) { animation-delay: 0.2s; }
      .voice-chat-recording-bar:nth-child(4) { animation-delay: 0.3s; }

      @keyframes voice-chat-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes voice-chat-pulse-ring {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.7;
        }
        100% {
          transform: translate(-50%, -50%) scale(1.8);
          opacity: 0;
        }
      }

      @keyframes voice-chat-recording-bars {
        0%, 100% { height: 8px; }
        50% { height: 16px; }
      }

      @media (max-width: 768px) {
        .voice-chat-bottom-right, .voice-chat-bottom-left {
          bottom: 20px;
        }
        .voice-chat-bottom-right {
          right: 20px;
        }
        .voice-chat-bottom-left {
          left: 20px;
        }
        .voice-chat-top-right, .voice-chat-top-left {
          top: 20px;
        }
        .voice-chat-top-right {
          right: 20px;
        }
        .voice-chat-top-left {
          left: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Get proper microphone SVG icon
  getMicrophoneIcon() {
    return `
      <svg class="voice-chat-mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" fill="currentColor"/>
        <path d="M6 10C6.55228 10 7 10.4477 7 11V12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12V11C17 10.4477 17.4477 10 18 10C18.5523 10 19 10.4477 19 11V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V11C5 10.4477 5.44772 10 6 10Z" fill="currentColor"/>
        <path d="M12 21C12.5523 21 13 21.4477 13 22C13 22.5523 12.5523 23 12 23C11.4477 23 11 22.5523 11 22C11 21.4477 11.4477 21 12 21Z" fill="currentColor"/>
        <path d="M8 22C8 21.4477 8.44772 21 9 21H15C15.5523 21 16 21.4477 16 22C16 22.5523 15.5523 23 15 23H9C8.44772 23 8 22.5523 8 22Z" fill="currentColor"/>
      </svg>
    `;
  }

  // Get microphone off icon for recording state
  getMicrophoneOffIcon() {
    return `
      <svg class="voice-chat-mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3L21 21M9 9V12C9 13.6569 10.3431 15 12 15C12.3506 15 12.6872 14.9492 13 14.8582M15 11.34V4C15 2.34315 13.6569 1 12 1C10.3431 1 9 2.34315 9 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 11V12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 17V23M8 23H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  createHTML() {
    let container = document.getElementById(this.config.containerId);
    if (!container) {
      console.log('📦 Creating new container...');
      // Create floating container
      container = document.createElement('div');
      container.id = this.config.containerId;
      container.className = `voice-chat-component voice-chat-floating voice-chat-${this.config.position}`;
      document.body.appendChild(container);
      console.log('✅ Container created and added to DOM');
    } else {
      console.log('📦 Using existing container');
    }

    container.innerHTML = `
      <div class="voice-chat-container">
        <button 
          id="voice-chat-btn-${this.config.containerId}" 
          class="voice-chat-btn voice-chat-btn-${this.config.size}"
          title="Start voice chat with Emma"
          type="button"
        >
          ${this.getMicrophoneIcon()}
        </button>
        <div class="voice-chat-pulse-ring voice-chat-pulse-ring-${this.config.size}"></div>
        <div class="voice-chat-status" id="voice-chat-status-${this.config.containerId}">Ready</div>
      </div>

      ${this.config.showModal ? `
        <div class="voice-chat-modal" id="voice-chat-modal-${this.config.containerId}">
          <div class="voice-chat-modal-content">
            <button class="voice-chat-modal-close" id="voice-chat-modal-close-${this.config.containerId}" type="button">×</button>
            
            <div style="margin-bottom: 20px;">
              <div style="font-size: 48px; margin-bottom: 10px;">🤖</div>
              <h3 style="margin: 0 0 10px 0; color: #333;">Hi! I'm Emma</h3>
              <p style="margin: 0; color: #666;">Your AI assistant from Asiatel. Ask me anything about our Microsoft 365 products!</p>
            </div>
            
            <button 
              id="voice-chat-modal-mic-${this.config.containerId}" 
              class="voice-chat-modal-mic"
              type="button"
            >
              ${this.getMicrophoneIcon()}
            </button>
            
            <div id="voice-chat-modal-status-${this.config.containerId}" style="margin-top: 15px; color: #666;">
              Click microphone to start talking
            </div>
            
            <div class="voice-chat-recording-indicator" id="voice-chat-recording-indicator-${this.config.containerId}" style="display: none;">
              <div class="voice-chat-recording-bar"></div>
              <div class="voice-chat-recording-bar"></div>
              <div class="voice-chat-recording-bar"></div>
              <div class="voice-chat-recording-bar"></div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666;">
              <strong>Note:</strong> Make sure your microphone is enabled and you're connected to the internet.
            </div>
          </div>
        </div>
      ` : ''}
    `;

    console.log('✅ HTML content set successfully');
  }

  attachEventListeners() {
    const mainBtn = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
    const modal = document.getElementById(`voice-chat-modal-${this.config.containerId}`);
    const modalClose = document.getElementById(`voice-chat-modal-close-${this.config.containerId}`);
    const modalMic = document.getElementById(`voice-chat-modal-mic-${this.config.containerId}`);

    console.log('🔗 Attaching event listeners...');
    console.log('Main button:', mainBtn);
    console.log('Modal:', modal);

    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        console.log('🖱️ Main button clicked!');
        if (this.config.showModal) {
          this.showModal();
        } else {
          this.toggleRecording();
        }
      });
      console.log('✅ Main button listener attached');
    } else {
      console.error('❌ Main button not found!');
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        console.log('❌ Modal close clicked');
        this.hideModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('📱 Modal backdrop clicked');
          this.hideModal();
        }
      });
    }

    if (modalMic) {
      modalMic.addEventListener('click', () => {
        console.log('🎤 Modal mic clicked');
        this.toggleRecording();
      });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  showModal() {
    console.log('📱 Showing modal...');
    const modal = document.getElementById(`voice-chat-modal-${this.config.containerId}`);
    if (modal) {
      modal.classList.add('active');
      console.log('✅ Modal shown');
    }
  }

  hideModal() {
    console.log('📱 Hiding modal...');
    const modal = document.getElementById(`voice-chat-modal-${this.config.containerId}`);
    if (modal) {
      modal.classList.remove('active');
      console.log('✅ Modal hidden');
    }
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.updateStatus('Connecting...', 'connecting');
      
      await this.connectWebSocket();
      await this.initializeAudio();
      
      this.isRecording = true;
      this.updateStatus('Listening... Speak now', 'recording');
      this.updateUI('recording');
      
      this.log('Recording started');
      
    } catch (error) {
      this.log('Error starting recording:', error);
      this.updateStatus('Error: ' + error.message, 'error');
      this.updateUI('error');
    }
  }

  stopRecording() {
    this.isRecording = false;
    this.updateStatus('Processing...', 'processing');
    this.updateUI('processing');
    
    this.cleanup();
    
    setTimeout(() => {
      this.updateStatus('Ready', 'ready');
      this.updateUI('ready');
    }, 2000);
    
    this.log('Recording stopped');
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.wsUrl);
        
        this.websocket.onopen = () => {
          this.isConnected = true;
          this.log('WebSocket connected');
          this.startSession();
          resolve();
        };
        
        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(JSON.parse(event.data));
        };
        
        this.websocket.onerror = (error) => {
          this.log('WebSocket error:', error);
          reject(new Error('Failed to connect to voice service'));
        };
        
        this.websocket.onclose = () => {
          this.isConnected = false;
          this.log('WebSocket disconnected');
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  async initializeAudio() {
    try {
      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize audio contexts
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      // Try to load audio worklets
      try {
        await this.loadAudioWorklets();
      } catch (workletError) {
        this.log('Audio worklets not available, using fallback');
        this.initializeFallbackAudio();
      }
      
    } catch (error) {
      throw new Error('Microphone permission denied or not available');
    }
  }

  async loadAudioWorklets() {
    // Create inline worklets since external files might not be available
    const processorWorklet = `
      class AudioProcessorWorklet extends AudioWorkletProcessor {
        constructor() {
          super();
        }
        
        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input.length > 0) {
            const float32Buffer = input[0];
            const int16Buffer = this.float32ToInt16(float32Buffer);
            this.port.postMessage(int16Buffer);
          }
          return true;
        }
        
        float32ToInt16(float32Array) {
          const int16Array = new Int16Array(float32Array.length);
          for (let i = 0; i < float32Array.length; i++) {
            let val = Math.floor(float32Array[i] * 32767);
            val = Math.max(-32768, Math.min(32767, val));
            int16Array[i] = val;
          }
          return int16Array;
        }
      }
      
      registerProcessor('audio-processor-worklet', AudioProcessorWorklet);
    `;
    
    const playbackWorklet = `
      class AudioPlaybackWorklet extends AudioWorkletProcessor {
        constructor() {
          super();
          this.port.onmessage = this.handleMessage.bind(this);
          this.buffer = [];
        }
        
        handleMessage(event) {
          if (event.data === null) {
            this.buffer = [];
            return;
          }
          this.buffer.push(...event.data);
        }
        
        process(inputs, outputs, parameters) {
          const output = outputs[0];
          const channel = output[0];
          
          if (this.buffer.length > channel.length) {
            const toProcess = this.buffer.slice(0, channel.length);
            this.buffer = this.buffer.slice(channel.length);
            channel.set(toProcess.map(v => v / 32768));
          } else {
            channel.set(this.buffer.map(v => v / 32768));
            this.buffer = [];
          }
          
          return true;
        }
      }
      
      registerProcessor('audio-playback-worklet', AudioPlaybackWorklet);
    `;
    
    // Create blob URLs for worklets
    const processorBlob = new Blob([processorWorklet], { type: 'application/javascript' });
    const playbackBlob = new Blob([playbackWorklet], { type: 'application/javascript' });
    
    const processorUrl = URL.createObjectURL(processorBlob);
    const playbackUrl = URL.createObjectURL(playbackBlob);
    
    // Load worklets
    await this.audioContext.audioWorklet.addModule(processorUrl);
    await this.playbackContext.audioWorklet.addModule(playbackUrl);
    
    // Create worklet nodes
    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor-worklet');
    this.playbackWorklet = new AudioWorkletNode(this.playbackContext, 'audio-playback-worklet');
    
    // Connect audio pipeline
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.workletNode);
    this.playbackWorklet.connect(this.playbackContext.destination);
    
    // Handle processed audio data
    this.workletNode.port.onmessage = (event) => {
      this.handleAudioData(event.data);
    };
    
    // Clean up blob URLs
    URL.revokeObjectURL(processorUrl);
    URL.revokeObjectURL(playbackUrl);
  }

  initializeFallbackAudio() {
    // Simple fallback using MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Convert blob to array buffer and send
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          this.handleAudioData(uint8Array);
        };
        reader.readAsArrayBuffer(event.data);
      }
    };
    
    this.mediaRecorder.start(100); // 100ms chunks
  }

  handleAudioData(audioData) {
    // Buffer audio data
    const newBuffer = new Uint8Array(this.audioBuffer.length + audioData.length);
    newBuffer.set(this.audioBuffer);
    newBuffer.set(audioData, this.audioBuffer.length);
    this.audioBuffer = newBuffer;
    
    // Send in chunks
    while (this.audioBuffer.length >= this.bufferSize) {
      const chunk = this.audioBuffer.slice(0, this.bufferSize);
      this.audioBuffer = this.audioBuffer.slice(this.bufferSize);
      
      const base64Audio = btoa(String.fromCharCode(...chunk));
      this.sendAudioData(base64Audio);
    }
  }

  sendAudioData(base64Audio) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }));
    }
  }

  startSession() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'session.update',
        session: {
          turn_detection: {
            type: 'server_vad'
          }
        }
      }));
    }
  }

  handleWebSocketMessage(message) {
    this.log('Received message:', message);
    
    switch (message.type) {
      case 'response.audio.delta':
        this.playAudio(message.delta);
        break;
        
      case 'input_audio_buffer.speech_started':
        this.updateStatus('Listening...', 'listening');
        break;
        
      case 'response.done':
        this.updateStatus('Your turn to speak', 'waiting');
        break;
        
      case 'error':
        this.log('Voice chat error:', message);
        this.updateStatus('Error occurred', 'error');
        break;
    }
  }

  playAudio(deltaAudio) {
    if (this.playbackWorklet) {
      try {
        const audioData = atob(deltaAudio);
        const audioBuffer = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioBuffer[i] = audioData.charCodeAt(i);
        }
        this.playbackWorklet.port.postMessage(audioBuffer);
      } catch (error) {
        this.log('Error playing audio:', error);
      }
    }
  }

  updateStatus(message, type = 'default') {
    const statusElement = document.getElementById(`voice-chat-status-${this.config.containerId}`);
    const modalStatusElement = document.getElementById(`voice-chat-modal-status-${this.config.containerId}`);
    
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `voice-chat-status ${type}`;
    }
    
    if (modalStatusElement) {
      modalStatusElement.textContent = message;
      modalStatusElement.className = `voice-chat-modal-status ${type}`;
    }
  }

  updateUI(state) {
    const mainBtn = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
    const modalMic = document.getElementById(`voice-chat-modal-mic-${this.config.containerId}`);
    const recordingIndicator = document.getElementById(`voice-chat-recording-indicator-${this.config.containerId}`);
    
    // Update main button
    if (mainBtn) {
      mainBtn.className = `voice-chat-btn voice-chat-btn-${this.config.size} ${state}`;
      // Change icon based on state
      if (state === 'recording') {
        mainBtn.innerHTML = this.getMicrophoneOffIcon();
      } else {
        mainBtn.innerHTML = this.getMicrophoneIcon();
      }
    }
    
    // Update modal mic
    if (modalMic) {
      modalMic.className = `voice-chat-modal-mic ${state}`;
      // Change icon based on state
      if (state === 'recording') {
        modalMic.innerHTML = this.getMicrophoneOffIcon();
      } else {
        modalMic.innerHTML = this.getMicrophoneIcon();
      }
    }
    
    // Update recording indicator
    if (recordingIndicator) {
      recordingIndicator.style.display = state === 'recording' ? 'flex' : 'none';
    }
  }

  cleanup() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    this.workletNode = null;
    this.playbackWorklet = null;
    this.audioBuffer = new Uint8Array();
    this.isConnected = false;
  }

  log(...args) {
    if (this.config.debug) {
      console.log('[VoiceChat]', ...args);
    }
  }

  // Public methods
  connect() {
    if (!this.isConnected) {
      this.connectWebSocket();
    }
  }

  disconnect() {
    this.cleanup();
  }

  setWebSocketUrl(url) {
    this.config.wsUrl = url;
  }

  destroy() {
    this.cleanup();
    const container = document.getElementById(this.config.containerId);
    if (container) {
      container.remove();
    }
  }
}

// Make it globally available
window.VoiceChatComponent = VoiceChatComponent;

// Auto-initialize if data attributes are found
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 VoiceChatComponent DOM loaded, checking for auto-init...');
  
  const autoInit = document.querySelector('[data-voice-chat]');
  if (autoInit) {
    console.log('🎯 Auto-initializing component...');
    const wsUrl = autoInit.dataset.wsUrl || 'ws://localhost:8765/realtime';
    new VoiceChatComponent({ 
      wsUrl: wsUrl,
      containerId: autoInit.dataset.containerId || 'voice-chat-auto'
    });
  }
});

console.log('✅ Voice Chat Component v2.0 loaded successfully!');