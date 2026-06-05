import os from "node:os";
import path from "node:path";

/**
 * Resolve a stored repository path to a real filesystem path.
 *
 * Paths are stored as the user typed them, which often includes a leading `~`
 * (e.g. `~/www/repo`). Node's fs / child_process / simple-git do not expand the
 * tilde the way a shell does, so the literal `~` is treated as a relative path
 * component and the directory "does not exist". Expand it to the home directory.
 */
export function resolveRepositoryPath(repositoryPath: string): string {
  const trimmed = repositoryPath.trim();
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/")) return path.join(os.homedir(), trimmed.slice(2));
  return trimmed;
}
