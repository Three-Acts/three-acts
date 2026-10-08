import assert from "node:assert/strict";
import test from "node:test";
import { buildRevisionMarker } from "../scripts/revision-marker.mjs";

const revision = "a".repeat(40);
const publicationId = "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce31";

test("public markers identify clean source and the exact reviewed hosted release without exposing environment", () => {
  assert.deepEqual(buildRevisionMarker({}, () => ({ revision, clean: true })), { version: 1, revision, publicationId: null });
  assert.deepEqual(buildRevisionMarker({}, () => ({ revision, clean: false })), { version: 1, revision: null, publicationId: null });
  assert.deepEqual(buildRevisionMarker({}, () => ({ revision, clean: false }), publicationId), { version: 1, revision: null, publicationId: null }, "Normal local builds remain usable after editing a previously published revision");
  const hosted = buildRevisionMarker({ VERCEL_GIT_COMMIT_SHA: revision, EDITOR_SOURCE_REVISION: revision, EDITOR_PUBLICATION_ID: publicationId, SECRET: "must-not-leak" }, () => { throw new Error("Hosted revision should not read local Git"); });
  assert.deepEqual(hosted, { version: 1, revision, publicationId });
  assert.deepEqual(buildRevisionMarker({ VERCEL_GIT_COMMIT_SHA: revision }, () => null, publicationId), { version: 1, revision, publicationId });
  assert.equal(JSON.stringify(hosted).includes("must-not-leak"), false);
});

test("unidentifiable or mismatched publication builds cannot produce a live marker", () => {
  assert.throws(() => buildRevisionMarker({ EDITOR_SOURCE_REVISION: revision, VERCEL_GIT_COMMIT_SHA: "b".repeat(40) }, () => null), /differs/);
  assert.throws(() => buildRevisionMarker({ EDITOR_SOURCE_REVISION: revision }, () => ({ revision, clean: false })), /clean source/);
  assert.throws(() => buildRevisionMarker({ EDITOR_PUBLICATION_ID: publicationId }, () => null), /identifiable/);
  assert.throws(() => buildRevisionMarker({ EDITOR_SOURCE_REVISION: "main" }, () => null), /exact Git/);
  assert.throws(() => buildRevisionMarker({ VERCEL_GIT_COMMIT_SHA: revision, EDITOR_PUBLICATION_ID: "bad" }, () => null), /identify/);
  assert.throws(() => buildRevisionMarker({ VERCEL_GIT_COMMIT_SHA: revision, EDITOR_PUBLICATION_ID: "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce32" }, () => null, publicationId), /receipt differs/);
});
