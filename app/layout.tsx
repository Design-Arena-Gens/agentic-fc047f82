export const metadata = {
  title: "AI Companion",
  description: "Supportive AI companion chat"
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
