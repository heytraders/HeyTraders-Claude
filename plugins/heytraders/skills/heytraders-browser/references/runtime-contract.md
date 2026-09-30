# Runtime contract

## Ownership

| Concern | Owner |
| --- | --- |
| Commands, schemas, readiness, identifiers, and application state | The live HeyTraders command catalogs, returned by `help list` and `help describe` |
| Backend-backed content, execution, and quotas | HeyTraders services reached through those commands |
| Sign-in and account controls | The HeyTraders UI, operated by the user |
| Transport and the scope available to Claude | This plugin |

This plugin keeps no copy of the command catalog. Command names and schemas come from live discovery.

## Discovery

- `help list` with no domains returns the domain index.
- `help list` with `args.domains` returns the command summaries for those domains. Request only the domains the task needs, because the full catalog is large.
- `help describe` with `args.commands` returns complete input and output contracts for exactly those commands. One call can describe commands from several domains.
- Reuse contracts that are already available in the conversation. Discover again after `unknown-command`, a schema validation error, or a changed page.

Commands are domain-prefixed canonical selectors such as `<domain> <command>`. Put every operand in `args`. Mixing positional operands with non-empty `args` is rejected.

## Results

A successful result carries `ok: true` and `data`. A mutation also returns a `receipt` with these fields:

- `status`: `completed`, `accepted`, or `awaiting_confirmation`
- `effect`: `changed`, `unchanged`, or `pending`
- `userActionRequired`, `target`, and `resource`

A failed result carries `ok: false`, an `error` code, and often a `message`. `data.commandStage` shows whether the command stopped during preparation, before dispatch, or at admission. A parse failure comes back with `domain: "system"` and names the discovery command to use.

List commands page with either `offset` and `limit`, or `cursor` and `nextCursor`, according to their contracts. Follow the pagination fields until the task has the data it needs.

## Compatibility

The bridge function requires facade version 7 or newer, a safe integer, and exact origin `https://hey-traders.com`. Version 7 uses domain-prefixed selectors, and `help list` and `help describe` are its discovery commands. Earlier bare `help` and `describe` commands are rejected with `unknown-command`.

The application also registers a WebMCP tool named `heytraders_cli` when the browser provides `document.modelContext`. If a host exposes that page tool, it calls the same `window.__bridge.request` entry point with the same `{ command, args }` input.

## Cancellation and retries

The bridge function sends each request once and has no cancellation channel. When the browser tool stops waiting, the application may still complete the operation.

A command whose schema requires `requestId` expects a caller-generated UUID. Generate it once for the logical operation. Reuse it only to retry that same input. After an unknown outcome, read the relevant state before deciding any further action. Relevant commands include the active-backtest list, execution status, and live-strategy list.
