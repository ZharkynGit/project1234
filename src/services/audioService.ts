import { OPENAI_API_KEY } from '../config';

interface AudioSession {
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  stream: MediaStream | null;
  audioElement: HTMLAudioElement | null;
  isInitialized: boolean;
  retryCount: number;
  maxRetries: number;
}

class AudioService {
  private session: AudioSession = {
    peerConnection: null,
    dataChannel: null,
    stream: null,
    audioElement: null,
    isInitialized: false,
    retryCount: 0,
    maxRetries: 3
  };

  private async setupMediaStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
    } catch (error) {
      throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };

    return peerConnection;
  }

  private async handleConnectionFailure() {
    if (this.session.retryCount < this.session.maxRetries) {
      this.session.retryCount++;
      console.log(`Retrying connection (attempt ${this.session.retryCount})`);
      await this.initializeSession();
    } else {
      this.cleanupSession();
      throw new Error('Connection failed after maximum retry attempts');
    }
  }

  async initializeSession(): Promise<void> {
    try {
      this.cleanupSession();

      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      // Set up media stream
      this.session.stream = await this.setupMediaStream();
      
      // Create and configure peer connection
      this.session.peerConnection = await this.createPeerConnection();

      // Add tracks to peer connection
      if (this.session.stream && this.session.peerConnection) {
        this.session.stream.getTracks().forEach(track => {
          this.session.peerConnection?.addTrack(track, this.session.stream!);
        });
      }

      // Set up audio element
      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      this.session.audioElement = audioElement;

      // Handle incoming tracks
      if (this.session.peerConnection) {
        this.session.peerConnection.ontrack = (event) => {
          if (this.session.audioElement) {
            this.session.audioElement.srcObject = event.streams[0];
          }
        };
      }

      // Create and set up data channel
      if (this.session.peerConnection) {
        const dataChannel = this.session.peerConnection.createDataChannel('oai-events');
        this.session.dataChannel = dataChannel;
        
        this.setupDataChannelHandlers(dataChannel);
      }

      // Create and send offer
      await this.createAndSendOffer();

      console.log('WebRTC connection established successfully');
      this.session.isInitialized = true;
      this.session.retryCount = 0;

    } catch (error) {
      this.cleanupSession();
      throw error;
    }
  }

  private setupDataChannelHandlers(dataChannel: RTCDataChannel) {
    dataChannel.addEventListener('message', this.handleDataChannelMessage.bind(this));
    dataChannel.addEventListener('open', () => {
      console.log('Data channel opened');
      this.sendEvent({
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions: 'You are a friendly English tutor helping students practice their speaking skills.'
        }
      });
    });
    
    dataChannel.addEventListener('close', () => {
      console.log('Data channel closed');
      this.session.isInitialized = false;
    });
    
    dataChannel.addEventListener('error', (error) => {
      console.error('Data channel error:', error);
      this.session.isInitialized = false;
    });
  }

  private async createAndSendOffer() {
    if (!this.session.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.session.peerConnection.createOffer();
    await this.session.peerConnection.setLocalDescription(offer);

    const baseUrl = 'https://api.openai.com/v1/realtime';
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp'
      },
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(`Failed to establish WebRTC connection: ${errorText}`);
    }

    const answer = {
      type: 'answer' as RTCSdpType,
      sdp: await sdpResponse.text()
    };
    
    await this.session.peerConnection.setRemoteDescription(answer);
  }

  private handleDataChannelMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'text':
          window.dispatchEvent(new CustomEvent('ai-message', { detail: data.text }));
          break;
        case 'transcription':
          window.dispatchEvent(new CustomEvent('transcription', { detail: data.text }));
          break;
        case 'error':
          window.dispatchEvent(new CustomEvent('call-error', { detail: data.error }));
          break;
        default:
          console.log('Received event:', data);
      }
    } catch (error) {
      console.error('Error handling data channel message:', error);
    }
  }

  private sendEvent(event: any): void {
    if (this.session.dataChannel?.readyState === 'open') {
      this.session.dataChannel.send(JSON.stringify(event));
    } else {
      console.warn('Data channel not ready to send events');
    }
  }

  startStreaming(): void {
    if (!this.session.isInitialized) {
      throw new Error('Session not initialized');
    }
    if (!this.session.stream || !this.session.peerConnection) {
      throw new Error('Audio stream or peer connection not available');
    }
    console.log('Audio streaming active');
  }

  stopStreaming(): void {
    if (this.session.stream) {
      this.session.stream.getTracks().forEach(track => track.stop());
      this.session.stream = null;
    }
    this.session.isInitialized = false;
  }

  private cleanupSession(): void {
    this.stopStreaming();
    
    if (this.session.dataChannel) {
      this.session.dataChannel.close();
    }

    if (this.session.peerConnection) {
      this.session.peerConnection.close();
    }

    if (this.session.audioElement) {
      this.session.audioElement.srcObject = null;
    }

    this.session = {
      peerConnection: null,
      dataChannel: null,
      stream: null,
      audioElement: null,
      isInitialized: false,
      retryCount: 0,
      maxRetries: 3
    };
  }

  disconnect(): void {
    this.cleanupSession();
  }
}

export const audioService = new AudioService();