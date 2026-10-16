---
title: Web app guide
description: Call native features from your web code with the Valence client, signal first paint with ready(), and run the same build as a website.
sidebar:
  order: 1
---

Your web app talks to the host through one file, `client.ts`, which the wizard copies into your app. After that file is copied, it is yours to edit. It exports six functions and one error class.

:::note
Web code should reach native features **only** through `client.ts`. That keeps the typed contract intact and keeps the browser fallbacks in one place.
:::

## The client API

```ts
import { BridgeError, call, connect, has, inHost, installShim, on, ready } from '$lib/valence/client';
```

### `call(method, params?)`

Calls a bridge method and returns a promise. Method names, parameters and return types come from the generated `bridge.g.ts`, so a wrong name or a missing parameter does not compile.

```ts
const row = await call('data.get', { bucket: 'schedule', key: 'day-1' });
const sessions = await call('data.list', { bucket: 'schedule', prefix: 'day-', limit: 50 });
await call('prefs.set', { key: 'theme', value: 'dark' });
```

Parameters are optional only when every field in the schema is optional. `call('data.get')` with no parameters is a compile error.

If the host is older than the method, the promise rejects with `E_UNSUPPORTED` before anything is sent. Check first with `has()` when a method is newer than the oldest host still in use.

### `connect()`

Call once at startup, before `has()`. It asks the host for its bridge version with `app.info`. In a plain browser it does nothing.

### `has(method)`

Returns `true` when the method is available. In the host, that means the host's bridge version is at least the method's `since`. In a browser, it means a shim implements it.

```ts
if (has('open.external')) await call('open.external', { url: 'https://example.com/help' });
```

### `on(event, handler)`

Subscribes to a host event and returns an unsubscribe function. The built-in events are `sync.changed` (with the buckets that moved), `bundle.updateReady` (with the new `seq`) and `app.resumed`.

```ts
const stop = on('sync.changed', ({ buckets }) => {
  if (buckets.includes('schedule')) reload();
});
```

### `ready()`

Tells the host the first meaningful paint happened. **This is what commits a trial bundle.** See [the update protocol](/docs/reference/update-protocol/). If a bundle misses `ready()` twice, phones drop it. In a browser it resolves immediately.

### `inHost()` and `installShim()`

`inHost()` is `true` inside the Valence host and `false` in a normal browser. `installShim()` registers browser fallbacks, covered below.

### `BridgeError`

Every rejected call is a `BridgeError` with a `code`: `E_UNKNOWN`, `E_PARAMS`, `E_UNSUPPORTED`, `E_DENIED` or `E_INTERNAL`. See the [bridge protocol](/docs/reference/bridge-protocol/#error-codes).

```ts
try {
  await call('data.put', { bucket: 'notes', key: 'n1', value: { text: 'hi' } });
} catch (e) {
  if (e instanceof BridgeError && e.code === 'E_DENIED') showReadOnlyMessage();
}
```

## Start up in the right order

In your root layout: `connect()` first, then load your data, then `ready()` once the first meaningful content is on screen.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  import { call, connect, on, ready } from '$lib/valence/client';

  let day = $state<unknown>(null);
  const load = async () => (day = await call('data.get', { bucket: 'schedule', key: 'day-1' }));

  onMount(async () => {
    await connect();
    await load();
    await ready();
    return on('sync.changed', ({ buckets }) => buckets.includes('schedule') && load());
  });
</script>
```

## Use the same build as a website

When `window.Valence` is absent, `call()` routes to your **shim**. A shim implements the methods that make sense in a browser with `fetch` and web storage, and every other method throws `E_UNSUPPORTED`.

```ts
// shim.ts
import { installShim } from './client';

installShim({
  'prefs.get': async ({ key }) => localStorage.getItem(`prefs:${key}`),
  'prefs.set': async ({ key, value }) => {
    if (value === null) localStorage.removeItem(`prefs:${key}`);
    else localStorage.setItem(`prefs:${key}`, value);
  },
  'data.get': async ({ bucket, key }) => (await fetch(`/api/${bucket}/${key}`)).json(),
});
```

Because one build serves both, you ship the website and the app UI from the same code.

## Rules for web code

1. **Durable data goes in native SQLite** through `data.*` and `prefs.*`. `localStorage` and IndexedDB are only a cache inside the app.
2. **Call `ready()` after the first meaningful paint**, on every release.
3. **No iframes to other origins and no CSP meta tag.** The host sends a strict Content-Security-Policy header taken from the signed manifest. If your app calls API origins other than `sync.base`, list them in `web.connect` in `valence.config.json`.
4. **Open external links with `open.external`**, which accepts only `https:`, `mailto:` and `tel:`.
5. **Never put native code in the build output.** `valence bundle` rejects `.so`, `.dex`, `.jar`, `.dylib`, `.framework` and similar files.
6. **Use relative-safe asset paths.** The bundle is served from `http://127.0.0.1:<port>/`, and unknown paths without a file extension fall back to the entry page, so single-page routing works.

## Next

- Define your own native methods in the [bridge guide](/docs/guides/bridge/).
- Read and write data with the [data and sync guide](/docs/guides/data-and-sync/).
