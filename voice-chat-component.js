/**
 * Simple Debug Voice Chat Component
 * Let's start with the basics and add debugging
 */

class VoiceChatComponent {
  constructor(options = {}) {
    console.log('🚀 VoiceChatComponent constructor called with options:', options);
    
    this.config = {
      wsUrl: options.wsUrl || 'ws://localhost:8765/realtime',
      containerId: options.containerId || 'voice-chat-container',
      position: options.position || 'bottom-right',
      size: options.size || 'medium',
      debug: options.debug !== false
    };

    console.log('📝 Config set:', this.config);

    // Simple state
    this.isRecording = false;

    // Initialize immediately
    this.init();
  }

  init() {
    console.log('🔧 Starting initialization...');
    
    try {
      this.createStyles();
      console.log('✅ Styles created');
      
      this.createHTML();
      console.log('✅ HTML created');
      
      this.attachEventListeners();
      console.log('✅ Event listeners attached');
      
      console.log('🎉 Voice Chat Component initialized successfully!');
    } catch (error) {
      console.error('❌ Error during initialization:', error);
    }
  }

  createStyles() {
    console.log('🎨 Creating styles...');
    
    // Remove existing styles first
    const existingStyle = document.getElementById('voice-chat-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'voice-chat-styles';
    style.textContent = `
      .voice-chat-container {
        position: fixed;
        z-index: 999999;
        font-family: Arial, sans-serif;
      }

      .voice-chat-bottom-right {
        bottom: 30px;
        right: 30px;
      }

      .voice-chat-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        background: #007bff;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,123,255,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .voice-chat-btn:hover {
        transform: scale(1.1);
        background: #0056b3;
      }

      .voice-chat-status {
        position: absolute;
        bottom: -35px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        color: #333;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        white-space: nowrap;
      }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Styles appended to head');
  }

  createHTML() {
    console.log('🏗️ Creating HTML...');
    
    // Find or create container
    let container = document.getElementById(this.config.containerId);
    
    if (!container) {
      console.log('📦 Container not found, creating new one...');
      container = document.createElement('div');
      container.id = this.config.containerId;
      document.body.appendChild(container);
      console.log('✅ Container created and added to body');
    } else {
      console.log('📦 Using existing container');
    }

    // Set container class
    container.className = `voice-chat-container voice-chat-${this.config.position}`;
    
    // Create the HTML content
    container.innerHTML = `
      <button id="voice-chat-btn-${this.config.containerId}" class="voice-chat-btn" title="Talk to Emma">
        🎤
      </button>
      <div class="voice-chat-status" id="voice-chat-status-${this.config.containerId}">
        Ready to chat
      </div>
    `;

    console.log('✅ HTML content set');
    
    // Verify the button was created
    const button = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
    if (button) {
      console.log('✅ Button element found:', button);
    } else {
      console.error('❌ Button element NOT found!');
    }
  }

  attachEventListeners() {
    console.log('🔗 Attaching event listeners...');
    
    const button = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
    
    if (button) {
      button.addEventListener('click', () => {
        console.log('🖱️ Button clicked!');
        this.handleButtonClick();
      });
      console.log('✅ Click listener attached');
    } else {
      console.error('❌ Button not found for event listener!');
    }
  }

  handleButtonClick() {
    console.log('🎯 Handle button click called');
    
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    console.log('🎙️ Starting recording...');
    this.isRecording = true;
    this.updateStatus('Recording... Click to stop');
    this.updateButtonState('recording');
  }

  stopRecording() {
    console.log('⏹️ Stopping recording...');
    this.isRecording = false;
    this.updateStatus('Ready to chat');
    this.updateButtonState('ready');
  }

  updateStatus(message) {
    const statusElement = document.getElementById(`voice-chat-status-${this.config.containerId}`);
    if (statusElement) {
      statusElement.textContent = message;
      console.log('📝 Status updated:', message);
    }
  }

  updateButtonState(state) {
    const button = document.getElementById(`voice-chat-btn-${this.config.containerId}`);
    if (button) {
      if (state === 'recording') {
        button.style.background = '#dc3545';
        button.textContent = '⏹️';
      } else {
        button.style.background = '#007bff';
        button.textContent = '🎤';
      }
      console.log('🔄 Button state updated:', state);
    }
  }
}

// Make it globally available
window.VoiceChatComponent = VoiceChatComponent;

// Test if the script loaded
console.log('📜 Voice Chat Component script loaded successfully!');