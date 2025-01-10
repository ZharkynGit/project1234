import { useState, useCallback, useRef } from 'react';
import { audioService } from '../services/audioService';

export interface CallState {
  isConnected: boolean;
  isListening: boolean;
  error: string | null;
  sessionId: string | null;
}

export function useAudioChat() {
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isListening: false,
    error: null,
    sessionId: null,
  });
  
  // Use a ref to track permission status
  const permissionStatus = useRef<PermissionStatus | null>(null);

  // Check for microphone permissions
  const checkPermissions = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissionStatus.current = result;
      
      return result.state === 'granted';
    } catch (error) {
      setCallState(prev => ({
        ...prev,
        error: 'Microphone permission check failed'
      }));
      return false;
    }
  }, []);

  // Initialize call session
  const initializeCall = useCallback(async () => {
    try {
      // Generate a unique session ID
      const sessionId = crypto.randomUUID();
      
      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Initialize the audio session
      await audioService.initializeSession();
      
      setCallState(prev => ({
        ...prev,
        isConnected: true,
        sessionId,
        error: null
      }));

      return true;
    } catch (error) {
      setCallState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize call',
        isConnected: false,
        sessionId: null
      }));
      return false;
    }
  }, [checkPermissions]);

  // Start the call
  const startListening = useCallback(async () => {
    try {
      const initialized = await initializeCall();
      if (!initialized) return;

      audioService.startStreaming();
      setCallState(prev => ({
        ...prev,
        isListening: true,
        error: null
      }));
    } catch (error) {
      setCallState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start call',
        isListening: false
      }));
    }
  }, [initializeCall]);

  // Stop the call
  const stopListening = useCallback(() => {
    try {
      audioService.stopStreaming();
      setCallState(prev => ({
        ...prev,
        isListening: false,
        error: null
      }));
    } catch (error) {
      setCallState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop call'
      }));
    }
  }, []);

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    audioService.disconnect();
    setCallState({
      isConnected: false,
      isListening: false,
      error: null,
      sessionId: null
    });
  }, []);

  return {
    ...callState,
    startListening,
    stopListening,
    disconnect,
    checkPermissions
  };
}