import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageShell, Btn, Card } from "@/components/common";
import { Quiz, AudioPlayer, DiffPicker } from "@/components/quiz";
import { LISTEN_QS } from "@/constants/listening";

export function Listening() {
  const { c, nav, customListen } = useApp();
  const [diff, setDiff] = useState("Mixte");
  const filtered = useMemo(() => {
    const merged = [...LISTEN_QS, ...customListen];
    return diff === "Mixte" ? merged : merged.filter((q) => q.level === diff);
  }, [customListen, diff]);
  return (
    <PageShell eyebrow="Compréhension orale" title="Entraînez votre oreille au français d'ici" sub="Écoutez le document, répondez, puis lisez l'explication. Le jour de l'examen, chaque audio n'est diffusé qu'une seule fois.">
      <DiffPicker value={diff} onChange={setDiff} />
      {customListen.length > 0 && <p className="text-sm mb-4 -mt-2 opacity-70">+ {customListen.length} question{customListen.length > 1 ? "s" : ""} importée{customListen.length > 1 ? "s" : ""} par l'administrateur incluse{customListen.length > 1 ? "s" : ""} ci-dessous.</p>}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className={`text-sm ${c.sub}`}>Aucune question de niveau {diff} pour l'instant. Choisissez un autre niveau ou revenez en mode « Mixte ».</p>
          <Btn small variant="ghost" className="mt-4" onClick={() => setDiff("Mixte")}>Revenir au mode Mixte</Btn>
        </Card>
      ) : (
        <Quiz key={diff} questions={filtered} duration={360} storageKey={`listen-${diff}`} renderAbove={(q) => <AudioPlayer src={q.audio} />} doneExtra={<Btn variant="ghost" onClick={() => nav("mocks")}>Passer un examen blanc</Btn>} />
      )}
    </PageShell>
  );
}
