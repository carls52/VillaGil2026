import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VILLAGIL FEST 2026",
  description: "Inscripción, ranking y administración de VILLAGIL FEST 2026"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
