import { readFile } from "fs/promises";

const reactionsFile = new URL("../../../client/src/data/reactions.json", import.meta.url);

export async function loadReactions() {
  const raw = await readFile(reactionsFile, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.reactions ?? [];
}
