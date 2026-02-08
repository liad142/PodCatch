import type { Metadata } from "next";
import { Inter, Crimson_Text, Outfit } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/contexts/CountryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SummarizeQueueProvider } from "@/contexts/SummarizeQueueContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { AuthModal } from "@/components/auth/AuthModal";
import { CompactAuthPrompt } from "@/components/auth/CompactAuthPrompt";
import { QueueToast } from "@/components/QueueToast";
import { StickyAudioPlayer } from "@/components/StickyAudioPlayer";

const inter = Inter({ subsets: ["latin"] });
const crimsonText = Crimson_Text({ 
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson"
});
const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit"
});

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
      <body className={`${inter.className} ${crimsonText.variable} ${outfit.variable} glass-bg`}>
        <AuthProvider>
          <ThemeProvider>
            <CountryProvider>
              <SummarizeQueueProvider>
                <SubscriptionProvider>
                  <AudioPlayerProvider>
                    <div className="min-h-screen">
                      <Sidebar />
                      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen pb-24">
                        <div className="max-w-7xl mx-auto">
                          {children}
                        </div>
                      </main>
                    </div>
                    <AuthModal />
                    <CompactAuthPrompt />
                    <QueueToast />
                    <StickyAudioPlayer />
                  </AudioPlayerProvider>
                </SubscriptionProvider>
              </SummarizeQueueProvider>
            </CountryProvider>
          </ThemeProvider>
        </AuthProvider>

      </body>
    </html>
  );
}
