---
title: Releasing guide
description: Sign a Valence bundle, upload files before the pointer, ramp the rollout from 10% to 100%, and roll back by releasing the last good commit again.
sidebar:
  order: 5
---

There are two kinds of release. A **store release** ships the host and the built-in bundle. An **OTA release** ships only a new web bundle, with no store review. Most releases are OTA.

## Keys

Bundles are signed with Ed25519. Generate a key once:

```sh
node valence/valence.mjs keygen
```

- The private key is written to `~/.valence/keys/<appId>.<keyId>.pem` with mode `0600`. The public key goes into `valence/keyring.json`, which is compiled into the host.
- `keygen` refuses to write a private key inside a git work tree, links included.
- It refuses to reuse a `keyId` already in `keyring.json`. To rotate keys, ship a host that has both keys, then switch signing to the new one.
- In CI, set the `VALENCE_SIGNING_KEY` secret to the PEM contents instead of keeping a file. Do not also pass `--key`.

**Never commit the private key, print it or paste it into a prompt.** `valence bundle` also refuses a key whose public half does not match `keyring.json`.

## Store release

For a submission to the stores (the first release, a new native capability, or a new feature area), build the built-in bundle with `--store`:

```sh
node valence/valence.mjs bundle --store
```

`--store` records the routes and the bridge schema the stores reviewed in `.valence/baseline.json`. From then on `codegen` keeps the schema additive-only and `bundle` warns about routes the stores have not seen. A plain `--builtin` build does not record a baseline, so if your CI builds store releases, have that job run `--store`. Commit `baseline.json` with the release.

## OTA release

1. **Check.** `codegen --check` passes and your web tests pass.
2. **Build and sign.** Build the web app, then:

   ```sh
   node valence/valence.mjs bundle
   ```

   This writes the signed bundle to `.valence/dist-ota/<appId>/`. It rejects native code, warns about a new top-level route since the last store build (stop and decide whether the change needs a store update), and re-verifies its own output.

3. **Commit `.valence/baseline.json`.** It holds `lastSeq`, which keeps `seq` increasing across machines and CI.
4. **Verify** (optional but cheap):

   ```sh
   node valence/valence.mjs verify --manifest .valence/dist-ota/<appId>/manifests/<seq>.json --files .valence/dist-ota/<appId>/files
   ```

5. **Stage the pointer** at a small rollout:

   ```sh
   node valence/valence.mjs pointer --channel production --rollout 10
   ```

   Without `--seq`, the pointer uses the highest manifest in `dist-ota`.

6. **Upload, in this order:** files, then manifests, then the pointer **last**, so no phone ever sees a pointer to missing files.
7. **Ramp** the rollout from 10 to 50 to 100 by running `pointer` again with a higher `--rollout` and uploading the pointer. Watch for ready timeouts and crash reports between steps.

### Upload layout

```
<OTA_BASE>/<appId>/channels/<channel>.json      pointer      Cache-Control: max-age=60
<OTA_BASE>/<appId>/manifests/<seq>.json         manifest     immutable
<OTA_BASE>/<appId>/manifests/<seq>.json.sig     signature    immutable
<OTA_BASE>/<appId>/files/<sha256-hex>           file bytes   immutable, content-addressed
```

With any static host, the same shape applies. For example, with the AWS CLI:

```sh
OUT=.valence/dist-ota/com.example.app
aws s3 sync "$OUT/files"     s3://my-ota/com.example.app/files     --cache-control "public, max-age=31536000, immutable"
aws s3 sync "$OUT/manifests" s3://my-ota/com.example.app/manifests --cache-control "public, max-age=31536000, immutable"
aws s3 sync "$OUT/channels"  s3://my-ota/com.example.app/channels  --cache-control "max-age=60"
```

Files are content-addressed, so uploading an unchanged file again is harmless. `wrangler r2 object put`, `gsutil rsync` and `rclone` work the same way.

### Options on `bundle`

| Flag | Use |
|---|---|
| `--floor N` | Raise the lowest `seq` a phone may run after this release. Use it only when a release fixes a security bug. It can never go back down. |
| `--requires-bridge N` | Set the minimum host bridge version this UI needs. Defaults to the schema `version`. |
| `--urgent` | Tell the host to emit `bundle.updateReady` so the web app can offer to apply the update now. Otherwise it applies at the next launch. |
| `--key <file>` | Sign with a specific private key file. |

## What phones do with it

Each phone checks the pointer on UI start, on resume and every 30 minutes in the foreground. A phone joins the rollout when `fnv1a32(installId + ":" + seq) % 100` is below the pointer's `rollout`. The install id is a random UUID created on first launch, never a device id. The new bundle becomes pending, runs as a trial on the next launch, and commits when the page calls `ready()`. See the [update protocol](/docs/reference/update-protocol/).

## Roll back

**Rolling back means rolling forward.**

1. Check out the last good web commit and build it.
2. Run `valence bundle`. It gets a new, higher `seq`.
3. Point the channel at it and upload.

Pointing the channel at an older `seq` only cancels downloads that are pending. Phones that already committed the bad bundle keep it until something newer arrives. Phones still trying a bad bundle revert on their own after two failed starts.

## What the pointer can and cannot do

The pointer is unsigned, so the rollout can change without re-signing. If your CDN is compromised, an attacker can freeze phones on their current bundle or change who is in the rollout. They cannot serve unsigned code, change any signed field, push a phone below its floor, or serve a manifest under a different `seq`.

## Next

- [Bundle format](/docs/reference/manifest/)
- [Troubleshooting](/docs/reference/troubleshooting/)
