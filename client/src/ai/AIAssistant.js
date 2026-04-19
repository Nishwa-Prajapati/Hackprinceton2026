import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { useSpeech } from './useSpeech';

function summarizeOutput(reaction) {
  const output = reaction?.output ?? {};
  const formulaOutput = String(reaction?.formula ?? '').split('->')[1]?.trim();

  return (
    output.primary_product_name
    ?? output.product_name
    ?? output.compound_name
    ?? output.precipitate_name
    ?? output.gas_name
    ?? output.cathode_product
    ?? output.anode_product
    ?? output.residue_name
    ?? output.ash_name
    ?? formulaOutput
    ?? reaction?.name
    ?? 'this product'
  );
}

function buildAssistantContext({ desk, reaction, chemicals = [] }) {
  return {
    desk: desk?.name ?? desk?.label ?? '',
    reaction: reaction?.name ?? '',
    chemicals: chemicals.map((chemical) => chemical?.formula ?? chemical?.name).filter(Boolean),
    output: summarizeOutput(reaction),
  };
}

export function useAIAssistant() {
  const {
    isListening,
    isSpeaking,
    supportsSpeechInput,
    supportsSpeechOutput,
    speak,
    cancelSpeech,
    startListening,
    stopListening,
  } = useSpeech();

  const [currentDesk, setCurrentDesk] = useState(null);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [statusText, setStatusText] = useState('');

  const followUpTimerRef = useRef(null);
  const deskAnnouncementRef = useRef('');
  const reactionAnnouncementRef = useRef('');

  useEffect(() => () => {
    window.clearTimeout(followUpTimerRef.current);
    stopListening();
    cancelSpeech();
  }, []);

  function clearFollowUpTimer() {
    window.clearTimeout(followUpTimerRef.current);
    followUpTimerRef.current = null;
  }

  async function askAssistant(question, contextOverride = {}) {
    setStatusText('Thinking...');

    try {
      const response = await apiClient.post('/api/ai-chat', {
        question,
        context: contextOverride,
      });

      const answer = String(response.data?.answer ?? '').trim();
      if (!answer) {
        throw new Error('Empty assistant answer');
      }

      setStatusText('Speaking...');
      await speak(answer);
      setStatusText('');
      return answer;
    } catch (error) {
      console.error('[AIAssistant] askAssistant failed:', JSON.stringify(error?.response?.data ?? error?.message ?? error, null, 2));
      setStatusText('Could not reach the assistant.');
      return '';
    }
  }

  async function speakText(text, options = {}) {
    setStatusText('Speaking...');
    const didSpeak = await speak(text, options);
    if (!didSpeak) {
      setStatusText('Voice playback is unavailable right now.');
      return false;
    }
    setStatusText('');
    return true;
  }

  function stopAll({ preserveContext = true } = {}) {
    clearFollowUpTimer();
    stopListening();
    cancelSpeech();
    setStatusText('');

    if (!preserveContext) {
      setCurrentDesk(null);
      setCurrentReaction(null);
      deskAnnouncementRef.current = '';
      reactionAnnouncementRef.current = '';
    }
  }

  function onDeskEnter(desk) {
    if (!desk?.deskKey) return;

    setCurrentDesk(desk);
    const deskToken = `${desk.id ?? desk.deskKey}:${desk.name ?? ''}`;
    if (deskAnnouncementRef.current === deskToken) return;

    deskAnnouncementRef.current = deskToken;
    clearFollowUpTimer();
    stopListening();

    speakText(`Hello, welcome to ${desk.name}. Select any two chemicals to begin your experiment.`);
  }

  function beginReactionFollowUp(payload) {
    const outputName = summarizeOutput(payload.reaction);
    const context = buildAssistantContext(payload);

    if (!supportsSpeechInput) {
      askAssistant(`Explain real-world uses of ${outputName}.`, context);
      return;
    }

    setStatusText('Listening...');
    const started = startListening(
      async (transcript) => {
        clearFollowUpTimer();
        await askAssistant(
          `The student responded with: "${transcript}". Whether they answered correctly, incorrectly, or asked a follow-up question — explain 2 real-world places where ${outputName} is used in everyday life. Be encouraging and always give the actual real-world uses in your response.`,
          context
        );
      },
      {
        onError: async () => {
          clearFollowUpTimer();
          await askAssistant(`Explain 2 real-world places where ${outputName} is used in everyday life.`, context);
        },
        maxDurationMs: 5000,
      }
    );

    if (!started) {
      askAssistant(`Explain real-world uses of ${outputName}.`, context);
      return;
    }

    followUpTimerRef.current = window.setTimeout(async () => {
      stopListening();
      await askAssistant(`Explain 2 real-world places where ${outputName} is used in everyday life.`, context);
    }, 5000);
  }

  function onReactionComplete(payload) {
    const { desk, reaction, chemicals = [] } = payload ?? {};
    if (!reaction) return;

    setCurrentDesk(desk ?? currentDesk);
    setCurrentReaction({ reaction, chemicals });

    clearFollowUpTimer();
    stopListening();

    const outputName = summarizeOutput(reaction);
    const prompt = `Great job! You have successfully performed ${reaction.name}. Do you know where ${outputName} is used in real life?`;

    speakText(prompt).then((didSpeak) => {
      if (!didSpeak) {
        setStatusText('');
        return;
      }
      beginReactionFollowUp({ desk, reaction, chemicals });
    });
  }

  function onMicClick() {
    if (isListening) {
      clearFollowUpTimer();
      stopListening();
      setStatusText('');
      return;
    }

    if (!supportsSpeechInput) {
      setStatusText('Voice input is not available in this browser.');
      return;
    }

    cancelSpeech();
    clearFollowUpTimer();

    const context = buildAssistantContext({
      desk: currentDesk,
      reaction: currentReaction?.reaction,
      chemicals: currentReaction?.chemicals,
    });

    setStatusText('Listening...');
    const started = startListening(
      async (transcript) => {
        await askAssistant(transcript, context);
      },
      {
        onError: (error) => {
          setStatusText(
            error === 'not-allowed'
              ? 'Microphone permission was blocked.'
              : error === 'empty-transcript'
                ? 'I did not catch a question.'
              : 'I could not hear your question just now.'
          );
        },
        maxDurationMs: 7000,
      }
    );

    if (!started) {
      setStatusText('I could not start voice input.');
    }
  }

  return {
    currentDesk,
    currentReaction,
    isListening,
    isSpeaking,
    statusText,
    supportsSpeechInput,
    supportsSpeechOutput,
    onDeskEnter,
    onReactionComplete,
    onMicClick,
    speakText,
    stopAll,
  };
}

export default useAIAssistant;
