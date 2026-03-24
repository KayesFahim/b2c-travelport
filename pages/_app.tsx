import type { AppProps } from "next/app";
import Head from "next/head";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  return (
    <>
      <Head>
        <title>FlyJatt - Flights, Booking and Ticketing</title>
        <meta
          name="description"
          content="Search flights, compare fares, and book tickets quickly with FlyJatt."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index,follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="FlyJatt" />
        <meta
          property="og:description"
          content="Search flights, compare fares, and book tickets quickly with FlyJatt."
        />
      </Head>
      <Component {...pageProps} />
      <SpeedInsights />
    </>
  );
}
