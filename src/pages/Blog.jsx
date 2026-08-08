import { useState } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageShell, Card, Pill } from "@/components/common";
import { RouteLink } from "@/components/common/RouteLink";
import { ArticleBody, Figure, headingId } from "@/components/blog/ArticleBody";
import { POSTS, CAT_TONE, relatedPosts } from "@/constants/blog";

// The article index lives at /blogue; each post is its own crawlable URL
// (/blogue/<slug>), selected from the current route rather than local state so
// deep links, Back/Forward and per-article <title>/canonical all work.

const tone = (cat) => CAT_TONE[cat] || "blue";

/* --------------------------------- index ---------------------------------- */

function PostCard({ post, featured }) {
  const { c, t } = useApp();
  return (
    <RouteLink r={`blog/${post.slug}`} className="text-left block h-full">
      <Card lift className={`overflow-hidden h-full flex ${featured ? "flex-col md:flex-row" : "flex-col"}`}>
        {post.hero && (
          <img
            src={post.hero.src} alt="" aria-hidden="true"
            width={post.hero.w} height={post.hero.h} loading="lazy" decoding="async"
            className={`object-cover ${c.track} ${featured ? "w-full md:w-1/2 h-48 md:h-auto" : "w-full h-40"}`}
          />
        )}
        <div className={`p-6 flex flex-col flex-1 ${featured ? "md:justify-center" : ""}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <Pill tone={tone(post.cat)}>{t(post.cat)}</Pill>
            <span className={`text-xs font-mono2 ${c.faint}`}>{post.read}</span>
          </div>
          <h3 className={`font-display font-bold leading-snug ${c.text} ${featured ? "text-xl md:text-2xl" : "text-lg"}`}>{t(post.t)}</h3>
          <p className={`mt-3 text-sm leading-relaxed flex-1 ${c.sub}`}>{t(post.excerpt)}</p>
          <p className={`mt-4 text-xs ${c.faint}`}>{t(post.date)}</p>
        </div>
      </Card>
    </RouteLink>
  );
}

function BlogIndex() {
  const { c, t } = useApp();
  const [cat, setCat] = useState(null);

  const cats = [...new Set(POSTS.map((p) => p.cat))];
  const shown = cat ? POSTS.filter((p) => p.cat === cat) : POSTS;
  // The newest article leads the page in a wide card; the rest follow in the
  // grid. Filtering by category keeps the same rule inside that category.
  const [lead, ...rest] = shown;

  return (
    <PageShell
      back wide
      eyebrow={t("Blog")}
      title={t("Conseils, méthode et actualités du TCF Canada")}
      sub={t("Rédigé par nos enseignants et d'anciens candidats qui sont passés par là.")}
    >
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setCat(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === null ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}
        >
          {t("Tous les articles")}
        </button>
        {cats.map((name) => (
          <button
            key={name}
            onClick={() => setCat(name)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === name ? "bg-blue-600 text-white" : `border ${c.border} ${c.sub} ${c.hoverSoft}`}`}
          >
            {t(name)}
          </button>
        ))}
      </div>

      {lead && <div className="mb-5"><PostCard post={lead} featured /></div>}
      <div className="grid md:grid-cols-3 gap-5">
        {rest.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </PageShell>
  );
}

/* -------------------------------- article --------------------------------- */

function Breadcrumb({ title }) {
  const { c, t } = useApp();
  const sep = <ChevronRight size={13} className="shrink-0 opacity-50" aria-hidden="true" />;
  return (
    <nav aria-label={t("Fil d'Ariane")} className={`flex items-center gap-1.5 text-xs mb-5 ${c.faint}`}>
      <RouteLink r="home" className="hover:text-blue-600">{t("Accueil")}</RouteLink>
      {sep}
      <RouteLink r="blog" className="hover:text-blue-600">{t("Blog")}</RouteLink>
      {sep}
      <span className="truncate">{t(title)}</span>
    </nav>
  );
}

// Built from the body's heading blocks, so it can never list a section the
// article doesn't have. Scrolling is handled here rather than by a bare
// href="#id" so the jump doesn't push a history entry between the article and
// wherever the reader came from.
function Toc({ blocks }) {
  const { c, t } = useApp();
  const heads = blocks.filter((b) => b && b.h).map((b) => b.h);
  if (heads.length < 3) return null;

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", `#${id}`);
  };

  return (
    <Card className="p-5 mb-10">
      <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 mb-3`}>
        <List size={14} aria-hidden="true" /> {t("Au sommaire")}
      </p>
      <ol className="space-y-1.5">
        {heads.map((h, i) => (
          <li key={i}>
            <a href={`#${headingId(h)}`} onClick={(e) => jump(e, headingId(h))} className={`text-sm hover:text-blue-600 ${c.sub}`}>
              {t(h)}
            </a>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Article({ post }) {
  const { c, t, nav } = useApp();
  const related = relatedPosts(post);

  return (
    <PageShell
      top={<Breadcrumb title={post.t} />}
      eyebrow={t(post.cat)}
      title={t(post.t)}
      sub={`${t(post.date)} · ${post.read} ${t("de lecture")}`}
    >
      <div className="max-w-2xl">
        <button onClick={() => nav("blog")} className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-8">
          <ChevronLeft size={15} /> {t("Tous les articles")}
        </button>

        {post.hero && <Figure {...post.hero} eager className="mb-10" />}
        <Toc blocks={post.body} />
      </div>

      <ArticleBody blocks={post.body} />

      {related.length > 0 && (
        <div className={`max-w-2xl mt-16 pt-10 border-t ${c.border}`}>
          <h2 className={`font-display font-bold text-xl mb-5 ${c.text}`}>{t("Continuer la lecture")}</h2>
          <div className="space-y-3">
            {related.map((p) => (
              <RouteLink key={p.id} r={`blog/${p.slug}`} className="block">
                <Card lift className="p-4 flex items-center gap-4">
                  {p.hero && (
                    <img
                      src={p.hero.src} alt="" aria-hidden="true"
                      width={p.hero.w} height={p.hero.h} loading="lazy" decoding="async"
                      className={`w-20 h-16 rounded-xl object-cover shrink-0 ${c.track}`}
                    />
                  )}
                  <div className="min-w-0">
                    <p className={`font-display font-bold text-sm leading-snug ${c.text}`}>{t(p.t)}</p>
                    <p className={`text-xs mt-1 ${c.faint}`}>{t(p.cat)} · {p.read} {t("de lecture")}</p>
                  </div>
                </Card>
              </RouteLink>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

export function Blog() {
  const { route } = useApp();
  const post = POSTS.find((p) => route === `blog/${p.slug}`);
  return post ? <Article post={post} /> : <BlogIndex />;
}
