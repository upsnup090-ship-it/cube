---
description: Debug workflow for errors and broken behavior
---
# Debug Workflow

Use this workflow when there is an error or broken behavior.

## Step 1: Capture the symptom
Describe:
- exact error
- where it appears
- expected behavior
- actual behavior

## Step 2: Reproduce or reason from evidence
Reproduce the issue if possible.
If not possible, explain what evidence is available.

## Step 3: Localize
Inspect only the most relevant files first.
Do not rewrite large sections.

## Step 4: Fix minimally
Fix the root cause with the smallest safe change.

## Step 5: Verify
Run the relevant check.
If a test exists, run the focused test first.

## Step 6: Report
Explain:
- cause
- fix
- files changed
- how to verify
