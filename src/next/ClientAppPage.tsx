import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  ),
});

export default function ClientAppPage() {
  return <ClientApp />;
}
