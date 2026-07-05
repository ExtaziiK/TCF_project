import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { POSTS } from "@/constants/blog";

export function Blog() {
  const { c } = useApp();
  const [post, setPost] = useState(null);
  if (post) {
    return (
      <PageShell eyebrow={post.cat} title={post.t} sub={`${post.date} · ${post.read} de lecture`}>
        <button onClick={() => setPost(null)} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8"><ChevronLeft size={15} /> Tous les articles</button>
        <div className="max-w-2xl space-y-5">
          {post.body.map((p, i) => <p key={i} className={`leading-relaxed ${c.sub}`}>{p}</p>)}
        </div>
      </PageShell>
    );
  }
  return (
    <PageShell wide eyebrow="Blogue" title="Conseils, méthode et actualités du TCF Canada" sub="Rédigé par nos enseignants et d'anciens candidats qui sont passés par là.">
      <div className="grid md:grid-cols-3 gap-5">
        {POSTS.map((p) => (
          <button key={p.id} onClick={() => setPost(p)} className="text-left">
            <Card lift className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4"><Pill tone={p.cat === "Immigration" ? "red" : "blue"}>{p.cat}</Pill><span className={`text-xs font-mono2 ${c.faint}`}>{p.read}</span></div>
              <h3 className={`font-display font-bold text-lg leading-snug ${c.text}`}>{p.t}</h3>
              <p className={`mt-3 text-sm leading-relaxed flex-1 ${c.sub}`}>{p.excerpt}</p>
              <p className={`mt-4 text-xs ${c.faint}`}>{p.date}</p>
            </Card>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
