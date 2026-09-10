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

- Do not execute any shell command unless the exact command or command pattern
  is listed in `Commands`. For any other command, present the exact command and
  its purpose, then obtain explicit approval.
- Before every decision or action, describe it and obtain explicit approval,
  even if it is trivial, low-risk, reversible, conventional, or implied by a
  broader request. Approval covers only the exact action and scope presented;
  ask again if either changes.
- The user may temporarily waive the approval requirements above by including
  the exact token `free-coding`, enclosed in backticks, as an operational
  instruction for a specific task.
- When `free-coding` is active, execute commands, make implementation decisions,
  and take in-scope actions without requesting prior approval.
- The waiver applies only to that task and never carries over. Mentions in
  explanations, quotations, examples, or rule-editing requests do not activate
  it.
- Even when `free-coding` is active, remain within the scope of the task and do
  not treat it as authorization for unrelated, destructive, irreversible, or
  externally published actions.

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
