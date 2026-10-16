import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getStoreSettings, toPublic } from "@/lib/store-settings";

export const metadata: Metadata = {
  title: {
    default: "Nexora Commerce — Handbags & Footwear for Her",
    template: "%s | Nexora Commerce",
  },
  description:
    "Shop women's handbags, footwear and wallets online — worldwide shipping, secure checkout, 7-day easy exchange.",
  openGraph: {
    type: "website",
    siteName: "Nexora Commerce",
    title: "Nexora Commerce — Handbags & Footwear for Her",
    description:
      "Handbags & footwear, curated for her. Worldwide shipping, secure checkout, 7-day easy exchange.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexora Commerce — Handbags & Footwear for Her",
    description:
      "Handbags & footwear, curated for her. Worldwide shipping, secure checkout, 7-day easy exchange.",
  },
};

function Nav() {
  return (
    <header>
      <Link className="brand" href="/">
        nexora<span>®</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#collection">Shop</Link>
        <Link href="/dashboard">My orders</Link>
        <Link href="/login">Sign in</Link>
      </nav>
    </header>
  );
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const announcement = toPublic(await getStoreSettings()).announcement;
  return (
    <html lang="en">
      <body>
        <div className="announcement">{announcement}</div>
        <Nav />
        {children}
        <footer>
          <Link className="brand" href="/">
            nexora<span>®</span>
          </Link>
          <p>Handbags & footwear, curated for her. Shipped worldwide.</p>
          <nav aria-label="Footer">
            <Link href="/#collection">Shop</Link> ·{" "}
            <Link href="/dashboard">My orders</Link> ·{" "}
            <Link href="/login">Sign in</Link>
          </nav>
          <small>
            © {new Date().getFullYear()} Nexora Commerce · USD · Worldwide
            shipping
          </small>
        </footer>
      </body>
    </html>
  );
}
