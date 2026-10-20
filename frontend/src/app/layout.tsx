import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { SocketProvider } from "@/context/SocketContext";
import Navbar from "@/components/Navbar";

// Industry standard modern social media typography: Plus Jakarta Sans with fallbacks to system social font stack
const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-sans",
    display: "swap",
});

export const metadata: Metadata = {
    title: "BlindPak – University Anonymous Forum",
    description: "Anonymous social platform for university students in Pakistan",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={plusJakartaSans.variable}>
            <head>
                <link
                    rel="stylesheet"
                    as="style"
                    crossOrigin="anonymous"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
                />
            </head>
            <body className="font-sans antialiased text-gray-900 bg-gray-50 selection:bg-indigo-500 selection:text-white">
                <AuthProvider>
                    <ToastProvider>
                        <SocketProvider>
                            <div className="flex flex-col min-h-screen">
                                <Navbar />
                                <main className="flex-grow bg-gray-50">
                                    {children}
                                </main>
                            </div>
                        </SocketProvider>
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
