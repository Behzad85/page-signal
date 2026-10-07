import Script from "next/script";
import "./globals.css";
import Providers from "../components/design/Providers";
import AppShell from "../components/design/AppShell";
import { GA_MEASUREMENT_ID } from "../lib/analytics";
import FeedbackButton from "../components/optiscan/FeedbackButton";

export const metadata = {
  title: "PageSignal | Website evidence into action",
  description:
    "AI-powered SEO content analysis, website diagnosis, and competitor comparison dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {Boolean(GA_MEASUREMENT_ID) && <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: true,
              anonymize_ip: true
            });
            window.__optiscanGaConfigured = true;
          `}
        </Script>}
      </head>
      <body>
        {Boolean(GA_MEASUREMENT_ID) && <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />}
        <Providers>
          <AppShell>
          {children}
          </AppShell>
          <FeedbackButton />
        </Providers>
      </body>
    </html>
  );
}
