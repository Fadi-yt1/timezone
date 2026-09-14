export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="shell py-10 sm:py-12">
        {eyebrow && <p className="label mb-2.5">{eyebrow}</p>}
        <h1 className="display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {lede && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{lede}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
