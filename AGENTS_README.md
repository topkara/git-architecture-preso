# Agent Instructions for git-architecture-preso

## Project Board

All work is tracked on **Project #5**: https://github.com/users/topkara/projects/5

## Commit Message Format

Every commit related to a project card **must** include project tags:

```
Brief summary of changes [project:card=Card Title]

- Detail 1
- Detail 2
- Detail 3

[project:status=Status]
```

**Status values:** `Todo`, `In Progress`, `Done`

**Example:**
```
Added authentication module [project:card=Build auth system]

- Implemented JWT token generation
- Added password hashing with bcrypt
- Created login/logout endpoints

[project:status=In Progress]
```

The `project-sync.yml` workflow will automatically update the project board when these tags are present.

## When to Create Issues

Create a GitHub issue when:
- Work spans **multiple commits** (feature, refactor, investigation)
- Starting a **research task** or investigation
- Reporting a **bug** that needs tracking
- Requesting a **decision** from the project owner

Use the issue templates in `.github/ISSUE_TEMPLATE/` to create properly labeled issues.

## Testing Requirements

- Write tests for new functionality in the `tests/` directory
- Run `pytest tests/ -v` before committing (Python projects)
- Ensure all existing tests pass before pushing
- The `test.yml` workflow runs automatically on push and PR

## Code Quality

- The `lint.yml` workflow enforces code style on push and PR
- For Python: code must pass `ruff check` and `ruff format --check`
- Fix lint issues before committing, not after

## Documentation Standards

- Update `README.md` when adding features or changing setup steps
- Add docstrings to public functions and classes
- Update `CHANGELOG.md` for notable changes
- Keep `CONTRIBUTING.md` current if contribution process changes

## Repository Structure

```
git-architecture-preso/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
├── scripts/       # Utility scripts
├── .github/       # Workflows and issue templates
├── README.md      # Project overview
├── CHANGELOG.md   # Version history
├── CONTRIBUTING.md # Contribution guidelines
└── LICENSE        # License file
```

## Secrets

This repo requires the `PROJECT_PAT` secret for project board sync. Set it with:

```bash
gh secret set PROJECT_PAT --body "$(gh auth token)" --repo topkara/git-architecture-preso
```
