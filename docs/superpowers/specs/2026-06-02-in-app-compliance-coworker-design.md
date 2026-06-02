# In-App Compliance Coworker Design

## Purpose

Build a focused AI compliance coworker inside Flight Lyceum. The coworker lives in the authenticated app dashboard experience, answers grounded compliance questions, explains findings, previews draft manual updates, and creates review items only after explicit user confirmation.

Slack and external chat applications are out of scope. Users should not need a secondary application.

## Product Boundary

The coworker is an interaction layer over the existing compliance engine. It does not create a parallel approval workflow.

The existing app already provides:

- organization tenancy and role checks
- EASA ingestion and pipeline runs
- flight book storage and embeddings
- grounded manual retrieval
- AI findings and proposed updates
- update queue review
- approval, rejection, conflict detection, revision exports, and audit history

The coworker can research, explain, and preview. It cannot approve, reject, directly edit manuals, trigger external actions, or bypass the existing review queue.

## User Experience

Add a `Coworker` button to the authenticated application shell. It opens a persistent right drawer while keeping the current screen visible. The drawer stays open as the user navigates between signed-in application pages.

The drawer includes:

- conversation list
- `New chat` action
- saved private chat history for the current user
- suggested prompts for first use
- message timeline
- loading, empty, and recoverable error states
- grounded source links
- compact finding cards
- draft preview cards
- internal links to manuals, findings, and review items

Suggested first-use prompts:

```text
What changed in Part-FCL recently?
Which pending findings need attention?
Explain why this finding affects our training manual.
Draft wording for this manual section.
```

## Supported Intents

The first release uses a controlled intent router. Each message maps to one approved internal tool.

| Intent | Result |
| --- | --- |
| Ask manual question | Grounded answer with manual citations |
| Show pending findings | Short organization queue summary with links |
| Explain finding | Plain-English explanation with supporting evidence |
| Preview draft update | Draft-only proposed wording shown inside chat |
| Create review item | Explicit user-confirmed creation of a queue item |

The coworker must return a bounded fallback when it cannot classify a request or lacks evidence. It should explain what it can do and offer supported prompts.

## Draft-To-Queue Flow

1. User asks the coworker to draft wording for a finding or affected manual section.
2. Coworker retrieves the relevant finding, regulation evidence, and manual section.
3. Coworker displays a `Draft only` preview card containing:
   - current wording
   - proposed wording
   - rationale
   - citations
   - affected section
4. User can ask follow-up questions or request revised wording.
5. User clicks `Create review item`.
6. Coworker checks the user's organization membership and permitted role.
7. Coworker creates or reuses the existing queue item and writes an audit-log entry containing conversation provenance.
8. Coworker returns an `Open review item` link.
9. Approval or rejection happens only on the existing review screen.

## Architecture

### Application Shell

Extend the authenticated app shell with a client-side coworker drawer provider. The provider preserves open state while signed-in routes change.

Suggested component boundary:

```text
src/components/coworker/
- CoworkerProvider.tsx
- CoworkerLauncher.tsx
- CoworkerDrawer.tsx
- ConversationList.tsx
- MessageTimeline.tsx
- Composer.tsx
- SourceLinks.tsx
- FindingCard.tsx
- DraftPreviewCard.tsx
```

### Coworker Service

Add a focused server module:

```text
src/lib/coworker/
- classify-intent.ts
- orchestrate-message.ts
- tools.ts
- response-types.ts
```

Responsibilities:

- `classify-intent.ts`: map a user message and optional related entities to one supported intent
- `orchestrate-message.ts`: authenticate, load conversation context, invoke one controlled tool, persist messages, and return a structured response
- `tools.ts`: wrap existing grounded search, queue, finding explanation, draft preview, and queue-creation capabilities
- `response-types.ts`: define stable UI response payloads

### Reused Existing Capabilities

- Grounded answers reuse `src/services/search.ts` and `src/lib/ai/grounded-search.ts`.
- Finding explanations reuse `src/lib/ai/review-preview.ts` and retrieval helpers.
- Draft previews reuse existing proposed-update generation logic in `src/lib/ai/proposed-updates.ts`.
- Queue creation reuses the behavior currently exposed by `src/app/api/findings/add-to-queue/route.ts`.
- Approval remains in the existing updates API and review screens.

Shared service logic should be extracted where an existing API route currently owns reusable behavior. API routes remain thin adapters.
The extracted queue-creation service must accept provenance metadata so the coworker action can write the source conversation ID and source message ID to `audit_log`.

## API Surface

```text
GET    /api/coworker/conversations
POST   /api/coworker/conversations
GET    /api/coworker/conversations/[id]/messages
POST   /api/coworker/conversations/[id]/messages
POST   /api/coworker/actions/create-review-item
```

The message endpoint returns structured payloads rather than untyped prose:

```ts
type CoworkerResponse = {
  messageId: string;
  conversationId: string;
  intent:
    | "manual_question"
    | "list_pending_findings"
    | "explain_finding"
    | "preview_draft_update"
    | "unsupported";
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
};
```

Queue creation is intentionally a separate action endpoint. A normal chat message cannot mutate the review queue.

## Data Model

Add two Supabase tables:

```text
coworker_conversations
- id uuid primary key
- organization_id uuid not null
- user_id uuid not null
- title text not null
- created_at timestamptz not null
- updated_at timestamptz not null

coworker_messages
- id uuid primary key
- conversation_id uuid not null
- organization_id uuid not null
- user_id uuid not null
- role text not null
- intent text
- content text not null
- metadata jsonb not null default '{}'
- created_at timestamptz not null
```

`metadata` stores structured UI state such as:

- citations
- finding IDs
- proposed-update IDs
- affected manual section IDs
- draft-preview details
- internal links
- queue creation provenance

Add indexes for:

- conversations by user and most recently updated
- messages by conversation and creation time
- messages by organization and user

RLS rules:

- a user can read and write only their own conversations
- a user can read and write messages only within their own conversations
- organization membership must match the conversation organization
- server-side action routes still verify organization and role before queue mutation

## Permissions

- All signed-in organization users can ask grounded questions.
- All signed-in organization users can inspect pending findings and draft previews.
- Queue creation from the coworker is limited to `admin`, `editor`, and `compliance_manager`.
- Approval and rejection remain governed by the existing update-review permissions.

The queue-creation action must fail closed if the role is not allowed. The existing add-to-queue route currently accepts any authenticated organization member, so the shared queue-creation service and both callers must enforce the explicit role allowlist.

## Grounding And Safety

- Answers use stored evidence only.
- Answers show source links or citation labels.
- Missing evidence returns: `I could not find enough stored evidence to answer that.`
- Draft previews display `Draft only`.
- Chat messages never apply document changes.
- Queue creation requires a separate explicit user click.
- Created review items add an `audit_log` entry recording actor, conversation ID, and source message ID.
- AI-provider failures return recoverable errors without deleting or hiding saved messages.

## Rollout Plan

### Increment 1: Conversational Search MVP

- authenticated shell drawer
- private saved conversations
- message persistence
- grounded manual questions
- citations
- suggested prompts
- drawer persistence during signed-in navigation

### Increment 2: Compliance Context

- pending-finding summaries
- finding explanation cards
- retrieval-backed evidence
- internal navigation links

### Increment 3: Draft-To-Queue Workflow

- draft-only preview cards
- follow-up revision requests
- explicit `Create review item`
- queue creation provenance
- role checks
- `Open review item` handoff

## Error Handling

- Authentication failure: return `401` and close protected drawer data.
- Conversation ownership mismatch: return `404` to avoid leaking IDs.
- Organization mismatch: return `403`.
- Unsupported intent: return supported examples without calling mutation tools.
- Missing evidence: return a grounded insufficiency message.
- AI-provider failure: preserve user message and return a recoverable assistant error.
- Queue permission failure: return `403` and do not create or modify a review item.
- Existing queue item: reuse it and return its review link.

## Testing

Add:

- unit tests for intent classification
- unit tests for structured response mapping
- API tests for conversation ownership and organization isolation
- API tests for message persistence
- regression tests for queue creation permissions
- regression test confirming ordinary chat cannot mutate queue state
- browser test for drawer persistence during signed-in navigation
- browser test for grounded answer citations
- browser test for draft preview to queue item to review-screen handoff

## Out Of Scope

- Slack
- Microsoft Teams
- shared school conversations
- autonomous approval
- direct manual editing from chat
- code execution
- browser automation
- external tool integrations
- general-purpose assistant behavior
