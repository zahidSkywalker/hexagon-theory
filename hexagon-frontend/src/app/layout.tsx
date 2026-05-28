import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import ToastContainer from "@/components/Toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "HexaGon Theory";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Global Ideas Platform`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "A global crowdsourced intelligence platform for development ideas. Submit, discover, and collaborate on proposals to improve communities worldwide.",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  openGraph: {
    title: APP_NAME,
    description:
      "A global crowdsourced intelligence platform for development ideas.",
    type: "website",
    siteName: APP_NAME,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <AuthProvider>
          <ToastContainer>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastContainer>
        </AuthProvider>
      </body>
    </html>
  );
}
