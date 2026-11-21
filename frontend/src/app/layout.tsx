import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduInsight AI | Phân tích giáo dục",
  description: "Nền tảng phân tích dữ liệu giáo dục đại học — môi trường demo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
