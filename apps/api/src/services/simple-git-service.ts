import simpleGit from "simple-git";
import type { GitService } from "@agentboard/services";

export class SimpleGitService implements GitService {
  async inspectRepository(repositoryPath: string) {
    const git = simpleGit(repositoryPath);
    const branch = (await git.branch()).current;
    const log = await git.log({ maxCount: 1 });
    const status = await git.status();

    return {
      branch,
      latestCommit: log.latest ? `${log.latest.hash.slice(0, 7)} ${log.latest.message}` : "No commits",
      modifiedFiles: status.modified,
      untrackedFiles: status.not_added,
    };
  }
}
