import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Парсер статей Википедии",
  description: "Парсинг статей Википедии в структурированные данные",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Подавляем hydration-warning для атрибутов, которые могут добавить расширения браузера.
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
