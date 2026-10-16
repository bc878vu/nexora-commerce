import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Nexora Commerce — Everyday, elevated.",
    template: "%s | Nexora Commerce",
  },
  description:
    "Thoughtfully selected audio, wearables and workspace essentials. Discover your next everyday favorite.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="announcement">
          A little upgrade. A better everyday.{" "}
          <span>Free delivery on orders over Rs 20,000</span>
        </div>
        <header>
          <Link className="brand" href="/">
            nexora<span>®</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#collection">Collection</Link>
            <Link href="/dashboard">My orders</Link>
            <Link href="/admin/inventory">Store admin ↗</Link>
          </nav>
        </header>
        {children}
        <footer>
          <Link className="brand" href="/">
            nexora<span>®</span>
          </Link>
          <p>Considered essentials. Everyday possibilities.</p>
          <small>
            © {new Date().getFullYear()} Nexora Commerce · PKR · Pakistan
          </small>
        </footer>
      </body>
    </html>
  );
}
