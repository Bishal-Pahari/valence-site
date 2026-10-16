---
title: Bridge protocol
description: The wire format between your web app and the Valence host, with the JavaScript channel, replies, events, the nonce check and every error code.
sidebar:
  order: 5
---

You normally never touch this format. `client.ts` and the generated Dart code speak it for you. It is documented so you can audit the trust boundary or write a host in another runtime.

## Messages

| Direction | Mechanism | Payload |
|---|---|---|
| JS to host | `window.Valence.postMessage(str)`, a `JavaScriptChannel` named `Valence` | `{"id": n, "n": "<nonce>", "m": "data.get", "p": {…}}` |
| Host to JS (reply) | `runJavaScript` of `window.__valence&&window.__valence.r(<json>)` | `{"id": n, "ok": true, "v": …}` or `{"id": n, "ok": false, "e": {"code", "message"}}` |
| Host to JS (event) | `runJavaScript` of `window.__valence&&window.__valence.e("<name>",<json>)` | The event payload |

`id` is a number chosen by the page to match a reply to its call. `n` is the per-launch nonce. `m` is the method name and `p` its parameters.

## The nonce

The host's local server writes `<meta name="valence-nonce" content="…">` into the entry page, and the client sends that value with every message. `bridgeDispatch` rejects any message without the current nonce with `E_DENIED`. A page served by anything other than the app's own server, such as another app that grabbed the port, never receives the nonce and so never gets bridge access.

## Error codes

| Code | Meaning |
|---|---|
| `E_UNKNOWN` | The method is not in the generated table. |
| `E_PARAMS` | The parameters failed strict decoding. |
| `E_UNSUPPORTED` | The host's bridge is older than the method's `since`, or the method is not available on the web. |
| `E_DENIED` | A bad nonce, a write to a bucket that is not writable, a reserved `valence.` key, or a disallowed URL scheme. |
| `E_INTERNAL` | An unexpected failure inside the host. |

## The host is a trust boundary

- Every message goes through the generated `bridgeDispatch` with strict decoders. Unknown fields, wrong types and non-JSON input are all rejected, and `bridgeDispatch` never throws.
- Scripts sent to the page are built only by generated helpers that use `jsonEncode`. Raw strings are never concatenated into a script, and reply escaping round-trips awkward characters such as U+2028 and quotes.
- `open.external` accepts only `https:`, `mailto:` and `tel:` URLs. It rejects `javascript:` and `file:`.
- The `valence.` prefix is reserved for the host. `prefs.get` and `prefs.set` reject `valence.*` keys.

## Events

Events travel from the host to the page. The built-in ones:

| Event | Payload | When |
|---|---|---|
| `sync.changed` | `{ "buckets": string[] }` | A sync moved one or more buckets |
| `bundle.updateReady` | `{ "seq": int }` | An urgent bundle is pending |
| `app.resumed` | `{}` | The app returned to the foreground |

Background syncs cannot reach the WebView, so on resume the host compares each bucket's `max_usn` with the last value it sent and emits `sync.changed` for the ones that moved.

See the [bridge guide](/docs/guides/bridge/) for how to define your own methods and events.
