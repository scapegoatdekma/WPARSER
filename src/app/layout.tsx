import type { Metadata } from "next";
import "./globals.css";

function resolveMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
    "http://localhost:3000",
  ];

  for (const value of candidates) {
    if (!value) continue;
    try {
      return new URL(value);
    } catch {
      // Пропускаем невалидное значение и пробуем следующий источник.
    }
  }

  return new URL("http://localhost:3000");
}

const title = "WPARSER — Парсер статей Википедии";
const description =
  "Извлекает структурированные данные из статей Википедии и строит сеть связей (персоны, места, статьи).";

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title,
  description,
  applicationName: "WPARSER",
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ru_RU",
    siteName: "WPARSER",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WPARSER — Парсер статей Википедии",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/twitter-image"],
  },
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
