# MicComponent Integration Guide

## Overview
The MicComponent is a self-contained React component that provides voice chat functionality. It handles microphone input, WebSocket communication with the backend, and audio playback.

## Quick Start

### 1. Basic Integration
```tsx
import { MicComponent } from '@/components';

function MyApp() {
  return (
    <div>
      <h1>My Voice App</h1>
      <MicComponent />
    </div>
  );
}
```

### 2. With Custom Styling
```tsx
<MicComponent 
  className="my-custom-styles"
  size="lg"
  showStatus={true}
/>
```

### 3. With Callbacks
```tsx
<MicComponent 
  onRecordingStart={() => console.log('Started recording')}
  onRecordingStop={() => console.log('Stopped recording')}
  onResponseReceived={(response) => {
    console.log('AI responded:', response);
    // Handle grounding files, conversation history, etc.
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `""` | Additional CSS classes |
| `size` | `"sm" \| "default" \| "lg" \| "icon"` | `"default"` | Button size |
| `showStatus` | `boolean` | `true` | Show status text below button |
| `onRecordingStart` | `() => void` | `undefined` | Called when recording starts |
| `onRecordingStop` | `() => void` | `undefined` | Called when recording stops |
| `onResponseReceived` | `(response: string) => void` | `undefined` | Called when AI responds |

## Integration in Plain HTML

For non-React environments, you can use the standalone version:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Voice Chat</title>
</head>
<body>
    <div id="mic-root"></div>
    
    <script type="module">
        import { createRoot } from 'react-dom/client';
        import { MicComponent } from './path/to/MicComponent';
        
        const root = createRoot(document.getElementById('mic-root'));
        root.render(<MicComponent />);
    </script>
</body>
</html>
```

## Backend Requirements

The MicComponent expects:

1. **WebSocket endpoint** at `/realtime`
2. **Backend running** on `http://localhost:8765` (configurable via Vite proxy)
3. **Audio worklet files** in the public directory:
   - `audio-processor-worklet.js`
   - `audio-playback-worklet.js`

## Customization

### Styling
The component uses Tailwind CSS classes but can be customized:

```css
.mic-component-custom {
  /* Custom styles */
}
```

### Voice Settings
Backend voice settings are configured in the `.env` file:
```
AZURE_OPENAI_VOICE_CHOICE=sage
```

### Status Messages
Override status messages by handling the callbacks:

```tsx
<MicComponent 
  onRecordingStart={() => setMyStatus('Listening...')}
  onRecordingStop={() => setMyStatus('Processing...')}
/>
```

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Ensure HTTPS or localhost
   - Check browser permissions

2. **WebSocket Connection Failed**
   - Verify backend is running
   - Check network/firewall settings

3. **No Audio Playback**
   - Check browser audio permissions
   - Verify worklet files are accessible

### Debug Mode
Enable debug logging:
```tsx
<MicComponent 
  onResponseReceived={(response) => {
    console.log('Full response:', response);
  }}
/>
```

## Advanced Usage

### Multiple Instances
You can have multiple MicComponents on the same page:

```tsx
<div>
  <MicComponent className="mic-1" />
  <MicComponent className="mic-2" size="icon" showStatus={false} />
</div>
```

### Integration with State Management
```tsx
const [conversations, setConversations] = useState([]);

<MicComponent 
  onResponseReceived={(response) => {
    setConversations(prev => [...prev, { 
      timestamp: new Date(), 
      response: JSON.parse(response) 
    }]);
  }}
/>
```