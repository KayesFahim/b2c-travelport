import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function HotelsPage() {
  return (
    <>
      <PageMeta
        title="FlyJatt | Stays & Hotels via Travelport Stays"
        description="Search live hotel properties, room availability, rate rules, and bookings powered by Travelport Stays."
      />
      <ClientAppPage />
    </>
  );
}
