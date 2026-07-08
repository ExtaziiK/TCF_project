import { FolderOpen } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/common";

// Shared loading / empty states for the Expression écrite & orale workshops.

export function WorkshopSkeleton() {
  const { c } = useApp();
  return (
    <div aria-busy="true" aria-label="Chargement de la session de pratique">
      <div className="flex gap-2 flex-wrap mb-6">
        {[0, 1, 2].map((i) => <div key={i} className={`h-9 w-36 rounded-full animate-pulse ${c.track}`} />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 animate-pulse">
          <div className={`h-4 w-1/4 rounded-full ${c.track}`} />
          <div className={`h-3 w-3/4 rounded-full mt-4 ${c.track}`} />
          <div className={`h-40 rounded-2xl mt-4 ${c.track}`} />
        </Card>
        <Card className="p-6 animate-pulse"><div className={`h-32 rounded-2xl ${c.track}`} /></Card>
      </div>
    </div>
  );
}

export function EmptyTask({ task }) {
  const { c } = useApp();
  return (
    <Card className="p-10 text-center">
      <FolderOpen size={32} className="text-blue-600 mx-auto mb-4" />
      <p className={`font-display font-bold ${c.text}`}>Aucune consigne disponible pour la Tâche {task}</p>
      <p className={`mt-2 text-sm ${c.sub}`}>De nouveaux sujets sont ajoutés régulièrement — revenez bientôt.</p>
    </Card>
  );
}
