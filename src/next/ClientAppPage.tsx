import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      <span className="text-sm font-medium">Loading app…</span>
    </div>
  ),
});

export default function ClientAppPage() {
  return <ClientApp />;
}
