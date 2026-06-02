# Henry Modal And Conversation Archive Design

## Goal

Replace the compliance coworker drawer with Henry: a floating, movable, resizable in-app coworker modal that remains available throughout authenticated pages. Add a private conversation archive with restore and permanent-delete controls.

## Visual Direction

Henry must use the Flight Lyceum dashboard design language shown in the supplied reference screenshots:

- warm neutral application canvas
- large white rounded panels
- soft shadows
- minimal separators and borders
- circular close control
- dashboard typography and spacing
- deep green primary controls
- terracotta selected states and action accents
- pill-shaped buttons and inputs where appropriate

Reuse existing dashboard CSS variables and shared `easa-*` classes where they match. Add narrowly scoped Henry classes only when required for modal movement, resizing, or the screenshot-specific presentation.

## Henry Modal

Replace the right-side coworker drawer with a floating modal named `Henry`.

Desktop behavior:

- render above the current authenticated page
- allow users to drag the modal by its header
- allow users to resize from the bottom-right corner
- constrain the modal to the visible viewport
- enforce sensible minimum and maximum dimensions
- save the last size and position in browser local storage
- restore the saved size and position when Henry is reopened
- keep Henry open while users navigate between authenticated pages

Mobile behavior:

- use a full-screen modal
- disable dragging and resizing
- keep the close control visible

## Welcome Bubble

Show a small Henry welcome bubble once per login session on the first authenticated page:

- use the Flight Lyceum dashboard visual language
- position it near the persistent Henry launcher
- display `Hello, how can I help you?`
- clicking the bubble opens Henry
- clicking the dismiss control closes the bubble without opening Henry
- do not show the bubble again during the same login session
- allow the bubble to appear again after the user signs out and signs in again
- use session storage for the per-login-session dismissal state

The modal contains:

- Henry title and short compliance-focused subtitle
- close button
- archive-page link
- active-conversation list
- new-chat action
- archive-current-conversation action
- saved message timeline
- composer
- existing safe finding and draft-preview cards

## Conversation Persistence

Keep `CoworkerProvider` mounted inside the authenticated `AppShell`. This preserves:

- whether Henry is open
- the active conversation ID
- loaded messages
- modal size and position

Persist the active conversation ID in local storage. If the stored conversation no longer exists or is archived, automatically select the newest active conversation. If no active chats remain, show Henry's blank state.

## Archive Data Model

Add nullable `archived_at timestamptz` to `coworker_conversations`.

Active conversations:

- `archived_at is null`
- appear inside Henry

Archived conversations:

- `archived_at is not null`
- do not appear in Henry's active list
- appear on `/coworker/archive`

Messages remain attached to archived conversations. Permanent deletion removes the conversation and its messages through the existing cascade.

## Archive API

Extend private conversation APIs with owned, organisation-scoped actions:

- archive conversation
- restore conversation
- permanently delete archived conversation
- list archived conversations

All actions must verify:

- signed-in user
- organisation ownership
- user ownership
- valid UUID

Permanent delete must only operate on archived conversations.

## Archive UX

Inside Henry:

- add `Archive conversation`
- archiving the open conversation removes it from the active list
- automatically open the newest remaining active chat
- if no active chats remain, show blank state

Create `/coworker/archive` inside the authenticated dashboard shell:

- use dashboard-style white rounded cards
- list archived title and archive timestamp
- add `Restore`
- add `Delete permanently`
- require confirmation before permanent delete
- restore returns the chat to Henry's active list

## Safety

Preserve current coworker safety boundaries:

- chat tools remain read-only
- exploratory drafts remain preview-only
- review item creation requires an explicit click
- approval remains on the existing `/updates` screen
- messages remain server-written only
- conversation reads and lifecycle actions remain organisation- and user-scoped

## Testing

Add focused checks for:

- migration adds `archived_at`
- active list excludes archived chats
- archived list includes archived chats only
- archive, restore, and permanent-delete actions scope organisation and user
- permanent delete rejects active conversations
- archived conversations cannot receive new messages
- Henry open state survives authenticated route navigation
- welcome bubble appears once per login session and opens Henry when clicked
- modal drag and resize behavior
- local-storage size, position, and active-conversation restoration
- mobile full-screen behavior
- archive page restore and confirmation-gated permanent delete
