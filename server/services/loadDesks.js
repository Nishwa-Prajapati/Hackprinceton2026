import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");

const DESK_FILES = {
  desk_1: "acid_base_desk.json",
  desk_2: "combustion_desk.json",
  desk_3: "electrochemistry_desk.json",
  desk_4: "synthesis_desk.json",
};

async function loadDesk(deskId) {
  const filename = DESK_FILES[deskId];
  if (!filename) return null;
  const raw = await readFile(join(DATA_DIR, filename), "utf8");
  return JSON.parse(raw);
}

export async function loadAllDesks() {
  const entries = await Promise.all(
    Object.keys(DESK_FILES).map(async (id) => [id, await loadDesk(id)])
  );
  return Object.fromEntries(entries);
}

export async function loadDeskById(deskId) {
  return loadDesk(deskId);
}

export function listDeskIds() {
  return Object.keys(DESK_FILES);
}
