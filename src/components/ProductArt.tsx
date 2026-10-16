import {
  Headphones,
  Speaker,
  Watch,
  Keyboard,
  LampDesk,
  BatteryCharging,
} from "lucide-react";
const icons = {
  headphones: Headphones,
  speaker: Speaker,
  watch: Watch,
  keyboard: Keyboard,
  lamp: LampDesk,
  battery: BatteryCharging,
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
  const Icon = icons[icon as keyof typeof icons] ?? Headphones;
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
