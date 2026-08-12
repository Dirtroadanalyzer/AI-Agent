import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dirt Road Property Analyzer and Transaction Coordinator",
  description: "Mohave County land acquisition intelligence and transaction coordination.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
