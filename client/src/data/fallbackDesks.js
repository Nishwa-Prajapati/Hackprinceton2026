import acidBaseDesk from './desks/acid_base_desk.json';
import combustionDesk from './desks/combustion_desk.json';
import electrochemistryDesk from './desks/electrochemistry_desk.json';
import synthesisDesk from './desks/synthesis_desk.json';

const DESK_SOURCES = [
  { key: 'acid-base', order: 1, sourceFile: 'acid_base_desk.json', data: acidBaseDesk },
  { key: 'combustion', order: 2, sourceFile: 'combustion_desk.json', data: combustionDesk },
  { key: 'electrochemistry', order: 3, sourceFile: 'electrochemistry_desk.json', data: electrochemistryDesk },
  { key: 'synthesis', order: 4, sourceFile: 'synthesis_desk.json', data: synthesisDesk }
];

function normalizeDeskData(desk = {}, fallback = {}) {
  return {
    ...desk,
    key: desk.key ?? fallback.key ?? null,
    order: desk.order ?? fallback.order ?? null,
    sourceFile: desk.sourceFile ?? fallback.sourceFile ?? null,
    ui: desk.ui ?? desk.ui_config ?? fallback.ui ?? null
  };
}

export function normalizeDesks(desks = []) {
  return desks.map(desk => {
    const fallback = DESK_SOURCES.find(source => source.key === desk.key);
    return normalizeDeskData(desk, fallback);
  });
}

export const FALLBACK_DESKS = DESK_SOURCES.map(source => (
  normalizeDeskData(source.data, source)
));
