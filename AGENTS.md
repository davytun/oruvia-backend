# Oruvia

## About Oruvia

Oruvia is a Proptech and Real Estate Marketplace built for the Ogun Digital Summit Hackathon, under the Proptech & Real Estate track.

Oruvia connects property seekers with verified real estate agents and landlords across Nigeria.

The name Oruvia comes from *òrùlé* (Yoruba for "roof") and *via* (Latin for "way").

**Tagline:** Oruvia: Your path to a roof.

## Purpose

This document establishes the general rules and expectations for AI coding agents working on Oruvia.

## Mandatory Documentation and Skills Review

**Before starting any task, the AI agent MUST read and understand the following documents:**

1. `AGENTS.md`
2. `docs/requirements.md`
3. `docs/roles.md`

The agent must also:

- Inspect the available skills relevant to the current task.
- Read the instructions for each relevant skill before applying it.
- Follow applicable skill instructions throughout the task.
- Review any additional documentation relevant to the requested feature.

This requirement applies to every task, including new features, modifications, bug fixes, refactoring, and code reviews.

Do not begin implementation before completing this review.

If any required document or relevant skill is unavailable, inform the user rather than silently ignoring the requirement.

## Mandatory Planning and User Approval Workflow

**Before writing or modifying any implementation code for a feature or architectural change, the AI agent MUST:**

1. **Ask Clarifying Questions First**: Never assume requirements or jump straight into writing code. Ask the user clear, focused questions to gather all necessary details about how the feature should work.
2. **Write a Plan Artifact**: Once all questions are answered and requirements are clear, write a structured implementation plan (covering database schema, endpoints, permissions, and file structure) and present it to the user for review.
3. **Wait for Explicit Approval**: Do NOT execute or write code until the user explicitly approves the plan.

## General Rules

### 1. Understand Before Acting

- Review the required project documentation.
- Understand the requested feature before making changes.
- Inspect existing work before proposing modifications.

### 2. Follow Instructions

- Follow the requirements defined in the project documentation.
- Do not invent product requirements.
- Do not make significant product decisions without approval.
- Ask for clarification when requirements are unclear.

### 3. Work Incrementally

- Focus on the task explicitly requested.
- Do not implement unrelated features.
- Do not expand the scope of a task without approval.
- Do not implement future roadmap features unless requested.

### 4. Preserve Existing Work

- Do not unnecessarily modify existing functionality.
- Do not remove existing features without approval.
- Do not restructure the project without a clear reason.
- Avoid unnecessary files and folders.

### 5. Documentation

- Keep project documentation consistent with approved requirements.
- Do not independently change established product decisions.
- Update the relevant documentation when an approved requirement changes.

### 6. User Roles

- User roles and permissions are defined separately in `docs/roles.md`.
- Do not independently create, modify, or expand user permissions.
- Follow the approved role definitions.

### 7. Completion Reporting

At the end of each task:

- Summarize what was completed.
- Identify any incomplete work.
- Mention any unresolved requirements.
- Do not claim that something works unless it has been verified.

## Product Direction

Oruvia focuses on property discovery, trustworthy listings, property inquiries, and inspection booking.

The product should remain simple, reliable, convenient, and suitable for mobile users.

The primary objective is to make finding and inspecting properties in Nigeria easier and more transparent.

**Oruvia: Your path to a roof.**