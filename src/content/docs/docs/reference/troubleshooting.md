---
title: Troubleshooting
description: Error messages from the valence CLI and the host, with what each one means and how to fix it, plus why a phone may not take an update.
sidebar:
  order: 6
---

CLI errors print as `valence: <message>` and exit with status 1. This page lists the messages you are most likely to meet.

## Configuration

| Message | Cause and fix |
|---|---|
| `appId must look like com.example.app` | `appId` in `valence.config.json` needs at least two dot-separated parts that start with a letter. |
| `web.out and web.lib are required` | Add both paths to `valence.config.json`. |
| `host.dir is required` | Add `host.dir`, for example `"mobile"`. |
| `writable bucket "x" must not be in data` | A bucket is either read-only (`data`) or writable (`writable`), not both. Writable buckets never change schema. |

## Keys

| Message | Cause and fix |
|---|---|
| `refusing to write a private key inside a git work tree` | The key directory is inside a repository. Use the default `~/.valence/keys`. |
| `keyId "k1" is already in keyring.json` | Get that key's private half from your secret store, or set a new `keyId` to rotate. |
| `key already exists: <file>` | A key file with this name exists. Set a new `keyId`. |
| `signing key not found: <file>` | Run `valence keygen`, or set `VALENCE_SIGNING_KEY`. |
| `both VALENCE_SIGNING_KEY and --key are set` | Pass only one. |
| `the signing key does not match keyring.json["k1"]` | The private key is not the pair of the committed public key. Use the right key, or rotate. |
| `keyring.json is empty. Run "valence keygen" first.` | `codegen` needs at least one public key to compile into the host. |

## Building a bundle

| Message | Cause and fix |
|---|---|
| `web build output not found: <dir>` | Build the web app first, and check `web.out`. |
| `entry index.html is missing from <dir>` | The entry file is not in the build output. Check `web.entry`. |
| `native code is not allowed in an OTA bundle: <file>` | A file with a native extension is in your build. Remove it. See the [store policy guide](/docs/guides/store-policy/). |
| `--floor N is below the current floor` | The floor only goes up. Use a value at least as high as the one in `baseline.json`. |
| `floor N is above this bundle's seq` | The floor cannot exceed the bundle's own `seq`. |
| `warning: new top-level route since the last store build` | Not an error. A new feature area should ship with a store update. Decide before releasing. |

## Verifying

| Message | Cause and fix |
|---|---|
| `bad manifest signature` | The manifest was changed after signing, or signed with a key that is not in the keyring. Rebuild. |
| `unknown keyId` | The manifest names a key that is not in `keyring.json`. |
| `manifest is for X, not Y` | A bundle for another app. Check `appId`. |
| `unsupported manifest format` | The host or tool is older than the bundle. Update it. |
| `unsafe path in manifest` | A file path has `..`, a leading `/` or a backslash. |
| `missing file` / `hash mismatch for <file>` | A file is absent or changed after signing. Rebuild and upload everything again. Check `.gitattributes` if the built-in bundle was changed by line-ending conversion. |

## Pointer and seed

| Message | Cause and fix |
|---|---|
| `--rollout is required (0..100)` | Pass `--rollout`. |
| `no manifests in dist-ota; pass --seq` | Run `valence bundle` first, or give `--seq`. |
| `bad channel name` | Use letters, digits, `_` and `-`. |
| `schema N does not match valence.config.json data.<bucket>` | The seed file's `schema` must equal the bucket's number in `data`. |
| `every row needs a string "k"` | Seed rows look like `{k, v, u, d}`. |
| `warning: data bucket "x" has no seed file` | The bucket is empty until the first online sync. Add a seed file to make the first launch work offline. |

## Bridge schema

| Message | Cause and fix |
|---|---|
| `generated files are stale, run "valence codegen"` | Run `codegen` and commit the result. |
| `unknown type "X"` | Define it under `types`, or use a built-in type. |
| `bad or reserved field name` / `bad or reserved type name` | The name collides with Dart or a reserved word. Rename it. |
| `<kind> "x" shipped in a store build and cannot be removed` / `cannot change` | The schema is additive-only. Add `x.v2` with a higher `since`. |
| `is new since the store build, so it needs since > N` | Give new methods `since` above the shipped `version`, and bump `version`. |
| `schema version went down` | Never lower `version`. |

## A phone does not take an update

Work down the list. Each step is a reason the phone may rightly stay put:

1. **Pointer.** Is the pointer uploaded last, with a `seq` above the phone's `current`?
2. **Rollout.** A phone joins only when `fnv1a32(installId + ":" + seq) % 100` is below `rollout`. At 10%, most phones wait.
3. **Bad list.** After two failed trials the phone adds the `seq` to `bad` and ignores it. Release a fixed build, which gets a new `seq`.
4. **Floor.** A bundle below the phone's floor is refused.
5. **Requirements.** The bundle may need a newer bridge (`requires.bridge`) than the installed host, or data the phone has not synced. Offline phones wait for the data.
6. **Verification.** A failed check logs and stops. Run `valence verify` against what you uploaded.
7. **Timing.** Phones check on UI start, on resume and every 30 minutes in the foreground, and a new bundle applies at the **next** launch, not mid-session (unless it is `urgent`).

## A bundle never commits

The page must call `ready()` after its first meaningful paint, from the page that is serving the trial. If it does not arrive within 15 seconds of foreground time, the phone counts a failure. Check that `connect()` and `ready()` run in the root layout, that no startup code throws, and that `ready()` is not blocked behind a network request.

Still stuck? Open an issue in the [Valence repository](https://github.com/Bishal-Pahari/valence/issues).
