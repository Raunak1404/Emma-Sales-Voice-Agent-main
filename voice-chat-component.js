/**
 * Reusable Voice Chat Component for Website Integration
 * Version: 2.0 - Fixed for multi-page use
 */

class VoiceChatComponent {
  constructor(options = {}) {
    console.log('🚀 VoiceChatComponent v2.0 initializing...');
    
    this.config = {
      wsUrl: options.wsUrl || 'ws://localhost:8765/realtime',
      containerId: options.containerId || 'voice-chat-container',
      position: options.position || 'bottom-right',
      size: options.size || 'medium',
      showModal: options.showModal !== false,
      debug: options.debug !== false
    };

    this.isRecording = false;
    this.ws = null;
    this.audioContext = null;
    this.mediaRecorder = null;

    // Initialize when DOM is ready
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
      this.createHTML();
      this.attachEventListeners();
      
      console.log('✅ Voice chat component ready!');
      
      if (this.config.debug) {
        console.log('📋 Component config:', this.config);
      }
    } catch (error) {
      console.error('❌ Component initialization failed:', error);
    }
  }

  createStyles() {
    // Remove existing styles to avoid duplicates
    const existingStyle = document.getElementById('voice-chat-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'voice-chat-styles';
    style.textContent = `
      /* Voice Chat Component Styles */
      .voice-chat-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      .voice-chat-bottom-right { bottom: 30px; right: 30px; }
      .voice-chat-bottom-left { bottom: 30px; left: 30px; }
      .voice-chat-top-right { top: 30px; right: 30px; }
      .voice-chat-top-left { top: 30px; left: 30px; }

      .voice-chat-btn {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 28px;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
        position: relative;
      }

      .voice-chat-btn:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 12px 35px rgba(102, 126, 234, 0.6);
      }

      .voice-chat-btn:active {
        transform: translateY(0) scale(0.98);
      }

      .voice-chat-btn.recording {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        animation: pulse-recording 1.5s infinite;
      }

      @keyframes pulse-recording {
        0% { box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4); }
        50% { box-shadow: 0 8px 35px rgba(255, 107, 107, 0.8); }
        100% { box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4); }
      }

      .voice-chat-status {
        position: absolute;
        bottom: -45px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .voice-chat-container:hover .voice-chat-status {
        opacity: 1;
      }

      /* Modal Styles */
      .voice-chat-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .voice-chat-modal.show {
        opacity: 1;
        visibility: visible;
      }

      .voice-chat-modal-content {
        background: white;
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        transform: translateY(20px);
        transition: transform 0.3s ease;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .voice-chat-modal.show .voice-chat-modal-content {
        transform: translateY(0);
      }

      .voice-chat-modal h2 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 24px;
        font-weight: 600;
      }

      .voice-chat-modal p {
        margin: 0 0 25px 0;
        color: #666;
        line-height: 1.6;
      }

      .voice-chat-modal-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
      }

      .voice-chat-modal-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
      }

      .voice-chat-modal-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .voice-chat-modal-btn.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
      }

      .voice-chat-modal-btn.secondary {
        background: #f8f9fa;
        color: #666;
        border: 2px solid #e9ecef;
      }

      .voice-chat-modal-btn.secondary:hover {
        background: #e9ecef;
        color: #495057;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .voice-chat-btn {
          width: 60px;
          height: 60px;
          font-size: 24px;
        }
        
        .voice-chat-modal-content {
          padding: 30px 20px;
          margin: 20px;
        }
        
        .voice-chat-modal-buttons {
          flex-direction: column;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Styles injected');
  }

  createHTML() {
    // Create or find container
    let container = document.getElementById(this.config.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.config.containerId;
      document.body.appendChild(container);
    }

    // Set container classes
    container.className = `voice-chat-container voice-chat-${this.config.position}`;
    
    // Create button HTML
    container.innerHTML = `
      <button class="voice-chat-btn" id="voice-chat-btn" title="Talk to Emma" aria-label="Start voice chat with Emma">
        🎤
      </button>
      <div class="voice-chat-status" id="voice-chat-status">
        Click to chat with Emma
      </div>
    `;

    // Create modal if enabled
    if (this.config.showModal) {
      const modal = document.createElement('div');
      modal.className = 'voice-chat-modal';
      modal.id = 'voice-chat-modal';
      modal.innerHTML = `
        <div class="voice-chat-modal-content">
          <h2>👋 Hi! I'm Emma</h2>
          <p>I'm your AI sales assistant from Asiatel. I can help you with Microsoft 365 products, pricing, and features. Ready to chat?</p>
          <div class="voice-chat-modal-buttons">
            <button class="voice-chat-modal-btn primary" id="voice-chat-start">
              🎤 Start Talking
            </button>
            <button class="voice-chat-modal-btn secondary" id="voice-chat-close">
              Maybe Later
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    console.log('✅ HTML created');
  }

  attachEventListeners() {
    const button = document.getElementById('voice-chat-btn');
    const modal = document.getElementById('voice-chat-modal');
    const startBtn = document.getElementById('voice-chat-start');
    const closeBtn = document.getElementById('voice-chat-close');

    if (button) {
      button.addEventListener('click', () => {
        if (this.config.showModal && !this.isRecording) {
          this.showModal();
        } else {
          this.toggleRecording();
        }
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.hideModal();
        this.startRecording();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }

    console.log('✅ Event listeners attached');
  }

  showModal() {
    const modal = document.getElementById('voice-chat-modal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  hideModal() {
    const modal = document.getElementById('voice-chat-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    console.log('🎙️ Starting voice chat...');
    this.isRecording = true;
    this.updateUI('recording');
    this.updateStatus('Listening... speak now');
    
    // Here you would connect to WebSocket and start recording
    // For now, just simulate
    setTimeout(() => {
      this.updateStatus('Processing your request...');
    }, 3000);
    
    setTimeout(() => {
      this.stopRecording();
    }, 8000);
  }

  stopRecording() {
    console.log('⏹️ Stopping voice chat...');
    this.isRecording = false;
    this.updateUI('ready');
    this.updateStatus('Click to chat with Emma');
  }

  updateUI(state) {
    const button = document.getElementById('voice-chat-btn');
    if (button) {
      if (state === 'recording') {
        button.classList.add('recording');
        button.textContent = '⏹️';
        button.setAttribute('aria-label', 'Stop voice chat');
      } else {
        button.classList.remove('recording');
        button.textContent = '🎤';
        button.setAttribute('aria-label', 'Start voice chat with Emma');
      }
    }
  }

  updateStatus(message) {
    const status = document.getElementById('voice-chat-status');
    if (status) {
      status.textContent = message;
    }
  }

  // Public API methods
  connect() {
    console.log('🔌 Connecting to voice chat service...');
    // WebSocket connection logic here
  }

  disconnect() {
    console.log('🔌 Disconnecting from voice chat service...');
    // Cleanup logic here
  }

  destroy() {
    console.log('🗑️ Destroying voice chat component...');
    const container = document.getElementById(this.config.containerId);
    const modal = document.getElementById('voice-chat-modal');
    const styles = document.getElementById('voice-chat-styles');
    
    if (container) container.remove();
    if (modal) modal.remove();
    if (styles) styles.remove();
  }
}

// Make globally available
window.VoiceChatComponent = VoiceChatComponent;

// Auto-initialize if data attributes are found
document.addEventListener('DOMContentLoaded', function() {
  const autoInit = document.querySelector('[data-voice-chat]');
  if (autoInit) {
    const wsUrl = autoInit.dataset.wsUrl || 'ws://localhost:8765/realtime';
    new VoiceChatComponent({ 
      wsUrl: wsUrl,
      containerId: autoInit.dataset.containerId || 'voice-chat-auto'
    });
  }
});

console.log('✅ Voice Chat Component v2.0 loaded successfully!');