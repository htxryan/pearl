import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svgDefaults(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
}

export function TagPlusIcon({ size = 14, className, ...rest }: IconProps) {
  return (
    <svg {...svgDefaults(size)} className={className} {...rest}>
      <path d="M2 8V3a1 1 0 011-1h5l6 6-5 5-6-6z" />
      <circle cx="5" cy="5" r="0.75" fill="currentColor" />
      <path d="M11.5 11.5h3M13 10v3" />
    </svg>
  );
}

export function TagMinusIcon({ size = 14, className, ...rest }: IconProps) {
  return (
    <svg {...svgDefaults(size)} className={className} {...rest}>
      <path d="M2 8V3a1 1 0 011-1h5l6 6-5 5-6-6z" />
      <circle cx="5" cy="5" r="0.75" fill="currentColor" />
      <path d="M11.5 11.5h3" />
    </svg>
  );
}

export function StatusIcon({ size = 14, className, ...rest }: IconProps) {
  return (
    <svg {...svgDefaults(size)} className={className} {...rest}>
      <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  );
}
