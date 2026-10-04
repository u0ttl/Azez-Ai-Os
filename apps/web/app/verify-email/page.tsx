import { RecoveryForm } from "../../components/recovery-form";
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <RecoveryForm mode="verify" token={token} />; }
