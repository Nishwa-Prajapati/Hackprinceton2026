import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read audio blob.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToAudioUrl(audioBase64, mimeType = 'audio/mpeg') {
  const byteCharacters = atob(audioBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return URL.createObjectURL(new Blob([byteArray], { type: mimeType }));
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [supportsSpeechOutput, setSupportsSpeechOutput] = useState(false);
  const [supportsSpeechInput, setSupportsSpeechInput] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionResultHandlerRef = useRef(null);
  const recognitionErrorHandlerRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioUrlRef = useRef(null);
  const listenStopTimerRef = useRef(null);
  const listenSessionIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    setSupportsSpeechOutput(typeof Audio !== 'undefined');
    setSupportsSpeechInput(
      typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
      && typeof window.MediaRecorder !== 'undefined'
    );

    return () => {
      window.clearTimeout(listenStopTimerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  function clearAudioPlayback() {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }

  function cancelSpeech() {
    clearAudioPlayback();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function speakBrowserFallback(text) {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(true); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(false); };
      window.speechSynthesis.speak(utterance);
    });
  }

  async function speak(text, options = {}) {
    const message = String(text ?? '').trim();
    if (!message) return false;

    cancelSpeech();

    try {
      const response = await apiClient.post('/api/narrate', {
        text: message,
        voiceId: options.voiceId,
        modelId: options.modelId,
      });

      const audioBase64 = String(response.data?.audioBase64 ?? '');
      if (!audioBase64) throw new Error('No ElevenLabs audio returned.');

      const audioUrl = base64ToAudioUrl(audioBase64, response.data?.mimeType ?? 'audio/mpeg');
      const audio = new Audio(audioUrl);
      audioUrlRef.current = audioUrl;
      audioElementRef.current = audio;

      setIsSpeaking(true);

      const played = await new Promise((resolve) => {
        audio.onended = () => {
          clearAudioPlayback();
          setIsSpeaking(false);
          resolve(true);
        };
        audio.onerror = () => {
          clearAudioPlayback();
          setIsSpeaking(false);
          resolve(false);
        };
        audio.play().catch(() => {
          clearAudioPlayback();
          setIsSpeaking(false);
          resolve(false);
        });
      });

      if (!played) return speakBrowserFallback(message);
      return true;
    } catch (_error) {
      setIsSpeaking(false);
      return speakBrowserFallback(message);
    }
  }

  function cleanupRecorder() {
    window.clearTimeout(listenStopTimerRef.current);
    listenStopTimerRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsListening(false);
  }

  function stopListening() {
    window.clearTimeout(listenStopTimerRef.current);
    listenStopTimerRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    cleanupRecorder();
  }

  async function startListening(onResult, { onError, maxDurationMs = 5000 } = {}) {
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      onError?.('speech-recognition-unsupported');
      return false;
    }

    cancelSpeech();
    stopListening();

    recognitionResultHandlerRef.current = onResult;
    recognitionErrorHandlerRef.current = onError;
    chunksRef.current = [];

    const sessionId = listenSessionIdRef.current + 1;
    listenSessionIdRef.current = sessionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        recognitionErrorHandlerRef.current?.('speech-recorder-error');
        cleanupRecorder();
      };

      recorder.onstop = async () => {
        const activeSessionId = listenSessionIdRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupRecorder();

        if (sessionId !== activeSessionId || audioBlob.size < 1024) {
          recognitionErrorHandlerRef.current?.('empty-transcript');
          return;
        }

        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const response = await apiClient.post('/api/narrate/transcribe', {
            audioBase64,
            mimeType: audioBlob.type || recorder.mimeType || 'audio/webm',
          });

          const transcript = String(response.data?.text ?? '').trim();
          if (!transcript) {
            recognitionErrorHandlerRef.current?.('empty-transcript');
            return;
          }

          recognitionResultHandlerRef.current?.(transcript);
        } catch (_error) {
          recognitionErrorHandlerRef.current?.('speech-transcription-failed');
        }
      };

      recorder.start();
      setIsListening(true);
      listenStopTimerRef.current = window.setTimeout(() => {
        stopListening();
      }, maxDurationMs);
      return true;
    } catch (_error) {
      cleanupRecorder();
      onError?.('not-allowed');
      return false;
    }
  }

  return {
    isListening,
    isSpeaking,
    supportsSpeechInput,
    supportsSpeechOutput,
    speak,
    cancelSpeech,
    startListening,
    stopListening,
  };
}

export default useSpeech;
