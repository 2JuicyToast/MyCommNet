---
name: Replit package firewall
description: Safe resolution strategy for pnpm package tarball 403s during fresh Replit imports.
---

When a fresh pnpm install fails because Replit's package firewall denies an old locked tarball, inspect the affected dependency chain and check for a newer safe release of its direct parent. Refresh the dependency and lockfile through the supported package-management path; do not change registries or bypass the firewall.

**Why:** During this setup, several outdated locked transitive versions were denied while refreshed dependency trees installed successfully, and a subsequent frozen workspace install passed.

**How to apply:** Use this only when install logs show a package-firewall 403. Follow the package-management skill's recovery order, preserve the workspace's minimum-release-age safeguards, and verify with a frozen install afterward.
