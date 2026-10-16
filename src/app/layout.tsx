import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexora Commerce — Handbags & Footwear for Her",
    template: "%s | Nexora Commerce",
  },
  description:
    "Shop women's handbags, footwear and wallets online in Pakistan. Cash on delivery, 7-day easy exchange, free delivery over Rs 5,000.",
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="announcement">
          New here? <span>Cash on delivery across Pakistan</span>
        </div>
        <Nav />
        {children}
        <footer>
          <Link className="brand" href="/">
            nexora<span>®</span>
          </Link>
          <p>Handbags & footwear, curated for her. Delivered across Pakistan.</p>
          <nav aria-label="Footer">
            <Link href="/#collection">Shop</Link> ·{" "}
            <Link href="/dashboard">My orders</Link> ·{" "}
            <Link href="/login">Sign in</Link>
          </nav>
          <small>
            © {new Date().getFullYear()} Nexora Commerce · PKR · Pakistan
          </small>
        </footer>
      </body>
    </html>
  );
}
