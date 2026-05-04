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
