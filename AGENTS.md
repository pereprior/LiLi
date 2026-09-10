# LiLi Agent Guidelines

## Project Overview

LiLi is a private, self-hosted home assistant. Version 0.2 focuses on tasks and
reminders while establishing a core that can later support web, mobile, voice,
and home-automation interfaces.

The primary implementation language is TypeScript. The application uses
NestJS 12 on Node.js 24 or newer and is managed with pnpm.

## Approval and Execution Boundaries

- Do not execute any shell command unless the exact command or command pattern
  is explicitly listed in the `Commands` section of this file.
- Before running any command that is not listed, present the exact command,
  explain why it is needed, and obtain the user's explicit approval.
- Before making any decision or taking any action, describe the proposed
  decision or action to the user and obtain explicit approval before executing
  it.
- This approval requirement applies even when the decision or action appears
  trivial, low-risk, reversible, conventional, or implied by the task.
- A broad task request is not blanket approval for individual implementation
  decisions or actions. Discuss and approve each one before execution.
- Approval applies only to the exact decision, action, and scope presented. Ask
  again if the approach or scope changes.
- The user may temporarily waive the approval requirements above by including
  the exact token `free-coding`, enclosed in backticks, as an operational
  instruction for a specific task.
- When `free-coding` is active, execute commands, make implementation decisions,
  and take in-scope actions without requesting prior approval.
- `free-coding` applies only to the task in which the user explicitly activates
  it. It does not carry over to later tasks, messages, or sessions.
- Mentions of `free-coding` in explanations, quotations, examples, or requests
  to define or modify this rule do not activate it.
- Even when `free-coding` is active, remain within the scope of the task and do
  not treat it as authorization for unrelated, destructive, irreversible, or
  externally published actions.

## Architecture

- Keep the application as a modular monolith unless a demonstrated requirement
  justifies distributing it.
- Organize application code by feature rather than by technical layer.
- Keep interfaces separate from the application core. Web, mobile, voice, CLI,
  LLM, and automation entry points must invoke the same application actions.
- Model application operations around actor, action, payload, and handler
  concepts so authorization and auditing can be added consistently.
- Prefer the simplest design that satisfies current requirements.
- Introduce interfaces, injection tokens, and repository abstractions only when
  they represent a real boundary, support multiple implementations, or provide
  a concrete testing benefit.
- Use events for genuine cross-module decoupling or asynchronous workflows, not
  as a replacement for straightforward method calls.
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

- `src/main.ts`: application bootstrap and global NestJS configuration.
- `src/app.module.ts`: root composition module.
- `src/<feature>/`: future feature modules such as tasks and reminders.
- `.github/workflows/`: continuous-integration workflows.
- `.agents/skills/`: project-scoped agent skills; these are guidance, not
  application source code.
- `dist/`: generated build output; never edit it manually.

## Code Style

- Write strict TypeScript compatible with the repository's `tsconfig.json`.
- Use ESM and NodeNext-compatible imports, including `.js` extensions for local
  runtime imports.
- Follow the existing ESLint, Prettier, and EditorConfig configuration instead
  of duplicating formatting rules in code.
- Use type-only imports where required by ESLint.
- Do not leave floating or misused promises.
- Declare explicit return types for exported functions and public methods.
- Prefer clear names, focused units, and dependency injection through
  constructors.
- Preserve the existing import ordering enforced by ESLint.
- Do not edit generated files or commit build output as source changes.
