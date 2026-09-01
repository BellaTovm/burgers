---
name: OpenAPI Zod compatibility
description: OpenAPI schema choices must match the repository's installed Zod generation target.
---

When using the workspace's Orval Zod output, avoid OpenAPI `format: email` and `integer` response fields unless the generated code is confirmed compatible with the installed Zod version; this setup generated `zod.email()` and `zod.int()` while compiling against Zod 3.

**Why:** The code generator can successfully emit code that fails the repository typecheck when its newer Zod helpers are not available in the installed runtime.

**How to apply:** Prefer compatible primitive schemas or update the generator/runtime versions together, then run API codegen and the full workspace typecheck before relying on generated route schemas.