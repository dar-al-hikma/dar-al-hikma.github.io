# Glossary check

Fails when a form [GLOSSARY.md](../../GLOSSARY.md) marks as wrong appears on the shelf or in a piece. The forms are the ones set as `code` in the glossary's *Not* lines; each is looked for in that language's text only, leaving out English glosses and markup. Plain notes in a *Not* line (forms that are right in some contexts) are not checked.

## Running

    node tests/glossary/glossary.test.js        # Node only; VERBOSE=1 prints every check

Exit status: 0 when nothing forbidden appears, 1 when something does, 2 when a file or a language table cannot be found. GitHub runs it on every pull request that touches the glossary, the shelf or a piece.

To forbid a form, add it to the entry's *Not* line in backticks: ``de: `der MC` ``. Only do so for a form that is wrong in every context; otherwise write it as a plain note.
