import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manos Cerca · Red Comunitaria",
  description: "Gestión cercana de ayudas comunitarias.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
