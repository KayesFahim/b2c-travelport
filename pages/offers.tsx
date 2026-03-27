import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function OffersPage() {
  return (
    <>
      <PageMeta
        title="Flight Offers | FlyJatt"
        description="Explore current flight offers and compare travel options with FlyJatt."
      />
      <ClientAppPage />
    </>
  );
}
