import ClientAppPage from "../src/next/ClientAppPage";
import PageMeta from "../src/next/PageMeta";

export default function OneWaySearchResultPage() {
  return (
    <>
      <PageMeta
        title="Flight Search Results | FlyJatt"
        description="Review one-way flight search results and choose the best fare for your trip."
        noIndex
      />
      <ClientAppPage />
    </>
  );
}
