// Thin top-of-site banner cross-promoting the sister product. Mirrors the
// tempspoofer ribbon on permspoofer.com. Rendered from layout.tsx so it
// sits above every page's nav.

export function PermspooferBanner() {
  return (
    <a
      href="https://permspoofer.com"
      target="_blank"
      rel="noopener"
      className="group block w-full text-center bg-[#07070A] hover:bg-black
                 border-b border-white/5 transition-colors
                 text-[12.5px] py-2.5 px-4 text-ink-2 hover:text-ink tracking-tight"
    >
      <span className="inline-flex items-center gap-2.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[#B2D6F8]"
          style={{ boxShadow: "0 0 10px rgba(178,214,248,.9)" }}
        />
        <span className="opacity-70">Need a <em className="not-italic text-ink">permanent</em> spoof instead?</span>
        <span className="font-semibold text-ink">Check out&nbsp;permspoofer.com</span>
        <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
      </span>
    </a>
  );
}
