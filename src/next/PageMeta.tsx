import Head from "next/head";

type PageMetaProps = {
  title: string;
  description: string;
  noIndex?: boolean;
};

export default function PageMeta({
  title,
  description,
  noIndex = false,
}: PageMetaProps) {
  const robotsValue = noIndex ? "noindex,nofollow" : "index,follow";

  return (
    <Head>
      <title>{title}</title>
      <meta key="description" name="description" content={description} />
      <meta key="robots" name="robots" content={robotsValue} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
    </Head>
  );
}
