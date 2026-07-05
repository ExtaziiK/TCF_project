import { Upload } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";

export function RealAudio({ src }) {
  const { c } = useApp();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-xs font-mono2 mb-2">
        <span className="text-blue-600 font-semibold flex items-center gap-1.5"><Upload size={12} /> Audio importé</span>
      </div>
      <audio controls src={src} className="w-full" style={{ height: 40 }}>
        Votre navigateur ne prend pas en charge la lecture audio.
      </audio>
      <p className={`mt-2 text-xs ${c.faint}`}>Si le fichier ne se lit pas, vérifiez que l'URL est publique et pointe vers un fichier audio valide.</p>
    </Card>
  );
}
