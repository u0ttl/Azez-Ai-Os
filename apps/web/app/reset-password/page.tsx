import { RecoveryForm } from "../../components/recovery-form";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <RecoveryForm mode="reset" token={token} />; }
