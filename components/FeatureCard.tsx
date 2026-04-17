import { Clock, type LucideIcon } from "lucide-react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  color,
}: FeatureCardProps) {
  return (
    <article className="relative rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.05]">
      <Clock className="absolute right-4 top-4 h-4 w-4 text-white/30" />
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon
          className="h-5 w-5"
          strokeWidth={1.5}
          style={{ color }}
        />
      </div>
      <h3 className="mb-2 text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-white/60">{description}</p>
    </article>
  );
}
