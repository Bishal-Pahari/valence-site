---
title: Flutter host guide
description: What the Valence Flutter host does, how the local server and navigation lock work, and the Android and iOS setup it needs.
sidebar:
  order: 3
---

The host is the native half of a Valence app. `/valence init` generates it from the spec, and it goes through store review. It rarely changes, because everything the user sees lives in the web bundle.

:::note
Valence is in beta at version 0.3 and is skill-first: the Flutter runtime is written into your app against the spec and its test matrix. The plan is to extract it into a `valence` pub package once a first production app has proven it.
:::

## What the host does

| File in `lib/valence/` | Job |
|---|---|
| `server.dart` | A loopback HTTP server on `127.0.0.1` that serves the active bundle, with the per-launch nonce and the CSP header |
| `updater.dart` | Fetches the pointer and manifest, verifies in the canonical order, downloads changed files, runs the trial and rollback state machine |
| `store.dart` | SQLite: `kv`, `bucket`, `outbox` and `prefs`, with the seed import |
| `sync.dart` | Incremental pull, local-first push, and the sync lease |
| `bridge.dart` | Implements the generated `BridgeHandlers` and passes the server's nonce to `bridgeDispatch` |
| `host.dart` | The WebView widget, the navigation lock and the foreground-only ready timer |
| `bridge.g.dart`, `config.g.dart` | Generated. Never edited. |

The host depends on `webview_flutter`, `sqflite`, `path_provider`, `cryptography`, `http`, `url_launcher`, `connectivity_plus` and `workmanager`.

## The local server

The WebView loads `http://127.0.0.1:<port>/`. Serving from a local HTTP origin works with the ES modules and preloads that modern web builds emit, which `file://` does not allow in Android WebView.

- **Port.** `fnv1a32(appId + ":" + installId) % 20000 + 10000`, saved in the state file. The range avoids operating-system ephemeral ports. The port is not a secret; the nonce is what protects the bridge.
- **Bind failure.** If the saved port cannot be bound, the host picks a random free port, saves it and loads from that. It never loads a page from a port it does not own. Web storage for that origin is lost, which is acceptable because durable data lives in SQLite.
- **Nonce.** A 128-bit random value, created whenever the server binds a new port. The server inserts `<meta name="valence-nonce">` into the entry page, and `bridgeDispatch` rejects any message without it.
- **Serving.** GET and HEAD only. The path is mapped to a file hash through the active manifest. Unknown paths without a file extension get the entry file, so single-page routing works; anything else is a 404.
- **Headers.** The entry page gets `Cache-Control: no-store` and `Content-Security-Policy` from the signed manifest. Other files get `Cache-Control: public, max-age=31536000, immutable`. Every response has `X-Content-Type-Options: nosniff`.

### Resume

iOS can reclaim listening sockets while the app is suspended. On resume the host probes the server and rebinds the same port. If that works, the nonce is kept and the page keeps working. If it fails, the host rotates the port and the nonce and reloads the page, so an old page never runs against a port the host no longer owns.

## The navigation lock

- The main frame is locked to `http://127.0.0.1:<port>/`. Other URLs open externally through `url_launcher`.
- **No off-origin subframes.** A JavaScript channel cannot tell which frame sent a message, so embeds such as video and payments open externally or in a separate WebView that has no channel.

## Platform setup

**Android**

- A network security config that permits cleartext traffic to `127.0.0.1` only (`res/xml/network_security_config.xml`).
- `dataExtractionRules` and `fullBackupContent` that exclude the `valence/` directory from backups.

**iOS**

- The App Transport Security loopback setting. Never `NSAllowsArbitraryLoads`.
- `isExcludedFromBackup` on the `valence/` directory.

Excluding `valence/` from backups means a restored device starts clean from the built-in bundle, with a new install id. That avoids a cloned rollout cohort and a stale trial. The SQLite database lives outside `valence/` and is backed up, because it holds user data.

## Native value

Apple rejects apps that are only a repackaged website (guideline 4.2). Ship at least **two** of these in the host before the first store submission:

- an offline-first cold start;
- local notifications driven by synced data;
- a home-screen widget fed by a JSON snapshot;
- native share and haptics;
- a biometric lock.

On iOS, never put the SQLite file in a shared container: the system kills an app that suspends while holding a lock on a shared file. Write a small JSON snapshot into the App Group container for the widget instead.

## Background work

Sync runs on UI start, on resume, when connectivity returns, when the web app calls `sync.now`, and periodically through `workmanager` (at least every 15 minutes on Android, best effort through background tasks on iOS). Update transitions never run from a background isolate, so a background launch cannot consume a trial.

## Next

- [Data and sync](/docs/guides/data-and-sync/)
- [Update protocol](/docs/reference/update-protocol/)
- [Store policy](/docs/guides/store-policy/)
