export const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const DEFAULT_ORG_NAME = "Demo Flight School";

type OrgMembershipLike = {
  organization_id?: string | null;
};

export function pickPreferredOrgMembership<T extends OrgMembershipLike>(
  rows: T[] | null | undefined,
): T | null {
  if (!rows?.length) return null;

  return rows.find((row) => row.organization_id && row.organization_id !== DEFAULT_ORG_ID) ?? rows[0] ?? null;
}
