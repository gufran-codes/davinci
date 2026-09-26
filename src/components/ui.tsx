import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { ReactNode } from "react";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className={`brand ${small ? "small" : ""}`} href="/">
      <span className="brand-mark">
        <Leaf size={22} strokeWidth={1.8} />
      </span>
      da vinci<span className="brand-dot">.</span>
    </Link>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} href={href}>
      {children}
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="icon-disc">
        <Leaf size={26} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
