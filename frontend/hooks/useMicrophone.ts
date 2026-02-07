import { useState, useRef, useCallback } from 'react';

export function useMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const requestAccess = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStream(s);
    return s;
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
  }, [stream]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive') {
        resolve(new Blob());
        return;
      }
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        resolve(blob);
      };
      recorderRef.current.stop();
      setIsRecording(false);
    });
  }, []);

  const getChunk = useCallback((): Promise<Blob> => {
    // Stop current recording, grab the blob, then restart
    return new Promise((resolve) => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive') {
        resolve(new Blob());
        return;
      }
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        resolve(blob);
        // Restart recording
        if (stream) {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorderRef.current = recorder;
          recorder.start(1000);
        }
      };
      recorderRef.current.stop();
    });
  }, [stream]);

  const stopStream = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsRecording(false);
  }, [stream]);

  return { stream, isRecording, requestAccess, startRecording, stopRecording, getChunk, stopStream };
}
