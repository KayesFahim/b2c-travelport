import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function CatchAllPage() {
  return (
    <>
      <PageMeta
        title="FlyJatt | Flights, Booking and Ticketing"
        description="Search routes, compare fares, and manage your flight booking experience with FlyJatt."
      />
      <ClientAppPage />
    </>
  );
}
