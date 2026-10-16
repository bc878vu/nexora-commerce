import { ShoppingBag, Footprints, Wallet } from "lucide-react";
const icons = {
  handbag: ShoppingBag,
  footprints: Footprints,
  wallet: Wallet,
};
export default function ProductArt({
  icon,
  tone,
  large = false,
}: {
  icon: string;
  tone: string;
  large?: boolean;
}) {
  const Icon = icons[icon as keyof typeof icons] ?? ShoppingBag;
  return (
    <div
      className={"product-art " + (large ? "large" : "")}
      style={{ background: tone }}
    >
      <div className="art-orbit" />
      <Icon aria-hidden="true" strokeWidth={0.8} />
      <span className="art-shadow" />
    </div>
  );
}
