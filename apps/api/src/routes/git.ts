import type { FastifyInstance } from "fastify";
import type { GitAccountInfo } from "@agentboard/services";
import { decryptSecret } from "../lib/crypto";
import { resolveRepositoryPath } from "../lib/repository-path";

/** Resolves a project's repo path + linked Git account, decrypting the PAT for host calls. */
async function resolveAccount(
  app: FastifyInstance,
  projectId: string,
): Promise<{ repositoryPath: string; account: GitAccountInfo | null }> {
  const project = await app.prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const repositoryPath = resolveRepositoryPath(project.gitRepositoryPath);
  if (!project.gitAccountId) {
    return { repositoryPath, account: null };
  }

  const account = await app.prisma.gitAccount.findUnique({ where: { id: project.gitAccountId } });
  if (!account) {
    return { repositoryPath, account: null };
  }

  let token: string | null = null;
  if (account.credentialId) {
    const credential = await app.prisma.credential.findUnique({ where: { id: account.credentialId } });
    if (credential) {
      try {
        token = decryptSecret(credential.encrypted);
      } catch {
        token = null;
      }
    }
  }

  return {
    repositoryPath,
    account: {
      id: account.id,
      name: account.name,
      host: account.host as GitAccountInfo["host"],
      authorName: account.authorName,
      authorEmail: account.authorEmail,
      apiBaseUrl: account.apiBaseUrl,
      remoteUrl: account.remoteUrl,
      token,
    },
  };
}

export async function gitRoutes(app: FastifyInstance) {
  app.get("/git/:projectId", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const { repositoryPath, account } = await resolveAccount(app, projectId);
    return app.gitService.inspectRepository(repositoryPath, account);
  });

  app.get("/git/:projectId/pull-requests", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const { repositoryPath, account } = await resolveAccount(app, projectId);
    if (!account) return { items: [], error: "No Git account is linked to this project." };
    try {
      return { items: await app.gitService.listPullRequests(repositoryPath, account) };
    } catch (error) {
      return { items: [], error: error instanceof Error ? error.message : String(error) };
    }
  });

  app.get("/git/:projectId/issues", async (request) => {
    const { projectId } = request.params as { projectId: string };
    const { repositoryPath, account } = await resolveAccount(app, projectId);
    if (!account) return { items: [], error: "No Git account is linked to this project." };
    try {
      return { items: await app.gitService.listIssues(repositoryPath, account) };
    } catch (error) {
      return { items: [], error: error instanceof Error ? error.message : String(error) };
    }
  });
}
