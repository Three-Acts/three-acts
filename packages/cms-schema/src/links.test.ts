import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  linkHref,
  normalizeLinkHref,
  parseLinkValue,
  resolveLinkValue,
  serializeLinkValue,
  validateLinkValue
} from "./links.ts";
import type { LinkField, LinkValue } from "./types.ts";

const field: LinkField = {
  key: "destination",
  label: "Destination",
  type: "link",
  pages: [{ id: "about", label: "About", href: "/about" }],
  sections: [{ id: "team", label: "Our team", href: "/about#team" }],
  collections: [{ id: "articles", label: "Articles", items: [{ id: "hello", label: "Hello", href: "/journal/hello" }] }]
};

describe("link values", () => {
  it("parses and serializes typed values, including blank typed drafts", () => {
    const blank: LinkValue = { type: "page", href: "" };
    assert.deepEqual(parseLinkValue(serializeLinkValue(blank)), blank);
    assert.deepEqual(parseLinkValue("https://example.com"), { type: "url", href: "https://example.com" });
    assert.equal(validateLinkValue(blank), null);
    assert.match(validateLinkValue(blank, { field, required: true }) ?? "", /required/i);
    const pretty = '{\n  "type": "url",\n  "href": "https://example.com"\n}';
    assert.deepEqual(parseLinkValue(pretty), { type: "url", href: "https://example.com" });
    assert.equal(validateLinkValue(pretty), null);
  });

  it("normalizes URL, email, and phone entries", () => {
    assert.equal(normalizeLinkHref("url", "example.com/path"), "https://example.com/path");
    assert.equal(normalizeLinkHref("email", "mailto:hello@example.com"), "mailto:hello@example.com");
    assert.equal(normalizeLinkHref("phone", "+1 (212) 555-0100"), "tel:+12125550100");
    assert.equal(validateLinkValue({ type: "email", href: "hello@example.com", target: "_blank" }), null);
    assert.deepEqual(resolveLinkValue({ type: "email", href: "hello@example.com", target: "_blank" }), {
      type: "email", href: "mailto:hello@example.com", target: "_self"
    });
    assert.equal(validateLinkValue({ type: "phone", href: "+1 (212) 555-0100" }), null);
    assert.match(validateLinkValue({ type: "phone", href: "1-800-FLOWERS" }) ?? "", /valid phone/i);
    assert.deepEqual(parseLinkValue("mailto:hello@example.com"), { type: "email", href: "mailto:hello@example.com" });
    assert.deepEqual(parseLinkValue("tel:+12125550100"), { type: "phone", href: "tel:+12125550100" });
  });

  it("resolves page, section, and collection IDs only through configured options", () => {
    const page = { type: "page", href: "https://attacker.test", destinationId: "about" } as const;
    assert.equal(validateLinkValue(page, { field }), null);
    assert.equal(linkHref(page, field), "/about");
    assert.equal(linkHref({ ...page, destinationId: "deleted" }, field), "");
    assert.match(validateLinkValue(page, { field: { ...field, pages: [] } }) ?? "", /no longer available/i);
    assert.equal(linkHref({ type: "section", href: "", destinationId: "team" }, field), "/about#team");
    assert.equal(linkHref({ type: "collection", href: "", collectionId: "articles", recordId: "hello" }, field), "/journal/hello");
    assert.match(validateLinkValue({ type: "collection", href: "/invented", collectionId: "articles", recordId: "missing" }, { field }) ?? "", /no longer available/i);
    assert.equal(validateLinkValue({ type: "collection", href: "", collectionId: "articles" }, { field }), null);
    assert.match(validateLinkValue({ type: "collection", href: "", collectionId: "articles" }, { field, required: true }) ?? "", /required/i);
  });

  it("rejects unsafe schemes, malformed JSON, unsupported types, and control characters", () => {
    assert.match(validateLinkValue({ type: "url", href: "javascript:alert(1)" }) ?? "", /http\(s\) URL/i);
    assert.match(validateLinkValue({ type: "url", href: "//evil.test/path" }) ?? "", /http\(s\) URL/i);
    assert.match(validateLinkValue({ type: "url", href: "/" + "\\" + "evil.example" }) ?? "", /http\(s\) URL/i);
    assert.match(validateLinkValue("{broken json") ?? "", /valid JSON/i);
    assert.match(validateLinkValue(JSON.stringify({ type: "ftp", href: "ftp://example.test" })) ?? "", /supported link type/i);
    assert.match(validateLinkValue({ type: "url", href: "/safe\npath" }) ?? "", /control characters/i);
    assert.equal(validateLinkValue({ type: "file", href: "blob:https://example.test/id" }), "Local blob links cannot be saved.");
    assert.equal(validateLinkValue({ type: "file", href: "blob:https://example.test/id" }, { allowLocalBlob: true }), null);
  });

  it("requires section fragments and honors file accept metadata", () => {
    const noFragmentField = { ...field, sections: [{ id: "team", label: "Our team", href: "/about" }] };
    assert.match(validateLinkValue({ type: "section", href: "", destinationId: "team" }, { field: noFragmentField }) ?? "", /fragment/i);
    const emptyFragmentField = { ...field, sections: [{ id: "team", label: "Our team", href: "/about#" }] };
    assert.match(validateLinkValue({ type: "section", href: "", destinationId: "team" }, { field: emptyFragmentField }) ?? "", /fragment/i);
    const fileField: LinkField = { ...field, bucket: "documents", accept: ".pdf,application/pdf" };
    assert.equal(validateLinkValue({ type: "file", href: "/spec.pdf", fileName: "spec.pdf", contentType: "application/pdf" }, { field: fileField }), null);
    assert.match(validateLinkValue({ type: "file", href: "/spec.exe", fileName: "spec.exe", contentType: "application/octet-stream" }, { field: fileField }) ?? "", /not accepted/i);
  });
});
