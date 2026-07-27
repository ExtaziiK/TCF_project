// Canadian maple leaf mark. lucide-react has no maple-leaf icon, so this is a
// small inline SVG used where a "made for Canada" symbol fits (e.g. the auth
// logo mark). Filled with currentColor so it inherits the surrounding text
// colour, exactly like the lucide icons it replaces.
export function MapleLeaf({ size = 24, className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M12 1 L13.2 5.2 L16.2 4.2 L14.8 7.8 L21.8 8.8 L16.2 11 L18.8 15.2 L13.6 14.4 L13 18 L12.8 18.2 L12.8 22 L11.2 22 L11.2 18.2 L11 18 L10.4 14.4 L5.2 15.2 L7.8 11 L2.2 8.8 L9.2 7.8 L7.8 4.2 L10.8 5.2 Z" />
    </svg>
  );
}
