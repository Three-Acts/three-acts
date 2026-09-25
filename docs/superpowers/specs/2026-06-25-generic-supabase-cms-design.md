# Generic CMS Design (historical baseline)

> **Status: Superseded.** This dated design snapshot describes the first mock-only CMS phase. The current architecture is provider-neutral and is documented in [`CONTEXT.md`](../../../CONTEXT.md), [ADR 0003](../../adr/0003-pluggable-cms-backend.md), and [ADR 0004](../../adr/0004-registry-driven-schema-and-public-content.md). Supabase is now one server-side Data Store/Blob Store implementation rather than the CMS's architectural destination.

## Goal

Build the CMS app as a generic collection editor shaped like Webflow's compact CMS workspace. This first phase used async interfaces with mock data so the UI and data flow were production-shaped without requiring a live provider.

## Architecture

The CMS centers on two boundaries:

- `Collection Registry`: app-owned configuration that allowlists editable collections. It defines table name, label, grouping, title field, list columns, editable fields, publish status support, and storage settings for asset fields.
- `CMS Data Adapter`: runtime interface used by the UI to list collections, list records, fetch one record, save a record, and upload asset-field files.

The first adapter was a mock adapter with realistic async functions and a purpose-built test collection set. The shipped architecture later split the browser-facing CMS Backend from server-side Data Store and Blob Store interfaces. The REST backend now reaches those stores through `apps/api`; Memory and Supabase implementations ship today, and other providers can implement the same interfaces.

The mock auth remained in place for this phase. A production auth provider is still an explicit project choice rather than a Supabase-specific requirement.

## UI

The desktop layout follows the supplied Webflow CMS reference:

- A compact dark left rail lists CMS collections, item counts, and optional groups.
- The collection table shows configured list columns, search, filter/select/export/import/settings controls, and a primary new-record action.
- Selecting a record opens a split workspace: left rail, narrow record list pane, and a main record editor pane.
- The editor header shows back navigation, record title, publish status, preview/action controls, and a publish action.
- Mobile is a functional fallback that collapses to one pane at a time. Desktop editorial density is the priority.

## Field Model

Each collection defines editor-facing fields in config. The initial field types are:

- `text`
- `slug`
- `textarea`
- `number`
- `boolean`
- `select`
- `datetime`
- `asset`
- `readonly`

List columns are configured separately from editable fields so tables remain compact. `titleField` is explicit, with fallback to `name`, `title`, then `id` when missing.

`asset` fields upload through the backend's storage adapter and store a file reference on the record. The mock backend returns a realistic mock reference; the REST backend delegates uploads to its configured Blob Store.

## Test Collection Set

Mock collections should be designed to exercise editor capability rather than mimic production content. The set should cover:

- Multiple collections and collection groups.
- Dense list columns.
- Required and optional fields.
- Slugs with URL preview.
- Enum-style selects and relation-like selects.
- Boolean toggles.
- Numeric fields.
- Date/time values.
- Asset upload fields.
- Readonly metadata.
- Published, not published, and queued-to-publish states.

## Data Flow

On load, the CMS reads the collection registry and asks the adapter for record counts and records for the active collection. Search filters the active collection client-side in the mock phase. Selecting a record fetches or resolves the full record, renders fields from config, and stores local draft edits until save.

Saving calls the adapter and updates local record state. Publishing updates lightweight publish status only; this phase does not include draft version history, scheduling, or a release queue.

## Error Handling

Adapter calls should expose loading and error states. The UI should show compact inline failures for collection loading, save failures, and asset upload failures. The mock adapter should be able to simulate asynchronous behavior but does not need configurable failure injection in the first pass.

## Testing

Verification for the first implementation:

- Typecheck and build the CMS app.
- Confirm the generic registry renders all test collections.
- Confirm table view and split record editor render from config.
- Confirm editing/saving updates mock data state.
- Confirm asset-field upload returns and displays a mock file reference.
- Confirm compact desktop layout visually matches the Webflow-style reference closely enough for iteration.
