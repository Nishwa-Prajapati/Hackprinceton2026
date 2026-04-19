import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labState } from '../lab/LabState';
import {
  arraysMatchAsSets,
  buildReactionResult,
  findReactionForChemicals,
  getDeskApparatusMap,
  getDeskChemicalMap,
  getDeskForBench,
  getRequiredApparatusIds,
  isValidReaction
} from '../lab/reactionFlowHelpers.js';
import { playReactionAnimations } from '../lab/reactionAnimations.js';

function createMessage(type, text) {
  return text ? { type, text } : null;
}

export function useDeskReactionFlow({
  activeBenchId,
  engineRef,
  desks = [],
  hasDeskReactionData = true
}) {
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [selectedApparatus, setSelectedApparatus] = useState([]);
  const [pendingReaction, setPendingReaction] = useState(null);
  const [message, setMessage] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const previousBenchIdRef = useRef(null);

  const activeDesk = useMemo(() => getDeskForBench(desks, activeBenchId), [desks, activeBenchId]);
  const chemicalMap = useMemo(() => getDeskChemicalMap(activeDesk), [activeDesk]);
  const apparatusMap = useMemo(() => getDeskApparatusMap(activeDesk), [activeDesk]);
  const deskUi = activeDesk?.ui ?? activeDesk?.ui_config ?? null;
  const reactionDataAvailable = Boolean(
    hasDeskReactionData &&
    activeDesk &&
    Array.isArray(activeDesk.reactions)
  );

  const applyBenchState = useCallback((nextState = {}) => {
    if (!activeBenchId) return;
    engineRef.current?.setBenchInteractionState(activeBenchId, nextState);
  }, [activeBenchId, engineRef]);

  const clearBenchState = useCallback((benchId = activeBenchId) => {
    if (!benchId) return;
    engineRef.current?.clearBenchInteractionState(benchId);
  }, [activeBenchId, engineRef]);

  const resetFlow = useCallback((benchId = activeBenchId) => {
    setSelectedChemicals([]);
    setSelectedApparatus([]);
    setPendingReaction(null);
    setIsPlaying(false);
    clearBenchState(benchId);
  }, [activeBenchId, clearBenchState]);

  const showMessage = useCallback((type, text) => {
    setMessage(createMessage(type, text));
  }, []);

  const closeResultModal = useCallback(() => {
    setResultModal(null);
  }, []);

  const runReaction = useCallback(async (reaction, chemicalIds, apparatusIds) => {
    if (!activeBenchId || !reaction) return;

    setIsPlaying(true);
    applyBenchState({
      selectedChemicalIds: chemicalIds,
      selectedApparatusIds: apparatusIds,
      requiredApparatusIds: getRequiredApparatusIds(reaction),
      dimmedApparatusIds: []
    });
    showMessage('info', 'Running reaction...');

    await playReactionAnimations(engineRef.current, activeBenchId, reaction.output?.animations ?? []);

    setResultModal(buildReactionResult(reaction));
    resetFlow(activeBenchId);
    setMessage(null);
  }, [activeBenchId, applyBenchState, engineRef, resetFlow, showMessage]);

  const handleChemicalSelection = useCallback(async (chemicalId) => {
    if (isPlaying) return;

    if (!activeDesk) {
      showMessage('warning', 'No desk data is available for this bench yet.');
      return;
    }

    if (!reactionDataAvailable) {
      showMessage('warning', 'Reaction data is unavailable. Start the server to enable reactions.');
      return;
    }

    const numericId = Number(chemicalId);
    const current = selectedChemicals;
    let nextChemicals;

    if (current.includes(numericId)) {
      nextChemicals = current.filter(id => id !== numericId);
    } else if (current.length >= 2) {
      showMessage('warning', 'Select exactly 2 chemicals. Deselect one to continue.');
      return;
    } else {
      nextChemicals = [...current, numericId];
    }

    setSelectedChemicals(nextChemicals);
    setSelectedApparatus([]);
    setPendingReaction(null);

    if (nextChemicals.length < 2) {
      applyBenchState({
        selectedChemicalIds: nextChemicals,
        selectedApparatusIds: [],
        requiredApparatusIds: [],
        dimmedApparatusIds: []
      });
      showMessage('info', nextChemicals.length === 0 ? 'Select 2 chemicals to test a reaction.' : 'Select 1 more chemical.');
      return;
    }

    const reaction = findReactionForChemicals(activeDesk.reactions ?? [], nextChemicals);

    if (!isValidReaction(reaction)) {
      applyBenchState({
        selectedChemicalIds: nextChemicals,
        selectedApparatusIds: [],
        requiredApparatusIds: [],
        dimmedApparatusIds: []
      });
      showMessage('warning', deskUi?.no_reaction_message ?? 'No reaction possible.');
      return;
    }

    const requiredApparatusIds = getRequiredApparatusIds(reaction);
    const dimmedApparatusIds = [...apparatusMap.keys()].filter(id => !requiredApparatusIds.includes(id));

    setPendingReaction(reaction);
    applyBenchState({
      selectedChemicalIds: nextChemicals,
      selectedApparatusIds: [],
      requiredApparatusIds,
      dimmedApparatusIds
    });

    if (requiredApparatusIds.length === 0) {
      await runReaction(reaction, nextChemicals, []);
      return;
    }

    showMessage('success', deskUi?.reaction_found_message ?? 'Reaction found. Select the highlighted apparatus.');
  }, [
    activeDesk,
    apparatusMap,
    applyBenchState,
    deskUi,
    isPlaying,
    reactionDataAvailable,
    runReaction,
    selectedChemicals,
    showMessage
  ]);

  const handleApparatusSelection = useCallback(async (apparatusId) => {
    if (!pendingReaction || isPlaying) {
      showMessage('info', 'Select 2 reacting chemicals first.');
      return;
    }

    const numericId = Number(apparatusId);
    const requiredApparatusIds = getRequiredApparatusIds(pendingReaction);

    if (!requiredApparatusIds.includes(numericId)) {
      showMessage('warning', 'That apparatus is not required for this reaction.');
      return;
    }

    const nextSelectedApparatus = selectedApparatus.includes(numericId)
      ? selectedApparatus.filter(id => id !== numericId)
      : [...selectedApparatus, numericId];

    const dimmedApparatusIds = [...apparatusMap.keys()].filter(id => !requiredApparatusIds.includes(id));

    setSelectedApparatus(nextSelectedApparatus);
    applyBenchState({
      selectedChemicalIds: selectedChemicals,
      selectedApparatusIds: nextSelectedApparatus,
      requiredApparatusIds,
      dimmedApparatusIds
    });

    if (!arraysMatchAsSets(nextSelectedApparatus, requiredApparatusIds)) {
      const remaining = requiredApparatusIds.length - nextSelectedApparatus.length;
      showMessage('info', remaining > 0 ? `Select ${remaining} more required apparatus.` : 'Apparatus selection updated.');
      return;
    }

    await runReaction(pendingReaction, selectedChemicals, nextSelectedApparatus);
  }, [
    apparatusMap,
    applyBenchState,
    isPlaying,
    pendingReaction,
    runReaction,
    selectedApparatus,
    selectedChemicals,
    showMessage
  ]);

  useEffect(() => {
    if (previousBenchIdRef.current && previousBenchIdRef.current !== activeBenchId) {
      clearBenchState(previousBenchIdRef.current);
    }

    if (!activeBenchId) {
      resetFlow(previousBenchIdRef.current);
      setMessage(null);
      return;
    }

    previousBenchIdRef.current = activeBenchId;
    setSelectedChemicals([]);
    setSelectedApparatus([]);
    setPendingReaction(null);
    setMessage(
      createMessage(
        reactionDataAvailable ? 'info' : 'warning',
        reactionDataAvailable
          ? 'Select 2 chemicals to begin.'
          : 'Reaction data is unavailable for this desk right now.'
      )
    );
    applyBenchState({
      selectedChemicalIds: [],
      selectedApparatusIds: [],
      requiredApparatusIds: [],
      dimmedApparatusIds: []
    });
  }, [activeBenchId, applyBenchState, clearBenchState, reactionDataAvailable, resetFlow]);

  useEffect(() => {
    const offItemSelected = labState.on('bench:item:selected', ({ benchId, itemType, itemId }) => {
      if (benchId !== activeBenchId) return;
      if (itemType === 'chemical') {
        handleChemicalSelection(itemId);
      }
      if (itemType === 'apparatus') {
        handleApparatusSelection(itemId);
      }
    });

    const offBenchExit = labState.on('bench:exited', () => {
      resetFlow(activeBenchId);
      setMessage(null);
    });

    return () => {
      offItemSelected();
      offBenchExit();
    };
  }, [activeBenchId, handleApparatusSelection, handleChemicalSelection, resetFlow]);

  return {
    activeDesk,
    chemicalMap,
    apparatusMap,
    selectedChemicals,
    selectedApparatus,
    pendingReaction,
    message,
    resultModal,
    isPlaying,
    closeResultModal,
    clearMessage: () => setMessage(null)
  };
}
