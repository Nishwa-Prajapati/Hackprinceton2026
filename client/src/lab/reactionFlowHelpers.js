import { DEFAULT_BENCH_DEFINITIONS } from './benchDefinitions.js';

function sortNumericPair(ids) {
  return [...ids].map(Number).sort((a, b) => a - b);
}

export function getDeskKeyForBench(benchId) {
  return DEFAULT_BENCH_DEFINITIONS.find(bench => bench.id === benchId)?.key ?? null;
}

export function getDeskForBench(desks, benchId) {
  const deskKey = getDeskKeyForBench(benchId);
  if (!deskKey) return null;
  return desks.find(desk => desk.key === deskKey) ?? null;
}

export function getDeskChemicalMap(desk) {
  return new Map((desk?.chemicals ?? []).map(chemical => [Number(chemical.id), chemical]));
}

export function getDeskApparatusMap(desk) {
  return new Map((desk?.apparatus ?? []).map(apparatus => [Number(apparatus.id), apparatus]));
}

export function findReactionForChemicals(reactions, selectedChemicals) {
  if (selectedChemicals.length !== 2) return null;

  const target = sortNumericPair(selectedChemicals);

  return (
    reactions.find(reaction => {
      if (!Array.isArray(reaction.reactants) || reaction.reactants.length !== 2) return false;
      const reactants = sortNumericPair(reaction.reactants);
      return reactants[0] === target[0] && reactants[1] === target[1];
    }) ?? null
  );
}

export function isValidReaction(reaction) {
  return Boolean(reaction && reaction.type !== 'no_reaction');
}

export function getRequiredApparatusIds(reaction) {
  return [...new Set((reaction?.apparatus_needed ?? []).map(Number))];
}

export function arraysMatchAsSets(left, right) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left.map(Number));
  return right.every(value => leftSet.has(Number(value)));
}

export function buildReactionResult(reaction) {
  const output = reaction?.output ?? {};

  return {
    name: reaction?.name ?? 'Reaction complete',
    formula: reaction?.formula ?? '',
    observation: output.observation ?? 'Observation data unavailable.',
    properties: [
      { label: 'Color Change', value: output.color_change ? 'Yes' : 'No' },
      { label: 'Gas Produced', value: output.gas_produced ? 'Yes' : 'No' },
      { label: 'Heat Released', value: output.heat_released ? 'Yes' : 'No' }
    ]
  };
}
