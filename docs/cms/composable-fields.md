# Composable CMS fields

The schema registry drives the editor, validation and persistence. Omitted
`cardinality` means `single`, preserving existing records. Set `cardinality:
"multiple"` on a primitive or object for an ordered list; `minItems`, `maxItems`
and `itemRequired` gate publishing. Drafts may be incomplete; malformed types,
unsafe links, duplicate references and invalid structured JSON are rejected on
save. Error messages identify the failing list item.

## Wire and storage contract

All backing columns remain scalar CMS values. A multiple field uses JSON array
**text** whose elements are the same scalar values accepted by its single editor.
For example multiple numbers store `[12,18]`, booleans `[true,false]`, and references
`["service-strategy","service-film"]`. Typed images/videos/files remain their
existing JSON strings inside the array; metadata is not flattened into URLs.

An object uses JSON text `{ "id": "stable-item-id", "values": { "name": "Nandi",
"featured": true } }`. Repeated objects are an array of these JSON strings. IDs
are created once when adding an item and survive edits, reorder, save, reload and
publication. Duplicate object identities are rejected. The object `fields` array
contains ordinary field definitions; validation and rendering recurse through
the same functions as top-level fields. Protected children are preserved by
identity, including after reordering. Upload paths such as
`testimonial.portrait` resolve against the child schema and use its bucket,
accepted types and upload limits.

Existing `image-gallery` fields retain their existing `ImageValue[]` wire shape;
new multiple image fields use the generic shell. No implicit migration rewrites
legacy gallery data. Multiple number/boolean/select columns use text. Schema
diffs record cardinality and warn when it changes: convert existing scalar/array
values explicitly rather than assuming a SQL cast changes their meaning.

## References

`{ type: "reference", collectionId: "clients", ... }` stores the target record ID.
The single control lists and searches target records by their title; multiple
references reuse the ordered shell, hide already-selected options and reject
duplicates server-side. The API checks that targets exist on save/import and
before publishing, including nested references. Deleted targets retain their ID
in the editor and show an explicit missing-item message; editors clear or replace
them. Resolution preserves order and returns null for missing targets. Deleting
a target does not cascade into source records. Concurrent deletes can still
create dangling IDs between validation and a write because the provider-neutral
store contract has no cross-collection transaction; the missing-target state is
intentional. Database-specific foreign-key policy can strengthen this later.

## Markdown

`type: "markdown"` stores the exact source text. The CMS exposes source plus a
rendered preview with headings, paragraphs, emphasis, links, lists, block quotes,
fenced code and GitHub-flavored Markdown. Rendering uses `react-markdown` and
`remark-gfm`: raw HTML is skipped, text is escaped and the default URL transform
rejects executable schemes. HTML is never passed to `dangerouslySetInnerHTML`.
Unsafe source may be retained as text but cannot execute in the preview. A public
site rendering this source must use the same safe policy; storing Markdown does
not make arbitrary HTML safe for a different renderer.

## Realistic fixture

The Studio group adds Clients, Services and Case studies. Cedar House Guest Lodge
and Open Table Community Kitchen demonstrate client/service relationships,
Markdown project stories, typed cover media, ordered films and press downloads,
launch dates, duration, featured switches, sectors, links, a composed testimonial
and repeated measurable results. This fictional portfolio is loaded by both the
mock backend and local API stores. External footage is MDN's CC0 flower sample;
placeholder images and project links are demo assets, not client deliverables.

Automated coverage uses this same seed through memory and fresh file-store
instances, along with mock persistence, nested validation, Markdown rendering,
relationship errors, list operations and schema migration checks.
