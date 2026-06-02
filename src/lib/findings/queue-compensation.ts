type CompensationQuery = {
  error?: unknown;
  eq(column: string, value: string): CompensationQuery;
};

type CompensationAdmin = {
  from(table: string): {
    delete(): CompensationQuery;
  };
};

export async function compensateCreatedProposal(
  admin: CompensationAdmin,
  orgId: string,
  proposedUpdateId: string,
) {
  const { error } = await admin
    .from("proposed_updates")
    .delete()
    .eq("id", proposedUpdateId)
    .eq("organization_id", orgId);

  return error ?? null;
}
