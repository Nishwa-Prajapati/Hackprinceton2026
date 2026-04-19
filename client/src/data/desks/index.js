import deskData from './desks.json';

export const DESK_DATA = deskData;

export function getDeskChemicals(deskKey) {
  return DESK_DATA[deskKey]?.chemicals ?? [];
}

export function getDeskApparatus(deskKey) {
  return DESK_DATA[deskKey]?.apparatus ?? [];
}

export function getDeskReactions(deskKey) {
  return DESK_DATA[deskKey]?.reactions ?? [];
}

export function normalizeDeskToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function resolveDeskChemical(deskKey, rawValue) {
  const token = normalizeDeskToken(rawValue);
  if (!token) return null;

  return getDeskChemicals(deskKey).find((chemical) => {
    const aliases = [
      chemical.id,
      chemical.name,
      chemical.formula,
      chemical.type,
    ]
      .filter(Boolean)
      .map(normalizeDeskToken);

    return aliases.includes(token);
  }) ?? null;
}

export function findDeskReaction(deskKey, reactantA, reactantB) {
  const first = resolveDeskChemical(deskKey, reactantA);
  const second = resolveDeskChemical(deskKey, reactantB);

  if (!first || !second || first.id === second.id) {
    return {
      reaction: null,
      chemicals: [first, second].filter(Boolean),
    };
  }

  const sortedIds = [first.id, second.id].sort((a, b) => a - b);
  const reaction = getDeskReactions(deskKey).find((entry) => {
    const ids = [...(entry.reactants ?? [])].sort((a, b) => a - b);
    return ids.length === 2 && ids[0] === sortedIds[0] && ids[1] === sortedIds[1];
  }) ?? null;

  return {
    reaction,
    chemicals: [first, second],
  };
}
