import React, { useEffect, useState } from 'react';
import { useAudioChat } from '../hooks/useAudioChat';
import { 
  StackLayout, 
  Button, 
  Label, 
  FlexboxLayout,
  ScrollView,
  Page
} from '@nativescript/core';
import { StyleSheet } from 'react-nativescript';

export function MainScreen() {
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
    return () => disconnect();
  }, [checkPermissions, disconnect]);

  const handlePermissionRequest = async () => {
    try {
      const hasPermission = await checkPermissions();
      setPermissionGranted(hasPermission);
      setShowPermissionRequest(!hasPermission);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: 'Microphone access denied. Please enable it in your device settings.', 
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
      <Page>
        <FlexboxLayout style={styles.container}>
          <Label style={styles.title} text="Microphone Access Required" />
          <Label 
            style={styles.description} 
            text="To use the AI Language Tutor, we need access to your microphone. This allows you to have voice conversations with your AI tutor."
            textWrap={true}
          />
          <Button 
            text="Allow Microphone Access" 
            onTap={handlePermissionRequest}
            style={styles.primaryButton}
          />
        </FlexboxLayout>
      </Page>
    );
  }

  return (
    <Page>
      <StackLayout style={styles.container}>
        {/* Header */}
        <FlexboxLayout style={styles.header}>
          <Label 
            style={[styles.statusDot, isConnected && styles.statusDotActive]} 
          />
          <Label 
            style={styles.statusText} 
            text={isConnected ? 'Connected' : 'Ready to connect'}
          />
          <Label style={styles.title} text="AI Language Tutor" />
        </FlexboxLayout>

        {/* Messages */}
        <ScrollView style={styles.messagesContainer}>
          <StackLayout>
            {messages.map((message, index) => (
              <FlexboxLayout 
                key={index}
                style={[
                  styles.messageWrapper,
                  message.sender === 'user' ? styles.userMessage : styles.aiMessage
                ]}
              >
                <Label 
                  text={message.text}
                  style={styles.messageText}
                  textWrap={true}
                />
              </FlexboxLayout>
            ))}
          </StackLayout>
        </ScrollView>

        {/* Controls */}
        <FlexboxLayout style={styles.controls}>
          <Button 
            text={isMuted ? "🔇" : "🔊"}
            onTap={toggleMute}
            style={[styles.controlButton, isMuted && styles.mutedButton]}
            isEnabled={permissionGranted}
          />
          <Button 
            text={isListening ? "📞❌" : "📞"}
            onTap={toggleMicrophone}
            style={[styles.mainButton, isListening && styles.activeButton]}
            isEnabled={permissionGranted}
          />
          <Button 
            text={isListening ? "🎤❌" : "🎤"}
            onTap={toggleMicrophone}
            style={[styles.controlButton, isListening && styles.activeButton]}
            isEnabled={permissionGranted}
          />
        </FlexboxLayout>
      </StackLayout>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#666',
    marginRight: 8
  },
  statusDotActive: {
    backgroundColor: '#22c55e'
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16
  },
  messagesContainer: {
    flex: 1,
    marginVertical: 16
  },
  messageWrapper: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5'
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  messageText: {
    color: 'white',
    fontSize: 16
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    margin: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  mainButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    margin: 8,
    backgroundColor: '#22c55e'
  },
  activeButton: {
    backgroundColor: '#ef4444'
  },
  mutedButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: 12,
    borderRadius: 24,
    fontSize: 16,
    fontWeight: 'bold'
  }
});