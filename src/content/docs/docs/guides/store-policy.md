---
title: Store policy guide
description: What Apple and Google allow for downloaded JavaScript in a WebView, the rejection traps to avoid, and the rules Valence enforces on every release.
sidebar:
  order: 6
---

Shipping UI over the air is allowed on both stores, within limits. This page quotes the policy text (Apple's agreement retrieved 2026-10-14, the rest 2026-10-16), lists the common rejection traps, and shows which checks Valence runs for you. It is not legal advice. Policies change, so check the current text before you submit.

## What the stores say

**Apple App Review Guidelines, 2.5.2**

> Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps.

**Apple Developer Program License Agreement, §3.3.1(B)**

> Interpreted code may be downloaded to an Application but only so long as such code: (a) does not change the primary purpose of the Application by providing features or functionality that are inconsistent with the intended and advertised purpose of the Application (b) does not bypass signing, sandbox, or other security features of the OS; and (c) for Applications distributed on the App Store, does not create a store or storefront for other Applications.

**Google Play, Device and Network Abuse policy**

> An app distributed via Google Play may not modify, replace, or update itself using any method other than Google Play's update mechanism. Likewise, an app may not download executable code (such as dex, JAR, .so files) from a source other than Google Play. This restriction does not apply to code that runs in a virtual machine or an interpreter where either provides indirect access to Android APIs (such as JavaScript in a webview or browser).

The same policy flags a WebView with an added JavaScript interface that loads untrusted web content.

Read together: Apple's agreement allows downloaded interpreted code and Google exempts JavaScript in a WebView, but Guideline 2.5.2 is the stricter line. Keep over-the-air releases to fixes, content and the presentation of features the reviewed build already has. Ship new features with a store build. Reviewers judge each app, so no tool can guarantee approval.

## What that means for you

| Allowed | Not allowed |
|---|---|
| HTML, CSS and JavaScript bundles downloaded into a WebView | Downloading native code (`.so`, dex, JAR, dylib, frameworks) |
| Data updates: new SQLite rows, corrections to bundled data | OTA changes that add features or alter the app's primary or advertised purpose |
| A bridge from your own first-party UI to native APIs | A storefront of other developers' mini apps |
| | A JavaScript interface on a WebView that loads untrusted or `http://` content |

## The rules Valence enforces

- **No native code in a bundle.** `valence bundle` rejects any file with one of these extensions anywhere in its path: `.so`, `.dex`, `.jar`, `.apk`, `.aab`, `.ipa`, `.dylib`, `.framework`, `.a`, `.o`, `.class`, `.exe`, `.dll`. `.wasm` is allowed because the WebView's JavaScript engine runs it, but `bundle` warns so a reviewer knows it is there.
- **An OTA must not change the app's purpose.** `baseline.storeRoutes` records the routes of the bundle last submitted with a store build. `valence bundle` warns when a release adds a new top-level route. New feature areas should go out with a store update.
- **The bridge is reachable only from your own pages.** The main frame is locked to `http://127.0.0.1:<port>/`, other URLs open externally, there are no off-origin subframes, and every message needs the per-launch nonce.
- **First launch never blocks on a download.** The built-in bundle plus the seed make the app usable offline.

## Avoiding the "repackaged website" rejection

Apple guideline 4.2 asks for features, content and UI that go beyond a repackaged website. The host must add real native value. Ship at least two of: an offline-first cold start, local notifications, a home-screen widget, native share and haptics, or a biometric lock. The reviewer agent checks this during `/valence init` and `/valence doctor`.

## Out of scope

Third-party mini-app stores are not supported. If your app ever hosts other developers' bundles, Apple guidelines 4.7.1 to 4.7.5 apply in full: Apple's permission before exposing native APIs, a content index and age gating.

## Next

- [Releasing](/docs/guides/releasing/)
- [Flutter host guide](/docs/guides/host/#native-value)
