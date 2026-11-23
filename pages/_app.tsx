import type { AppProps } from "next/app";
import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
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
  const router = useRouter();
  const siteUrl = useMemo(
    () =>
      String(process.env.NEXT_PUBLIC_APP_URL || "https://www.flyjatt.com")
        .trim()
        .replace(/\/+$/, ""),
    []
  );
  const canonicalPath = useMemo(() => {
    const rawPath = String(router.asPath || "/").split("?")[0].split("#")[0] || "/";
    if (rawPath === "/homepage") return "/";
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  }, [router.asPath]);
  const canonicalUrl = `${siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`;
  const defaultTitle = "FlyJatt | Flight Booking, Deals and Ticketing";
  const defaultDescription =
    "Search flights, compare fares, and book tickets quickly with FlyJatt.";


  return (
    <>
      <Head>
        <title>{defaultTitle}</title>
        <meta key="description" name="description" content={defaultDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no,address=no,email=no" />
        <meta name="theme-color" content="#0f4b7d" />
        <meta name="application-name" content="FlyJatt" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta key="robots" name="robots" content="index,follow" />
        <meta
          name="googlebot"
          content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        />

        <link key="canonical" rel="canonical" href={canonicalUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="FlyJatt" />
        <meta key="og:title" property="og:title" content={defaultTitle} />
        <meta key="og:description" property="og:description" content={defaultDescription} />
        <meta key="og:url" property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${siteUrl}/logo2.jpg`} />
        <meta property="og:image:alt" content="FlyJatt" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content={defaultTitle} />
        <meta key="twitter:description" name="twitter:description" content={defaultDescription} />
        <meta name="twitter:image" content={`${siteUrl}/logo2.jpg`} />
      </Head>
      <Component {...pageProps} />
      {process.env.NODE_ENV === "production" ? <SpeedInsights /> : null}
    </>
  );
}
