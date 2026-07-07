export function Logo({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label="Passerelle — accueil">
      <img
        src="/logo-mark.png"
        alt=""
        width="40"
        height="40"
        className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
      />
      <span className="font-display font-bold text-lg leading-none">
        Passerelle<span className="block text-[10px] font-body font-semibold tracking-widest uppercase text-blue-600">TCF Canada</span>
      </span>
    </button>
  );
}
