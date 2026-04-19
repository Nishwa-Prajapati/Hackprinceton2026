import acidBaseDesk from './acid-base.json';
import combustionDesk from './combustion.json';
import synthesisDesk from './synthesis.json';
import electrochemistryDesk from './electrochemistry.json';

export const DESK_DATA = {
  acidBase: acidBaseDesk,
  combustion: combustionDesk,
  synthesis: synthesisDesk,
  electrochemistry: electrochemistryDesk,
};

export function getDeskChemicals(deskKey) {
  return DESK_DATA[deskKey]?.chemicals ?? [];
}

export function getDeskApparatus(deskKey) {
  return DESK_DATA[deskKey]?.apparatus ?? [];
}

export function getDeskReactions(deskKey) {
  return DESK_DATA[deskKey]?.reactions ?? [];
}
