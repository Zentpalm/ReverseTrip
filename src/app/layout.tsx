import type { Metadata } from 'next';
import { AppProvider } from '@/components/providers';
import { Header, Footer, DemoBanner } from '@/components/shell';
import { getCatalog } from '@/server/catalog';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'ReverseTrip — Discover Local', template: '%s | ReverseTrip' },
  description: 'ค้นพบกิจกรรมชุมชนไทย วางแผนทริป และส่งคำขอจองในที่เดียว',
};
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return (
    <html lang="th" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('reversetrip-theme')==='light'?'light':'dark';document.documentElement.lang=localStorage.getItem('reversetrip-lang')==='en'?'en':'th'}catch(e){}",
          }}
        />
      </head>
      <body>
        <AppProvider initialCatalog={catalog}>
          <Header />
          <DemoBanner />
          <main id="main">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
