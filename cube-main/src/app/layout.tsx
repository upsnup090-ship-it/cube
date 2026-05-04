import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <title>BigPlayBot Dices</title>
      </head>
      <body className="bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}