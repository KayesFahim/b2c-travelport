
import dynamic from "next/dynamic";
import HoldLoader from "../Shared/Loader/HoldLoader";

const ClientApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => <HoldLoader />,
});

export default function ClientAppPage() {
  return <ClientApp />;
}
