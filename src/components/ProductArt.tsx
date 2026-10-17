import Image from "next/image";
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
  image,
  alt,
}: {
  icon: string;
  tone: string;
  large?: boolean;
  image?: string | null;
  alt?: string;
}) {
  const Icon = icons[icon as keyof typeof icons] ?? ShoppingBag;
  return (
    <div
      className={"product-art " + (large ? "large" : "")}
      style={{ background: tone }}
    >
      {image ? (
        <Image
          src={image}
          alt={alt ?? "Product photo"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          style={{ objectFit: "cover" }}
          priority={large}
        />
      ) : (
        <>
          <div className="art-orbit" />
          <Icon aria-hidden="true" strokeWidth={0.8} />
          <span className="art-shadow" />
        </>
      )}
    </div>
  );
}
