# Refactor Workflow

Use this workflow only when refactoring is explicitly requested.

## Step 1: Define reason
Explain why refactoring is needed:
- duplication
- complexity
- broken boundaries
- maintainability
- testability

## Step 2: Define limits
List what must not change:
- public API
- behavior
- file names
- data format
- routes/events/contracts

## Step 3: Plan small steps
Prefer several small changes over one large rewrite.

## Step 4: Refactor
Keep behavior the same unless the user requested behavior changes.

## Step 5: Verify
Run tests/build or explain why not possible.

## Step 6: Report
Explain what got simpler and what behavior was preserved.
