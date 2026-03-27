import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function HomepagePage() {
  return (
    <>
      <PageMeta
        title="FlyJatt | Flights, Deals and Easy Booking"
        description="Book flights in minutes with FlyJatt. Compare fares, explore offers, and complete secure booking quickly."
      />
      <ClientAppPage />
    </>
  );
}
