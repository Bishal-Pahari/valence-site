---
title: Typed bridge guide
description: Define bridge methods and events once in bridge.schema.json, generate the Dart and TypeScript code, and evolve the schema without breaking old apps.
sidebar:
  order: 2
---

The bridge is how your web app calls native code. You describe it once in `valence/bridge.schema.json`. `valence codegen` then writes the Dart interface for the host and the TypeScript types for the web app, so the two cannot drift apart.

## The schema

```json
{
  "version": 1,
  "methods": {
    "app.ready":    { "since": 1, "params": {}, "returns": "void" },
    "data.get":     { "since": 1, "params": { "bucket": "string", "key": "string" }, "returns": "json?" },
    "data.list":    { "since": 1, "params": { "bucket": "string", "prefix": "string?", "limit": "int?" }, "returns": "Row[]" },
    "sync.now":     { "since": 1, "params": { "buckets": "string[]?" }, "returns": "SyncResult" }
  },
  "events": {
    "sync.changed": { "since": 1, "payload": { "buckets": "string[]" } }
  },
  "types": {
    "Row":        { "key": "string", "value": "json", "usn": "int" },
    "SyncResult": { "buckets": "string[]", "changed": "int", "offline": "bool" }
  }
}
```

The wizard writes the full default schema. These are the built-in methods:

| Method | Params | Returns |
|---|---|---|
| `app.ready` | none | `void` |
| `app.info` | none | `AppInfo` (`platform`, `host`, `bridge`, `bundle`, `locale`) |
| `data.get` | `bucket`, `key` | `json?` |
| `data.list` | `bucket`, `prefix?`, `limit?` | `Row[]` |
| `data.put` | `bucket`, `key`, `value?` | `void` |
| `sync.now` | `buckets?` | `SyncResult` |
| `prefs.get` | `key` | `string?` |
| `prefs.set` | `key`, `value?` | `void` |
| `open.external` | `url` | `void` |
| `bundle.applyUpdate` | none | `void` |

And the events: `sync.changed` (`buckets`), `bundle.updateReady` (`seq`) and `app.resumed`.

### Type language

`string | int | num | bool | json | void | <TypeName>`

- A `[]` suffix means a list, and a `?` suffix means nullable. `json[]?` is a nullable list.
- `json` allows any JSON value, including null.
- `void` is allowed only as a bare return type.
- Method and event names look like `area.action`. Type names start with a capital letter. Field names start with a lowercase letter.

`codegen` rejects names that would break the generated code: Dart reserved words, reserved type names such as `Json`, `String` and `Methods`, and two names that become the same identifier (`dataX.get` and `data.xGet`).

## Generate the code

```sh
node valence/valence.mjs codegen
```

It writes three files:

| File | Contents |
|---|---|
| `<host>/lib/valence/config.g.dart` | `valenceAppId`, `valenceOtaBase`, `valenceSyncBase`, `valenceKeyring`, `valenceWritableBuckets` |
| `<host>/lib/valence/bridge.g.dart` | `hostBridgeVersion`, strict decoders, the `BridgeHandlers` interface, `bridgeDispatch`, `BridgeEvents` and `bridgeReplyScript` |
| `<web lib>/bridge.g.ts` | `Methods` and `Events` types, `METHOD_SINCE`, `EVENT_SINCE`, `BRIDGE_VERSION` |

**Never edit generated files.** Run `codegen --check` in CI: it fails when the generated files are stale. It ignores whitespace and trailing-comma changes, so `dart format` is fine, but a changed quote style counts as a difference. Keep generated files out of your formatter's scope.

## Add a native capability

1. Add the method to `bridge.schema.json`, with `since` set to a bumped `version`.
2. Run `node valence/valence.mjs codegen`.
3. Implement the new method of `BridgeHandlers` in `<host>/lib/valence/bridge.dart`.
4. Call it from the web app with `call()`, guarded by `has()` if older hosts are still in use.
5. Ship it as a **store release**, because the host changed.

## Evolve the schema safely

The schema is **additive only**. Once a build has gone to the stores, devices in the wild have that exact bridge.

`valence bundle --store` records the shipped schema in `.valence/baseline.json`. From then on, `codegen`:

- refuses to change or remove any method, event or type that a store build shipped;
- refuses to lower `version`;
- requires every new method and event to have `since` above the shipped version, so `has()` stays truthful on old hosts.

To change something, add a new method named `name.v2` with `since = version + 1`, and bump `version`. A plain `--builtin` build for local testing does not record a baseline.

## Security

The host treats the web side as untrusted input.

- Every message goes through the generated `bridgeDispatch` with the current nonce and strict decoders. Unknown fields, wrong types and non-JSON input are rejected.
- Scripts sent to the page are built only by the generated helpers, which use `jsonEncode`. Raw strings are never joined into a script.
- `open.external` accepts only `https:`, `mailto:` and `tel:` URLs.
- The `valence.` prefix is reserved. `prefs.get` and `prefs.set` reject `valence.*` keys with `E_DENIED`.
- `data.put` is allowed only on buckets listed in `writable`.

The wire format is in the [bridge protocol reference](/docs/reference/bridge-protocol/).
