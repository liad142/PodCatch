import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/contexts/CountryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SummarizeQueueProvider } from "@/contexts/SummarizeQueueContext";
import { Sidebar } from "@/components/Sidebar";
import { QueueToast } from "@/components/QueueToast";
import { Agentation } from "agentation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PodCatch - AI-Powered Podcast Summaries",
  description: "Get AI-generated summaries, key points, and resources from any podcast episode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <CountryProvider>
            <SummarizeQueueProvider>
              <div className="min-h-screen bg-background">
                <Sidebar />
                <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </main>
              </div>
              <QueueToast />
            </SummarizeQueueProvider>
          </CountryProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
