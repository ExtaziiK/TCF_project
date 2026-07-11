import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { PageShell, Btn, Card } from "@/components/common";
import { Quiz, AudioPlayer, DiffPicker } from "@/components/quiz";
import { BankExplorer } from "@/components/bank/BankExplorer";
import { getBank } from "@/services/bankService";
import { LISTEN_QS } from "@/constants/listening";

// Premium module backed by the question bank (section "co"). The legacy
// demo below only renders if the bank section is ever empty.
export function Listening() {
  if (getBank().co.length > 0) {
    return (
      <BankExplorer
        back
        sections={["co"]}
        eyebrow="Compréhension orale"
        title="Entraînez votre oreille au français d'ici"
        sub="Tous les quiz officiels de compréhension orale. Écoutez le document puis répondez — le jour de l'examen, chaque audio n'est diffusé qu'une seule fois."
      />
    );
  }
  return <ListeningDemo />;
}

function ListeningDemo() {
  const { c, nav, customListen, t } = useApp();
  const [diff, setDiff] = useState("Mixte");
  const filtered = useMemo(() => {
    const merged = [...LISTEN_QS, ...customListen];
    return diff === "Mixte" ? merged : merged.filter((q) => q.level === diff);
  }, [customListen, diff]);
  return (
    <PageShell back eyebrow={t("Compréhension orale")} title={t("Entraînez votre oreille au français d'ici")} sub={t("Écoutez le document, répondez, puis lisez l'explication. Le jour de l'examen, chaque audio n'est diffusé qu'une seule fois.")}>
      <DiffPicker value={diff} onChange={setDiff} />
      {customListen.length > 0 && <p className="text-sm mb-4 -mt-2 opacity-70">+ {customListen.length} {t(customListen.length > 1 ? "questions importées par l'administrateur incluses ci-dessous." : "question importée par l'administrateur incluse ci-dessous.")}</p>}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className={`text-sm ${c.sub}`}>{t("Aucune question de niveau")} {diff} {t("pour l'instant. Choisissez un autre niveau ou revenez en mode « Mixte ».")}</p>
          <Btn small variant="ghost" className="mt-4" onClick={() => setDiff("Mixte")}>{t("Revenir au mode Mixte")}</Btn>
        </Card>
      ) : (
        <Quiz key={diff} questions={filtered} duration={360} storageKey={`listen-${diff}`} renderAbove={(q) => <AudioPlayer src={q.audio} />} doneExtra={<Btn variant="ghost" onClick={() => nav("mocks")}>{t("Passer un TCF blanc")}</Btn>} />
      )}
    </PageShell>
  );
}
