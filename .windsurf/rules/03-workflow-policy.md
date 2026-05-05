---
description: Workflow policy — before/during/after editing, verification gates
alwaysApply: true
---

# Workflow Policy

## Before editing
- Read `00_START_HERE.md` if it exists.
- Read `AGENTS.md` if it exists.
- Read `README.md` if it exists.
- Check the files directly related to the task.
- Identify the smallest safe change.

## During editing
- Stay inside the task scope.
- Do not reformat unrelated files.
- Do not rename public APIs or move files unless required.
- Preserve existing behavior unless the task says to change it.

## After editing
- Run the smallest relevant verification command.
- If tests/build cannot be run, explain why.
- Update `11_CHANGELOG.md` when the change is meaningful.
- **Keep documentation in sync with code**: update relevant docs (`docs/*.md`, `README.md`, milestone docs) immediately after any code change that affects behaviour, API, data model, or decisions.

## Required Verification Checks

Run these checks for implementation tasks before commit:

1. `npx prisma validate`
2. `npx prisma migrate status`
3. `npx prisma db seed`
4. `npm run type-check`
5. `npm run lint`
6. `npm run build`

If any check cannot run, document why and describe risk.
