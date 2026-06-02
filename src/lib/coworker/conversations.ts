import {
  getSupabaseAdminClient,
  type OrgAccessContext,
} from "@/lib/supabase/access";

export type InsertMessageInput = {
  conversationId: string;
  role: "user" | "assistant";
  intent?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
};

const CONVERSATION_PROJECTION = "id, organization_id, user_id, title, created_at, updated_at";
const MESSAGE_PROJECTION =
  "id, conversation_id, organization_id, user_id, role, intent, content, metadata, created_at";

export async function listConversations(ctx: OrgAccessContext) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .select(CONVERSATION_PROJECTION)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function createConversation(
  ctx: OrgAccessContext,
  title = "New conversation",
) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .insert({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      title,
    })
    .select(CONVERSATION_PROJECTION)
    .single();

  if (error) throw error;
  return data;
}

export async function loadOwnedConversation(
  ctx: OrgAccessContext,
  conversationId: string,
) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .select(CONVERSATION_PROJECTION)
    .eq("id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function loadOwnedMessage(
  ctx: OrgAccessContext,
  conversationId: string,
  messageId: string,
) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_messages")
    .select(MESSAGE_PROJECTION)
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .eq("role", "assistant")
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function listMessages(
  ctx: OrgAccessContext,
  conversationId: string,
) {
  const conversation = await loadOwnedConversation(ctx, conversationId);
  if (!conversation) return null;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_messages")
    .select(MESSAGE_PROJECTION)
    .eq("conversation_id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

export async function insertMessage(
  ctx: OrgAccessContext,
  input: InsertMessageInput,
) {
  const { conversationId } = input;
  const conversation = await loadOwnedConversation(ctx, conversationId);
  if (!conversation) return null;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_messages")
    .insert({
      conversation_id: conversationId,
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      role: input.role,
      intent: input.intent ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select(MESSAGE_PROJECTION)
    .single();

  if (error) throw error;
  return data;
}
