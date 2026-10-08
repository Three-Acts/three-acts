import test from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry, systemColumnsFor } from "@three-acts/cms-schema";
import { SupabaseDataStore } from "./supabase-store";

test("Supabase promotion conditions the actual update on reviewed id, version and queued status", async t => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL, previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "http://supabase-publication.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-service-key";
  const collection = collectionRegistry.find(item => item.id === "articles")!;
  const sys = systemColumnsFor(collection);
  const version = "2026-10-08T00:00:00.000Z";
  let updated = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "http://supabase-publication.test");
    if (init?.method === "PATCH") {
      assert.equal(url.searchParams.get(sys.id), "eq.reviewed-record");
      assert.equal(url.searchParams.get(sys.modifiedAt), `eq.${version}`);
      assert.equal(url.searchParams.get(sys.publishStatus), "eq.queued_to_publish");
      const payload = JSON.parse(String(init.body));
      assert.equal(payload[sys.publishStatus], "published");
      assert.ok(payload[sys.modifiedAt] > version);
      assert.deepEqual(Object.keys(payload).sort(), [sys.publishStatus, sys.modifiedAt].sort(), "Promotion must not overwrite working values");
      if (updated) return new Response("[]", { headers: { "Content-Type": "application/json" } });
      updated = true;
      return new Response(JSON.stringify([{ [sys.id]: "reviewed-record", [sys.publishStatus]: "published", [sys.modifiedAt]: payload[sys.modifiedAt] }]), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ [sys.id]: "reviewed-record", [sys.publishStatus]: "published", [sys.modifiedAt]: version }), { headers: { "Content-Type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = originalFetch; if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl; if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey; });
  const store = new SupabaseDataStore();
  const promoted = await store.publishRecord(collection, "reviewed-record", version);
  assert.ok(promoted && promoted !== "conflict");
  assert.equal(promoted.publishStatus, "published");
  assert.equal(await store.publishRecord(collection, "reviewed-record", version), "conflict");
});
