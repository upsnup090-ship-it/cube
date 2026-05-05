---
description: Safety rules — secrets, destructive actions, databases
alwaysApply: true
---

# Safety Rules

## Never touch without direct permission
- `.env`, `.env.*`
- API keys, bot tokens, passwords, private credentials
- production deploy settings
- database reset / destructive migrations
- payment/auth/security core
- generated secrets and private certificates

## Destructive actions
- Do not delete files without explicit confirmation.
- Do not run destructive shell commands without explicit confirmation.
- Do not run long-running processes unless the user approves.
- Do not install new dependencies unless they are necessary and explained.

## Databases
- Inspect databases in read-only mode first.
- Before migrations, explain the migration and backup strategy.
