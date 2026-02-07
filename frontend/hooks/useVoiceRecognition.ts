import { useState, useCallback, useRef } from 'react';
import { voiceService } from '@/services/voiceService';

// Web Speech API types (kept for browser fallback)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // OpenAI path refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Browser fallback refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Starts as true (try OpenAI first). Switches to false on 503.
  const useOpenAIRef = useRef(true);

  const browserSpeechSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia || browserSpeechSupported);

  // --- Browser Speech API fallback ---

  const startBrowserListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      if (result && result[0]) {
        setTranscript(result[0].transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        setError(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError('Failed to start speech recognition');
    }
  }, []);

  const stopBrowserListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // --- OpenAI Whisper path ---

  const startWhisperListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setIsListening(true);
    } catch {
      setError('Microphone access denied');
    }
  }, []);

  const stopWhisperListening = useCallback(async () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') {
      setIsListening(false);
      return;
    }

    // Collect recorded audio
    const blob = await new Promise<Blob>((resolve) => {
      recorderRef.current!.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        resolve(b);
      };
      recorderRef.current!.stop();
    });

    // Release mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;

    // Skip empty recordings
    if (blob.size === 0) {
      setIsListening(false);
      return;
    }

    // Send to Whisper
    try {
      const result = await voiceService.transcribe(blob);
      setTranscript(result.text);
    } catch (err: unknown) {
      const status =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status;

      if (status === 503) {
        // Backend has no OpenAI key — switch to browser API permanently
        useOpenAIRef.current = false;
        setError('Switched to browser speech recognition');
      } else {
        setError('Transcription failed. Please try again.');
      }
    } finally {
      setIsListening(false);
    }
  }, []);

  // --- Public API ---

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');

    if (useOpenAIRef.current) {
      startWhisperListening();
    } else {
      startBrowserListening();
    }
  }, [startWhisperListening, startBrowserListening]);

  const stopListening = useCallback(() => {
    if (useOpenAIRef.current) {
      stopWhisperListening();
    } else {
      stopBrowserListening();
    }
  }, [stopWhisperListening, stopBrowserListening]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
  };
}
