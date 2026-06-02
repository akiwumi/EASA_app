export type CoworkerIntent =
  | "manual_question"
  | "list_pending_findings"
  | "explain_finding"
  | "preview_draft_update"
  | "unsupported";

export interface CoworkerCitation {
  label: string;
  href: string;
  excerpt: string;
}

export type CoworkerCard =
  | {
      type: "finding";
      findingId: string;
      title: string;
      summary: string;
      href: string;
    }
  | {
      type: "draft";
      findingId: string;
      sectionId: string;
      title: string;
      currentText: string;
      proposedText: string;
      rationale: string;
    };

export interface CoworkerResponse {
  conversationId: string;
  messageId: string;
  intent: CoworkerIntent;
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
}
