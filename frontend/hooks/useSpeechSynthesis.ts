import { useState, useCallback, useRef } from 'react';
import { voiceService } from '@/services/voiceService';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // OpenAI TTS path
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Browser fallback
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Starts true (try OpenAI first). Switches to false on 503.
  const useOpenAIRef = useRef(true);

  const browserSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const isSupported =
    typeof window !== 'undefined' && (useOpenAIRef.current || browserSupported);

  // --- Cleanup helper ---

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // --- Browser SpeechSynthesis fallback ---

  const speakBrowser = useCallback(
    (text: string) => {
      if (!browserSupported) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported]
  );

  // --- OpenAI TTS path ---

  const speakOpenAI = useCallback(
    async (text: string) => {
      cleanupAudio();
      setIsSpeaking(true);

      try {
        const blob = await voiceService.speak(text);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          cleanupAudio();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          cleanupAudio();
        };

        await audio.play();
      } catch (err: unknown) {
        const status =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status;

        if (status === 503) {
          // No OpenAI key — switch to browser permanently
          useOpenAIRef.current = false;
          speakBrowser(text);
        } else {
          // Other error — try browser fallback for this call
          setIsSpeaking(false);
          if (browserSupported) {
            speakBrowser(text);
          }
        }
      }
    },
    [cleanupAudio, speakBrowser, browserSupported]
  );

  // --- Public API ---

  const speak = useCallback(
    (text: string) => {
      if (useOpenAIRef.current) {
        speakOpenAI(text);
      } else {
        speakBrowser(text);
      }
    },
    [speakOpenAI, speakBrowser]
  );

  const stop = useCallback(() => {
    // Stop OpenAI audio
    cleanupAudio();
    // Stop browser speech
    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [cleanupAudio, browserSupported]);

  return { isSpeaking, isSupported, speak, stop };
}
