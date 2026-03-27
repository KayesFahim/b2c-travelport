import dynamic from "next/dynamic";

const ClientApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div
      className="travelport-page flex min-h-[68vh] items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="travelport-soft-surface w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="text-base font-semibold text-slate-700">
          Preparing your FlyJatt experience
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Loading routes, search tools, and booking modules...
        </p>
      </div>
    </div>
  ),
});

export default function ClientAppPage() {
  return <ClientApp />;
}
