import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';


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

  const audioElementRef = useRef(null);
  const audioUrlRef = useRef(null);
  const intentionallyCancelledRef = useRef(false);
  const speechRecognitionRef = useRef(null);
  const listenStopTimerRef = useRef(null);

  const NativeSpeechRecognition =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
      : null;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    setSupportsSpeechOutput(typeof Audio !== 'undefined');
    setSupportsSpeechInput(!!NativeSpeechRecognition);

    return () => {
      window.clearTimeout(listenStopTimerRef.current);
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort();
        speechRecognitionRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
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
    intentionallyCancelledRef.current = true;
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

    intentionallyCancelledRef.current = false;
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

      if (!played) {
        if (intentionallyCancelledRef.current) return false;
        return speakBrowserFallback(message);
      }
      return true;
    } catch (_error) {
      setIsSpeaking(false);
      if (intentionallyCancelledRef.current) return false;
      return speakBrowserFallback(message);
    }
  }

  function stopListening() {
    window.clearTimeout(listenStopTimerRef.current);
    listenStopTimerRef.current = null;
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
  }

  function startListening(onResult, { onError, maxDurationMs = 7000 } = {}) {
    if (!NativeSpeechRecognition) {
      onError?.('speech-recognition-unsupported');
      return false;
    }

    cancelSpeech();
    stopListening();

    const recognition = new NativeSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    speechRecognitionRef.current = recognition;

    recognition.onresult = (event) => {
      window.clearTimeout(listenStopTimerRef.current);
      const transcript = String(event.results[0][0].transcript ?? '').trim();
      speechRecognitionRef.current = null;
      setIsListening(false);
      if (transcript) {
        onResult(transcript);
      } else {
        onError?.('empty-transcript');
      }
    };

    recognition.onerror = (event) => {
      window.clearTimeout(listenStopTimerRef.current);
      speechRecognitionRef.current = null;
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError?.('not-allowed');
      } else if (event.error === 'no-speech') {
        onError?.('empty-transcript');
      } else {
        onError?.('speech-recognition-failed');
      }
    };

    recognition.onend = () => {
      window.clearTimeout(listenStopTimerRef.current);
      speechRecognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
      listenStopTimerRef.current = window.setTimeout(() => {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
        }
      }, maxDurationMs);
      return true;
    } catch {
      speechRecognitionRef.current = null;
      onError?.('speech-recognition-failed');
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
