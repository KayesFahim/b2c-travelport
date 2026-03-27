import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function BookingConfirmationPage() {
  return (
    <>
      <PageMeta
        title="Booking Confirmation | FlyJatt"
        description="View booking confirmation details, PNR, seats, ancillaries, and ticket status."
        noIndex
      />
      <ClientAppPage />
    </>
  );
}
