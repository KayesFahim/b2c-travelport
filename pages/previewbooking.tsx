import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function PreviewBookingPage() {
  return (
    <>
      <PageMeta
        title="Preview Booking | FlyJatt"
        description="Review itinerary, traveler details, and pricing before final booking commit."
        noIndex
      />
      <ClientAppPage />
    </>
  );
}
