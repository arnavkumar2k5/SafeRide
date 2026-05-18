import Image from "next/image";

type BrandLogoProps = {
  subtitle?: string;
  inverted?: boolean;
};

export function BrandLogo({ subtitle, inverted = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${
          inverted ? "bg-white/95" : "bg-white"
        } shadow-sm ring-1 ring-slate-900/10`}
      >
        <Image
          src="/logo.svg"
          alt="SafeRide logo"
          width={46}
          height={46}
          className="h-11 w-11 object-contain"
          priority
          unoptimized
        />
      </div>
      <div>
        <p className={`font-bold ${inverted ? "text-white" : "text-slate-950"}`}>
          SafeRide
        </p>
        {subtitle && (
          <p
            className={`text-xs ${
              inverted ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
