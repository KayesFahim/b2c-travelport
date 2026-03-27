import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function SelectedFlightDetailsPage() {
  return (
    <>
      <PageMeta
        title="Selected Offer | FlyJatt"
        description="Review selected fare details before traveler submission and booking."
        noIndex
      />
      <ClientAppPage />
    </>
  );
}
