/** Brand star mark — safe for both server and client components. */
export function StarMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <ellipse cx="16" cy="16" rx="13.5" ry="5.5" stroke="currentColor" strokeWidth="1" opacity="0.3" transform="rotate(-24 16 16)" />
      <path d="M16 7l1.9 6.1L24 15l-6.1 1.9L16 23l-1.9-6.1L8 15l6.1-1.9z" fill="currentColor" />
    </svg>
  );
}
