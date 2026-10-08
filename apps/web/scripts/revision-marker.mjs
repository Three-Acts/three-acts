import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const revisionPattern = /^[a-f0-9]{40}$/;
const publicationPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** @param {Record<string, string | undefined>} env
 * @param {() => { revision: string; clean: boolean } | null} readGit */
export function buildRevisionMarker(env, readGit) {
  const requested = env.EDITOR_SOURCE_REVISION;
  const platform = env.VERCEL_GIT_COMMIT_SHA;
  const publication = env.EDITOR_PUBLICATION_ID;
  if (requested && !revisionPattern.test(requested)) throw new Error("EDITOR_SOURCE_REVISION must be an exact Git commit SHA.");
  if (platform && !revisionPattern.test(platform)) throw new Error("VERCEL_GIT_COMMIT_SHA must be an exact Git commit SHA.");
  if (publication && !publicationPattern.test(publication)) throw new Error("EDITOR_PUBLICATION_ID must identify a reviewed publication.");
  if (requested && platform && requested !== platform) throw new Error("The build's Git revision differs from the reviewed publication.");
  const git = platform ? null : readGit();
  if (requested && !platform && (!git?.clean || git.revision !== requested)) throw new Error("The local build must use clean source at the reviewed revision.");
  const revision = platform ?? (git?.clean && revisionPattern.test(git.revision) ? git.revision : null);
  if (publication && !revision) throw new Error("A publication build requires an identifiable source revision.");
  return { version: 1, revision, publicationId: publication ?? null };
}

/** Only public revision identities enter the artifact; never serialize env.
 * @param {Record<string, string | undefined>} env */
export function revisionMarkerIntegration(env) {
  return {
    name: "three-acts-revision-marker",
    hooks: {
      /** @param {{dir: URL}} options */
      "astro:build:done": async ({ dir }) => {
        const marker = buildRevisionMarker(env, () => {
          try {
            const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
            const changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
            return { revision, clean: changed === "" };
          } catch { return null; }
        });
        await writeFile(new URL("editor-revision.json", dir), `${JSON.stringify(marker)}\n`);
      }
    }
  };
}
