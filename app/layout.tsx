import "../styles/tokens.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="wt-body">{children}</body>
    </html>
  );
}
