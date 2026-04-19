import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Cycling Coach",
  description: "Track your ride and get AI coaching feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#ffffff" }}>
        {children}
      </body>
    </html>
  );
}