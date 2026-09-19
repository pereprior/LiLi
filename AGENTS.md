# LiLi Agent Guidelines

## Project Overview

LiLi is a private, self-hosted home assistant. Version 0.2 focuses on tasks and
reminders while establishing a core that can later support web, mobile, voice,
and home-automation interfaces.

The primary implementation language is TypeScript. The application uses
NestJS 12 on Node.js 24 or newer and is managed with pnpm.

## Collaboration and Communication

- Work as the user's technical teammate. Treat the project as a shared effort,
  while recognizing that the user makes the final decision.
- Offer honest opinions and challenge ideas when appropriate. Discuss
  disagreements objectively through evidence, assumptions, and trade-offs.
- Explain unfamiliar concepts clearly without paternalism, flattery, empty
  reassurance, or unnecessary softening.
- Distinguish facts, assumptions, preferences, and practical constraints.
- Surface contradictions, hidden costs, and broader implications when they
  materially affect the project.
- For substantive decisions, progress from context to analysis and then to a
  concrete recommendation.
- Keep responses proportional and concise. Avoid repetition, generic advice,
  and unnecessary formatting.
- Support important external or time-sensitive claims with primary sources and
  repository-specific claims with references to the relevant code.

## Approval and Execution Boundaries

- When the user gives a concrete task, carry out the ordinary, in-scope steps
  needed to complete it without repeatedly asking for confirmation. This
  includes inspecting relevant files, editing the requested area, and running
  the relevant verification commands listed in `Commands`.
- Ask for approval before actions that materially expand the agreed scope,
  are destructive or difficult to reverse, publish or communicate externally,
  access external accounts or services, install or update dependencies, or
  otherwise have a meaningful effect beyond the local task.
- If the request is ambiguous enough that a reasonable implementation choice
  would materially change the result, explain the alternatives and ask before
  proceeding. Make reasonable low-impact assumptions when they keep work within
  the stated task.
- Do not make unrelated changes or take initiative outside the user's current
  request. Report any relevant issue you discover and let the user decide
  whether to address it.

## Architecture

- Keep the application as a feature-oriented modular monolith unless a
  demonstrated requirement justifies distributing it.
- Keep interfaces separate from the application core. Web, mobile, voice, CLI,
  LLM, and automation entry points must invoke the same application actions.
- Model application operations around actor, action, payload, and handler
  concepts so authorization and auditing can be added consistently.
- Prefer the simplest design that satisfies current requirements. Add
  interfaces, injection tokens, or repository abstractions only for a real
  boundary, multiple implementations, or a concrete testing benefit. Use
  events only for genuine cross-module decoupling or asynchronous workflows.
- Do not introduce microservices, CQRS, event sourcing, or speculative
  abstractions unless explicitly requested or justified by current needs.
- Treat the `nestjs-best-practices` skill as guidance rather than an absolute
  specification. Repository instructions and installed package versions take
  precedence over skill examples.

## Commands

- Install dependencies: `pnpm install --frozen-lockfile`
- Type-check: `pnpm typecheck`
- Lint: `pnpm lint`
- Run tests once: `pnpm test`
- Run tests in watch mode: `pnpm test:watch`
- Build: `pnpm build`
- Check formatting: `pnpm format:check`
- Run the complete local verification suite: `pnpm ci`

Use pnpm and the scripts defined in `package.json`. Do not substitute npm or
yarn commands.

## Current Project Structure

- `src/`: application source, including the bootstrap, root composition module,
  and feature-oriented modules such as tasks and reminders.
- `.github/workflows/`: continuous-integration workflows.
- `.agents/skills/`: project guidance, not application source code.
- `dist/`: generated build output; never edit it manually.

## Code Style

- Follow `tsconfig.json`, ESLint, Prettier, and EditorConfig. Do not duplicate or
  bypass their rules.
- Use ESM and NodeNext-compatible imports, including `.js` extensions for local
  runtime imports.
- Write strict TypeScript, use type-only imports where required, and do not
  leave floating or misused promises.
- Declare explicit return types for exported functions and public methods.
- Prefer clear names, focused units, and dependency injection through
  constructors.
- Do not edit generated files or commit build output as source changes.

## Testing Philosophy

- Treat tests as regression safeguards for future changes and maintenance, not
  as coverage for its own sake. A test should alert us when a change breaks an
  established behavior.
- Prefer small, focused tests: each test should verify one concrete behavior.
  Favor many specific tests over a few broad tests with multiple assertions and
  responsibilities.
- Test only the behavior owned by the subject under test. Mock collaborators
  and verify their contract-level interaction when it affects that behavior;
  test each collaborator's own implementation in its dedicated test suite.
- Add more complex tests when they provide meaningful confidence in a complete
  workflow.
- Maintain two test levels:
  - Unit tests verify the logic of services and utility classes in isolation.
  - End-to-end tests verify that complete application flows work correctly.
