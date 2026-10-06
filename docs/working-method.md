# Working method

The project was specified before it was built, with
[OpenSpec](https://github.com/Fission-AI/OpenSpec), in `openspec/changes/add-adhd-test-funnel/`:
a proposal, behavior specs with scenarios, a design document and a task list. Implementation
followed the task list one group at a time with Claude Code:

1. Implement a task group.
2. A read-only **code-reviewer** subagent reviews the diff against the specs and the invariants of
   the design.
3. A read-only **qa-tester** subagent runs the checks and exercises the running system — `curl`
   and SQL for the API, a real browser for the web app — against the spec scenarios.
4. Fix what they found, then commit.

After the last group, both ran once more over the whole codebase and every spec scenario on the
Docker setup. The reviewer's non-blocking findings from that pass were then fixed: a format number
for the quiz document, a database guard on the facts of an attempt, and automated tests for the
web app.

Both subagents are defined in `.claude/agents/`. Their reviews found real problems that were fixed
before the commits: a way to sign a visitor in to someone else's account through a cross-site form,
a bypass of the rate limit through a forged header, a request that crashed sign-in, and several
tests that would have passed with the behaviour they were meant to prove removed.

Frontend work followed the `modern-web-guidance` skill (labelled inputs with autocomplete, native
radios in a fieldset, `details` for the FAQ, cascade layers, logical properties, visible focus,
reduced-motion and forced-colors support), and the design system was read from Figma through the
Figma MCP server.
