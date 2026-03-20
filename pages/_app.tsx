import type { AppProps } from "next/app";
import "../src/index.css";
import "../src/App.css";
import "../src/Pages/Home/DiscountSlider.css";
import "../src/Pages/AirlinesSlider/AirlinesSlider.css";
import "react-toastify/dist/ReactToastify.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "react-phone-input-2/lib/style.css";
import "react-datepicker/dist/react-datepicker.css";

export default function NextApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
