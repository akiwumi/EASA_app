import RegisterSchoolForm from "@/components/auth/RegisterSchoolForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <RegisterSchoolForm selectedPlan={resolvedSearchParams.plan} />;
}
