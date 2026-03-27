import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function BookingDetailsPage() {
  return (
    <>
      <PageMeta
        title="Booking Details | FlyJatt"
        description="Enter traveler details and finalize booking setup securely."
        noIndex
      />
      <ClientAppPage />
    </>
  );
}
