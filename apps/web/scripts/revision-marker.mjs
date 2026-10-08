import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const revisionPattern = /^[a-f0-9]{40}$/;
const publicationPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** @param {Record<string, string | undefined>} env
 * @param {() => { revision: string; clean: boolean } | null} readGit
 * @param {string} receipt */
export function buildRevisionMarker(env, readGit, receipt = "") {
  const requested = env.EDITOR_SOURCE_REVISION;
  const platform = env.VERCEL_GIT_COMMIT_SHA;
  const publication = env.EDITOR_PUBLICATION_ID || receipt;
  if (requested && !revisionPattern.test(requested)) throw new Error("EDITOR_SOURCE_REVISION must be an exact Git commit SHA.");
  if (platform && !revisionPattern.test(platform)) throw new Error("VERCEL_GIT_COMMIT_SHA must be an exact Git commit SHA.");
  if (publication && !publicationPattern.test(publication)) throw new Error("EDITOR_PUBLICATION_ID must identify a reviewed publication.");
  if (receipt && env.EDITOR_PUBLICATION_ID && receipt !== env.EDITOR_PUBLICATION_ID) throw new Error("The build's publication receipt differs from its environment.");
  if (requested && platform && requested !== platform) throw new Error("The build's Git revision differs from the reviewed publication.");
  const git = platform ? null : readGit();
  if (requested && !platform && (!git?.clean || git.revision !== requested)) throw new Error("The local build must use clean source at the reviewed revision.");
  const revision = platform ?? (git?.clean && revisionPattern.test(git.revision) ? git.revision : null);
  if (env.EDITOR_PUBLICATION_ID && !revision) throw new Error("A publication build requires an identifiable source revision.");
  // Local changes after a previous release remain buildable, but cannot
  // advertise the old receipt as verified output of the current dirty source.
  return { version: 1, revision, publicationId: revision ? publication || null : null };
}

/** Only public revision identities enter the artifact; never serialize env.
 * @param {Record<string, string | undefined>} env */
export function revisionMarkerIntegration(env) {
  return {
    name: "three-acts-revision-marker",
    hooks: {
      /** @param {{dir: URL}} options */
      "astro:build:done": async ({ dir }) => {
        const receipt = JSON.parse(readFileSync(new URL("../../../packages/static-content/src/documents/publication.json", import.meta.url), "utf8"));
        if (receipt.version !== 1 || typeof receipt.publicationId !== "string") throw new Error("Unsupported source publication receipt.");
        const marker = buildRevisionMarker(env, () => {
          try {
            const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
            const changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
            return { revision, clean: changed === "" };
          } catch { return null; }
        }, receipt.publicationId);
        await writeFile(new URL("editor-revision.json", dir), `${JSON.stringify(marker)}\n`);
      }
    }
  };
}
