import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import SupabaseProvider from "@/components/providers/supabase-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Profile Insights",
  description: "AI-powered social media profile analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(
        "relative h-full font-sans antialiased",
        inter.className
      )}>
        <main className="relative flex flex-col min-h-screen">
          <SupabaseProvider>
            <div className="flex-grow flex-1">
              {children}
            </div>
          </SupabaseProvider>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
