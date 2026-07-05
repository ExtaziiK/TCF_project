import { Leaf } from "lucide-react";

export function Logo({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label="Passerelle — accueil">
      <span className="w-9 h-9 rounded-xl grad-brand flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
        <Leaf size={18} aria-hidden="true" />
      </span>
      <span className="font-display font-bold text-lg leading-none">
        Passerelle<span className="block text-[10px] font-body font-semibold tracking-widest uppercase text-blue-600">TCF Canada</span>
      </span>
    </button>
  );
}
