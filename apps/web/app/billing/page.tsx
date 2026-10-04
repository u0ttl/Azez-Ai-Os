import { AppSidebar } from "@/components/app-sidebar";
import { BillingWorkspace } from "@/components/billing-workspace";

export default function BillingPage() { return <main className="app-shell"><AppSidebar active="billing"/><BillingWorkspace/></main>; }
