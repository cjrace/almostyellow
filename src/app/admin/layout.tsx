import type { Metadata } from "next";

// robots.txt asks search engines not to crawl the admin area, and this stops
// them listing any admin page they find a link to
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
