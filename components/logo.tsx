export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M8 2h11l7 7v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#1a73e8" />
      <path d="M19 2l7 7h-5a2 2 0 0 1-2-2z" fill="#8ab4f8" />
      <path d="M11 15h10M11 19h10M11 23h7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
