export const post = {
  id: 11,
  slug: "comment-est-note-le-tcf-canada",
  iso: "2026-07-31",
  date: "31 juillet 2026",
  cat: "Comprendre le test",
  t: "Comment le TCF Canada est-il noté ? La mécanique du barème, expliquée",
  excerpt:
    "Un score sur 699 d'un côté, une note sur 20 de l'autre, pas de moyenne générale et aucune note éliminatoire : comment fonctionne réellement la notation du TCF Canada.",
  hero: {
    src: "/blogue/graphiques.jpg",
    alt: "Ordinateur portable affichant des graphiques, posé sur un bureau",
    w: 960, h: 640,
    caption: "Le TCF Canada ne produit pas une note globale, mais quatre résultats indépendants. C'est la clé pour comprendre le reste.",
  },
  body: [
    "« J'ai eu 452, c'est bien ou pas ? » La question revient chaque semaine, et elle est impossible à trancher telle quelle. 452 en compréhension écrite ne veut pas dire la même chose que 452 en compréhension orale, et n'a de sens que rapporté à ce que votre dossier exige.",
    "Comprendre la mécanique du barème change deux choses : vous fixez une cible réaliste avant de réserver, et vous savez où aller chercher des points quand le premier résultat n'est pas suffisant. Voici comment tout cela fonctionne.",

    { h: "Première règle : il n'y a pas de note globale" },
    "Le TCF Canada ne calcule **aucune moyenne**. Vous obtenez quatre résultats indépendants, un par épreuve, et ils restent indépendants jusqu'au bout de votre dossier.",
    "C'est la règle la plus importante du test, et celle qu'on intègre le plus mal. Un excellent score en compréhension écrite ne rachète pas une expression orale faible. Dans un dossier d'immigration, c'est même l'inverse : c'est votre **compétence la plus basse** qui détermine ce que vous pouvez faire, puisque les programmes exigent un niveau minimal *dans les quatre compétences*.",
    "Conséquence pratique : progresser de 480 à 540 dans l'épreuve où vous êtes déjà bon ne vous rapporte souvent rien. Passer de 380 à 460 dans celle où vous êtes faible peut débloquer tout votre profil. La préparation efficace vise le maillon faible, pas le point fort.",

    { h: "Les deux QCM : un score sur 699" },
    "La compréhension orale et la compréhension écrite comportent 39 questions à choix multiple chacune. Le résultat est exprimé sur une échelle de **0 à 699 points**, elle-même découpée en niveaux du Cadre européen commun de référence :",
    { table: {
      cols: ["Score /699", "Niveau CECR"],
      rows: [
        ["600 – 699", "C2"],
        ["500 – 599", "C1"],
        ["400 – 499", "B2"],
        ["300 – 399", "B1"],
        ["200 – 299", "A2"],
        ["100 – 199", "A1"],
        ["0 – 99", "A1 non atteint"],
      ],
    }, caption: "L'échelle de score des épreuves de compréhension et les niveaux CECR correspondants." },
    "Deux points méritent d'être soulignés. D'abord, **une mauvaise réponse ne retire pas de point** : il n'y a aucun intérêt à laisser une case vide, et tout intérêt à cocher quelque chose même quand on ne sait pas. Ensuite, les questions ne se valent pas toutes : la difficulté progresse au fil de l'épreuve, et les items les plus exigeants sont ceux qui vous font franchir les paliers supérieurs.",
    "C'est pourquoi un entraînement qui ne travaille que les questions faciles plafonne rapidement. Pour viser B2 et au-delà, il faut s'exposer délibérément aux items de niveau B2 et C1, y compris — surtout — quand ils font mal. Les pièges propres à chaque épreuve sont détaillés dans nos guides de [compréhension orale](/guide-tcf-canada/comprehension-orale) et de [compréhension écrite](/guide-tcf-canada/comprehension-ecrite).",

    { h: "Les deux productions : une note sur 20" },
    "L'expression écrite et l'expression orale suivent une autre logique. Elles sont évaluées par des **correcteurs humains habilités**, et chaque production est vue par **deux évaluateurs indépendants** qui ne connaissent pas la note de l'autre. Le résultat est une note **sur 20**, elle aussi convertie en niveau CECR.",
    "Ce que ces correcteurs regardent tient en quelques critères stables :",
    { ul: [
      "**Le respect de la consigne.** Tous les points demandés sont-ils traités ? Le registre est-il adapté au destinataire ? La longueur est-elle dans les bornes ?",
      "**La cohérence et l'organisation.** Le propos progresse-t-il ? Les idées sont-elles reliées par autre chose que « et » et « après » ?",
      "**L'étendue et la précision du lexique.** Le vocabulaire est-il varié, et surtout : est-il employé correctement ?",
      "**La correction grammaticale.** Accords, temps, structures. Les erreurs qui gênent la compréhension pèsent bien plus lourd que les fautes d'inattention.",
    ] },
    "Deux comportements font effondrer une note indépendamment du niveau réel : **recopier la consigne** au lieu de produire son propre texte, et **traiter un autre sujet** que celui posé. Dans les deux cas, la production est évaluée au plus bas de l'échelle. C'est un plancher administratif, pas un jugement sur votre français.",
    "Le détail de ces critères, tâche par tâche, est développé dans notre [guide de l'expression écrite](/guide-tcf-canada/expression-ecrite) et dans celui de [l'expression orale](/guide-tcf-canada/expression-orale).",

    { note: "À l'inverse, il n'existe pas de « note éliminatoire » au TCF Canada. Un score faible dans une épreuve ne fait pas échouer les autres. Le test mesure un niveau ; il ne délivre ni réussite ni échec.", title: "On ne « rate » pas le TCF Canada" },

    { h: "Du score au NCLC : la conversion qui compte vraiment" },
    "Pour vos démarches canadiennes, ni le score sur 699 ni la note sur 20 ne sont utilisés directement. Ils sont traduits en **Niveaux de compétence linguistique canadiens (NCLC)**, l'échelle officielle du gouvernement fédéral — l'équivalent francophone des CLB anglophones, maintenue par le [Centre des niveaux de compétence linguistique canadiens](https://www.language.ca/).",
    "C'est ce niveau NCLC, et lui seul, qui décide de votre admissibilité et de vos points :",
    { table: {
      cols: ["NCLC", "Compréh. orale /699", "Compréh. écrite /699", "Expr. orale /20", "Expr. écrite /20"],
      rows: [
        ["10 +", "549 – 699", "549 – 699", "16 – 20", "16 – 20"],
        ["9", "523 – 548", "524 – 548", "14 – 15", "14 – 15"],
        ["8", "503 – 522", "499 – 523", "12 – 13", "12 – 13"],
        ["7", "458 – 502", "453 – 498", "10 – 11", "10 – 11"],
        ["6", "398 – 457", "406 – 452", "7 – 9", "7 – 9"],
        ["5", "369 – 397", "375 – 405", "6", "6"],
        ["4", "331 – 368", "342 – 374", "4 – 5", "4 – 5"],
      ],
    }, caption: "Correspondance entre les résultats du TCF Canada et les niveaux NCLC." },
    "Regardez la ligne du NCLC 7 : 458 en compréhension orale, 453 en compréhension écrite, 10/20 dans les deux productions. C'est le palier le plus rentable de tout le système d'immigration économique, et il ne demande pas un français brillant — il demande un français solide et régulier.",
    "Regardez maintenant l'écart entre NCLC 7 et NCLC 8 : 45 points en compréhension orale, à peine 5 en compréhension écrite. Ces largeurs de bande très inégales expliquent pourquoi deux candidats aux scores proches peuvent se retrouver à des niveaux différents. Le tableau complet et ses implications sont détaillés dans [Score TCF Canada et niveaux NCLC](/blogue/score-tcf-canada-niveaux-nclc).",

    { cta: {
      r: "calculator",
      label: "Convertir mes scores en NCLC",
      text: "Entrez vos résultats — réels ou d'entraînement — et voyez immédiatement votre niveau NCLC dans chaque compétence, ainsi que le nombre de points qui vous sépare du palier suivant.",
    } },

    { h: "Ce que la notation implique pour votre préparation" },
    { ol: [
      "**Ciblez le maillon faible.** Puisqu'il n'y a pas de moyenne, votre plus mauvaise épreuve fixe votre plafond. C'est là que chaque heure de travail rapporte le plus.",
      "**Ne laissez jamais une case vide.** Aucune pénalité pour une mauvaise réponse : une réponse au hasard vaut mieux qu'une absence de réponse.",
      "**Entraînez-vous sur du difficile.** Ce sont les items B2/C1 qui font franchir les paliers ; réviser ce qu'on sait déjà rassure sans faire progresser.",
      "**Faites corriger vos productions.** Les épreuves d'expression sont les seules jugées par des humains, sur des critères précis. Écrire sans retour, c'est répéter ses erreurs avec constance.",
      "**Visez un palier au-dessus de votre cible.** Le jour J, le stress coûte quelques points. Une marge de sécurité transforme un résultat « limite » en résultat suffisant.",
    ] },
    "Et si le premier résultat ne suffit pas, ce n'est pas un échec : c'est une mesure. Vous savez désormais exactement combien de points il vous manque et dans quelle compétence — ce qui est infiniment plus utile qu'une impression. Pour transformer cette mesure en plan de travail, voyez [Comment se préparer au TCF Canada](/blogue/comment-se-preparer-au-tcf-canada), et pour connaître le niveau réellement exigé par votre programme, [Quel niveau faut-il viser](/blogue/quel-niveau-viser-tcf-canada).",
  ],
};
