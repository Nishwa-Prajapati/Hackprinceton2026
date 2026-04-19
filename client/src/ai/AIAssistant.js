import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';
import { useSpeech } from './useSpeech';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    formula: reaction?.formula ?? reaction?.equation ?? '',
    chemicals: chemicals.map((c) => c?.formula ?? c?.name).filter(Boolean),
    output: summarizeOutput(reaction),
  };
}

function isNegativeResponse(transcript) {
  const t = transcript.toLowerCase().trim();
  return /\b(no|nope|nah|don'?t know|not sure|no idea|i don'?t|i do not|negative|not really|i have no|i'm not sure)\b/.test(t);
}

// ─── Pre-written fallback answers ───────────────────────────────────────────
// Used whenever the Claude API is unavailable or fails.
// Covers every reaction in the Phase 1 lab so the demo never breaks.

function fallbackAnswer(context, question) {
  const reaction  = String(context?.reaction  ?? '').toLowerCase();
  const output    = String(context?.output    ?? '').toLowerCase();
  const chemicals = (context?.chemicals ?? []).join(' ').toLowerCase();
  const combined  = `${reaction} ${output} ${chemicals}`;

  const isNo = isNegativeResponse(String(question ?? ''));

  // Sodium + Water
  if (/sodium|na\b|natrium/.test(combined) && /water|h2o/.test(combined)) {
    if (isNo || !question) {
      return "When sodium metal touches water, it reacts violently to produce sodium hydroxide and hydrogen gas. The reaction releases so much heat that the hydrogen actually catches fire! Sodium hydroxide, the product, is used in making soap, paper, and drain cleaners you find at home. Hydrogen gas produced here is being studied as a clean fuel for cars. Do you have any other questions about this reaction?";
    }
    return "Great thinking! The sodium water reaction is one of chemistry's most dramatic demonstrations. The sodium hydroxide it produces is found in soap factories, paper mills, and those powerful drain cleaners that unclog pipes. The hydrogen gas released is actually a clean-burning fuel that scientists are developing for zero-emission vehicles. Do you have any other questions?";
  }

  // HCl + NaOH — acid base neutralization
  if (/hcl|hydrochloric|acid.*base|neutrali/.test(combined) || (/hcl/.test(chemicals) && /naoh/.test(chemicals))) {
    return "When hydrochloric acid and sodium hydroxide mix, they neutralize each other perfectly and produce ordinary salt and water. This is called a neutralization reaction. Your stomach uses a very similar process — it makes hydrochloric acid to digest food, and antacid tablets neutralize the excess acid to stop heartburn. Water treatment plants also use neutralization to balance the pH of drinking water before it reaches your tap. Do you have any other questions?";
  }

  // Copper sulphate + Zinc — displacement
  if (/copper|cuso4|zinc|displacement/.test(combined)) {
    return "Zinc displaces copper from copper sulphate solution because zinc is higher in the reactivity series, meaning it is a stronger metal. You can watch the blue solution turn colourless as copper metal deposits right onto the zinc plate. This displacement principle is used in electroplating — coating cheaper metals with a layer of copper or gold to make jewellery and electronics. It is also the principle behind how batteries work. Do you have any other questions?";
  }

  // Ethanol combustion
  if (/ethanol|alcohol|combustion|burn/.test(combined)) {
    return "Ethanol burns in oxygen to release carbon dioxide, water vapour, and a large amount of energy as heat and light. This is a combustion reaction. Many countries mix ethanol with petrol to reduce carbon emissions from cars — you may have seen E10 or E85 fuel labels at the pump. Ethanol is also in hand sanitizers because it destroys bacteria the same way it burns here in the lab. Do you have any other questions?";
  }

  // Acid + indicator / pH
  if (/indicator|ph|litmus/.test(combined)) {
    return "Indicators like litmus paper change colour depending on whether a solution is acidic or basic. Acids turn litmus red and bases turn it blue. This colour-change chemistry is used in medical testing strips that check blood or urine pH, in swimming pools to keep the water safe, and even in soil testing kits farmers use to decide which crops to plant. Do you have any other questions?";
  }

  // Generic fallback — works for any unknown reaction
  const productName = context?.output || 'the product';
  const reactionName = context?.reaction || 'this reaction';
  return `The ${reactionName} is a great example of how atoms rearrange to form entirely new substances. The ${productName} you produced has important uses in everyday life — from industrial manufacturing to products you use at home. Chemists study these reactions to make medicines, materials, and clean energy solutions. Every reaction you run in this lab connects to something real in the world outside. Do you have any other questions about ${reactionName}?`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

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

  const [currentDesk,     setCurrentDesk]     = useState(null);
  const [currentReaction, setCurrentReaction] = useState(null);
  const [statusText,      setStatusText]      = useState('');

  const followUpTimerRef       = useRef(null);
  const deskAnnouncementRef    = useRef('');
  const reactionAnnouncementRef = useRef('');
  const currentContextRef      = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(followUpTimerRef.current);
    stopListening();
    cancelSpeech();
  }, []);

  function clearFollowUpTimer() {
    window.clearTimeout(followUpTimerRef.current);
    followUpTimerRef.current = null;
  }

  // Try Claude → on any failure use pre-written fallback. Never throws.
  async function askAssistant(question, context = {}) {
    setStatusText('Thinking...');

    let answer = '';

    try {
      const res = await apiClient.post('/api/explain', { question, context });
      answer = String(res.data?.answer ?? '').trim();
      if (!answer) throw new Error('empty');
    } catch {
      // Claude unavailable or failed — use pre-written answer
      answer = fallbackAnswer(context, question);
    }

    setStatusText('Speaking...');
    await speak(answer);
    setStatusText('');
    return answer;
  }

  async function speakText(text, options = {}) {
    setStatusText('Speaking...');
    const ok = await speak(text, options);
    setStatusText('');
    return ok;
  }

  // After every answer, keep listening for follow-up questions
  function beginContinuousQA(context) {
    if (!supportsSpeechInput) return;

    setStatusText('Ask me anything...');

    const started = startListening(
      async (transcript) => {
        clearFollowUpTimer();
        await askAssistant(transcript, context);
        beginContinuousQA(context);
      },
      {
        onError: () => { setStatusText(''); },
        maxDurationMs: 8000,
      }
    );

    if (!started) setStatusText('');
  }

  function beginReactionFollowUp(payload) {
    const outputName = summarizeOutput(payload.reaction);
    const context    = buildAssistantContext(payload);
    currentContextRef.current = context;

    // No mic — auto-explain immediately
    if (!supportsSpeechInput) {
      askAssistant(
        `Explain what the ${context.reaction} reaction produces and give 2 real-world uses of ${outputName}.`,
        context
      ).then(() => beginContinuousQA(context));
      return;
    }

    setStatusText('Listening...');

    const started = startListening(
      async (transcript) => {
        clearFollowUpTimer();

        const question = isNegativeResponse(transcript)
          ? `The student said they do not know. Explain: what is the ${context.reaction} reaction, what does it produce, and give 2 to 3 real-world places where ${outputName} is used in everyday life.`
          : `The student said: "${transcript}". Respond to what they said and always include 2 real-world uses of ${outputName}.`;

        await askAssistant(question, context);
        beginContinuousQA(context);
      },
      {
        onError: async () => {
          clearFollowUpTimer();
          await askAssistant(
            `Explain the ${context.reaction} reaction and give 2 real-world uses of ${outputName}.`,
            context
          );
          beginContinuousQA(context);
        },
        maxDurationMs: 7000,
      }
    );

    if (!started) {
      askAssistant(
        `Explain the ${context.reaction} reaction and give 2 real-world uses of ${outputName}.`,
        context
      ).then(() => beginContinuousQA(context));
      return;
    }

    // If user says nothing in 7 s, auto-explain
    followUpTimerRef.current = window.setTimeout(async () => {
      stopListening();
      await askAssistant(
        `Explain the ${context.reaction} reaction and give 2 real-world uses of ${outputName}.`,
        context
      );
      beginContinuousQA(context);
    }, 7000);
  }

  function onDeskEnter(desk) {
    if (!desk?.deskKey) return;

    setCurrentDesk(desk);
    const token = `${desk.id ?? desk.deskKey}:${desk.name ?? ''}`;
    if (deskAnnouncementRef.current === token) return;

    deskAnnouncementRef.current = token;
    clearFollowUpTimer();
    stopListening();
    speakText(`Hello, welcome to ${desk.name}. Select any two chemicals to begin your experiment.`);
  }

  function onReactionComplete(payload) {
    const { desk, reaction, chemicals = [] } = payload ?? {};
    if (!reaction) return;

    const token = reaction?.id ?? reaction?.name ?? '';
    if (reactionAnnouncementRef.current === token) return;
    reactionAnnouncementRef.current = token;

    setCurrentDesk(desk ?? currentDesk);
    setCurrentReaction({ reaction, chemicals });
    clearFollowUpTimer();
    stopListening();

    const outputName = summarizeOutput(reaction);
    const prompt = `The reaction is complete! You produced ${outputName}. Do you know where ${outputName} is used in the real world? Say yes or no, or ask me anything about this reaction!`;

    speakText(prompt).then((ok) => {
      if (!ok) return;
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

    const context = currentContextRef.current ?? buildAssistantContext({
      desk: currentDesk,
      reaction: currentReaction?.reaction,
      chemicals: currentReaction?.chemicals,
    });

    setStatusText('Listening...');
    const started = startListening(
      async (transcript) => {
        await askAssistant(transcript, context);
        beginContinuousQA(context);
      },
      {
        onError: (err) => {
          setStatusText(
            err === 'not-allowed'        ? 'Microphone permission was blocked.'
            : err === 'empty-transcript' ? 'I did not catch that. Try again.'
                                         : 'Could not hear you just now.'
          );
        },
        maxDurationMs: 7000,
      }
    );

    if (!started) setStatusText('Could not start voice input.');
  }

  function stopAll({ preserveContext = true } = {}) {
    clearFollowUpTimer();
    stopListening();
    cancelSpeech();
    setStatusText('');

    if (!preserveContext) {
      setCurrentDesk(null);
      setCurrentReaction(null);
      currentContextRef.current = null;
      deskAnnouncementRef.current = '';
      reactionAnnouncementRef.current = '';
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
