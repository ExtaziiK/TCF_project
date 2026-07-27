// Detailed method for the TCF Canada "Expression écrite" épreuve, shown on the
// dedicated guide page (pages/GuideExpressionEcrite.jsx) linked from the exam
// guide. Content is a cleaned-up, presentable version of the classic
// task-by-task method taught for this épreuve.

// What the épreuve assesses.
export const EE_CRITERIA = [
  "Communiquer un message de façon claire.",
  "Donner les informations demandées.",
  "Décrire, raconter, expliquer.",
  "Justifier un choix, une position, une décision.",
  "Enchaîner des idées et faire preuve de cohérence.",
  "Comparer deux points de vue.",
  "Exprimer votre avis et l'argumenter.",
  "Utiliser un vocabulaire et des structures adaptés à la tâche.",
  "Faire une synthèse et reformuler.",
];

// The three tasks, each with its brief, word range and a structured method.
export const EE_METHOD = [
  {
    n: 1,
    title: "Message / Email",
    words: "60 à 120 mots",
    brief: "Rédaction d'un message pour décrire, raconter et/ou expliquer, adressé à un ou plusieurs destinataires dont le statut est précisé dans la consigne.",
    structureTitle: "La structure du message",
    steps: [
      { s: "Objet", d: "Un objet court et clair. Ex. : « Mes congés à Dakar »." },
      { s: "Salutations", d: "Adaptez le registre au destinataire. Ex. : « Coucou Samy, comment vas-tu ? »." },
      { s: "Objectif du message", d: "Annoncez d'emblée pourquoi vous écrivez. Ex. : « Je t'écris pour te dire que je serai à Paris. »." },
      { s: "Détails de la circonstance", d: "Répondez à : qui ? quoi ? quand ? où ? avec qui ?" },
      { s: "Attentes concrètes", d: "Selon la consigne. Ex. : « J'aimerais que tu repères des endroits chics à visiter. »." },
      { s: "Formules de clôture", d: "Recommandation, promesse ou remerciement." },
      { s: "Salutations finales", d: "« À bientôt », « Porte-toi bien », « Amicalement », « Cordialement »…" },
    ],
    // Ready-to-use French model phrases for this task, grouped by moment in the
    // message. Adapt them to the prompt on exam day. (Content is French model
    // language to memorize, so it is rendered as-is rather than translated.)
    phraseBank: {
      title: "Templates & phrases prêtes à l'emploi",
      intro: "Apprenez ces modèles, adaptez-les au sujet donné et gagnez du temps le jour J.",
      sections: [
        {
          kind: "registers",
          label: "1 · La salutation",
          amical: ["Salut les amis,", "Bonjour cher ami,", "Chers camarades,", "Chers collègues,"],
          formel: ["Bonjour Madame la Directrice,", "Monsieur le Responsable,", "Madame, Monsieur,", "À qui de droit,"],
        },
        {
          kind: "phrases",
          label: "2 · La formule de politesse (ouverture)",
          items: [
            "J'espère que ce message te trouve en pleine forme.",
            "J'espère que tu te portes bien !",
            "J'espère que vous allez bien depuis notre dernière rencontre.",
            "Je prends de vos nouvelles avec plaisir.",
          ],
        },
        {
          kind: "phrases",
          label: "3 · L'introduction (l'objet du message)",
          note: "Allez droit au but dès la première phrase : expliquez pourquoi vous écrivez.",
          items: [
            "Je t'écris ce message pour…",
            "J'ai une super nouvelle à t'annoncer…",
            "Je me permets de vous contacter afin de…",
            "Je vous écris pour vous informer de…",
            "C'est avec grand plaisir que je vous annonce…",
            "Je souhaitais vous faire part de…",
          ],
        },
        {
          kind: "chips",
          label: "4 · Connecteurs logiques essentiels",
          items: ["Tout d'abord,", "Ensuite,", "De plus,", "Par ailleurs,", "En outre,", "Cependant,", "Néanmoins,", "Enfin,", "En effet,", "C'est pourquoi,", "D'une part… d'autre part,", "Ainsi,"],
        },
        {
          kind: "phrases",
          label: "Introduire des détails / précisions",
          items: [
            "Je tiens à préciser que…",
            "Il est important de mentionner que…",
            "Je souhaite également te/vous signaler que…",
            "À ce propos, je voudrais ajouter que…",
          ],
        },
        {
          kind: "phrases",
          label: "5 · La conclusion",
          note: "Terminez par une conclusion ou une invitation à répondre.",
          items: [
            "Je reste disponible pour toute question complémentaire.",
            "N'hésite pas à me contacter si tu as besoin de plus d'informations.",
            "Dans l'attente de ta/votre réponse, je reste à ta/votre disposition.",
            "Je t'encourage vivement à profiter de cette opportunité.",
            "C'est un endroit génial que je recommande vivement à tout le monde.",
            "C'est sans aucun doute le meilleur concert auquel j'ai assisté cette année.",
          ],
        },
        {
          kind: "registers",
          label: "6 · La signature (clôture)",
          amical: ["À bientôt !", "À très vite !", "Bisous / Bises,", "Ton ami(e), Sam"],
          formel: ["Cordialement,", "Bien à vous,", "Veuillez agréer mes salutations distinguées,", "Sam"],
        },
      ],
      // Fill-in template. Text in {curly braces} is a placeholder to adapt.
      template: {
        label: "Template complet · Message amical",
        lines: [
          "Salut {Prénom},",
          "J'espère que ce message te trouve en pleine forme !",
          "Je t'écris pour {expliquer l'objet du message}.",
          "Tout d'abord, {idée principale 1}. De plus, {idée principale 2}. Par ailleurs, {idée principale 3 / détail supplémentaire}.",
          "C'est {un endroit / un événement / une expérience} que je te recommande vivement. {Phrase de conclusion ou invitation à répondre}.",
          "À très vite !",
          "{Sam}",
        ],
      },
    },
  },
  {
    n: 2,
    title: "Le compte rendu / l'article",
    words: "120 à 150 mots",
    brief: "Rédaction d'un article, d'un courrier ou d'une note à l'intention de plusieurs destinataires : un compte rendu d'expérience ou un récit, accompagné de commentaires, d'opinions ou d'arguments selon un objectif (revendiquer, se réconcilier…).",
    note: "L'objectif : raconter ou rendre compte pour plaire, attirer ou réconcilier. Pour un courriel, réutilisez la structure de la Tâche 1 ; pour un article de blog, suivez la structure ci-dessous.",
    example: "Exemple de consigne : « Rédigez un article de blog sur un métier qui vous passionne, en donnant envie aux gens de s'y intéresser. »",
    structureTitle: "La structure de l'article de blog",
    steps: [
      { s: "Un titre accrocheur", d: "Ex. : « Enseigner, un métier de nobles ». Un bon titre donne envie de lire (comme « 3 façons de reconquérir son ex »)." },
      { s: "Présentation de l'activité", d: "Premier paragraphe : présentez le sujet de façon succincte et attirante. C'est quoi ? Apportez des informations perspicaces." },
      { s: "Votre expérience", d: "Racontez votre propre expérience, avec des détails concrets." },
      { s: "Recommandations", d: "Invitez vos lecteurs à s'intéresser à l'activité. Adaptez toujours à la consigne." },
    ],
    phraseBank: {
      title: "Templates & phrases prêtes à l'emploi",
      intro: "Combinez le récit au passé composé et la description à l'imparfait. Adaptez ces modèles à l'événement du sujet.",
      sections: [
        {
          kind: "phrases",
          label: "1 · Choisir un titre accrocheur",
          items: [
            "Une journée inoubliable au [festival / concert / salon…]",
            "Mon expérience au [événement] : un moment magique",
            "[Nom de l'événement] : une réussite totale !",
            "Retour sur [l'événement] qui m'a marqué(e)",
          ],
        },
        {
          kind: "chips",
          label: "2 · Formule d'appel",
          items: ["Chers lectrices et lecteurs,", "Chers camarades,", "Salut à tous,", "Bonjour à toutes et à tous,"],
        },
        {
          kind: "model",
          label: "Introduction",
          lines: [
            "Je vous écris pour vous faire part de mon expérience lors de {nom de l'événement}.",
            "J'aimerais vous parler d'{un spectacle / un festival / une cérémonie / un cirque} qui m'a beaucoup marqué(e) et que je souhaitais partager avec vous.",
          ],
        },
        {
          kind: "model",
          label: "3A · Le récit — passé composé",
          note: "Racontez les faits en utilisant le passé composé.",
          lines: [
            "Dès notre arrivée, nous avons été accueillis par les organisateurs. Ensuite, nous avons visité les installations avant d'assister à {la conférence / la cérémonie / le spectacle}. Puis, nous avons participé à {activité}, ce qui a été une expérience vraiment enrichissante.",
          ],
        },
        {
          kind: "chips",
          label: "Connecteurs pour le récit",
          items: ["Dès notre arrivée,", "Tout d'abord,", "Ensuite,", "Puis,", "Après cela,", "Par la suite,", "Finalement,", "Pour clore la journée,"],
        },
        {
          kind: "model",
          label: "3B · Description & sentiments — imparfait",
          note: "Décrivez l'ambiance, les lieux ou les personnes en utilisant l'imparfait.",
          lines: [
            "Il y avait des stands de nourriture proposant des plats variés. Il y avait de grandes tentes réservées à la gastronomie locale. Des animations et des espaces détente étaient également disponibles. L'atmosphère était {chaleureuse / festive / électrisante / conviviale} et tous les participants semblaient enchantés.",
          ],
        },
        {
          kind: "chips",
          label: "Vocabulaire pour décrire l'ambiance",
          items: ["chaleureuse", "festive", "électrisante", "conviviale", "exceptionnelle", "inoubliable", "animée", "spectaculaire", "mémorable"],
        },
        {
          kind: "model",
          label: "4 & 5 · Conclusion, ouverture & clôture",
          lines: [
            "En conclusion, ce fut une réussite totale sur le plan {personnel / professionnel / culturel}. Je recommande vivement cet événement à tous ceux qui souhaitent {découvrir / s'enrichir / se divertir}.",
            "Merci de me lire — à très bientôt pour de nouvelles aventures {culturelles / gastronomiques / sportives} !",
          ],
        },
      ],
    },
  },
  {
    n: 3,
    title: "Comparer deux points de vue",
    words: "120 à 180 mots",
    brief: "Rédaction d'un texte (journal, site Internet, collègue, supérieur hiérarchique…) qui compare deux points de vue sur un fait de société, exprimés dans deux documents courts (~90 mots chacun), puis prend position sur le thème.",
    twoParts: [
      { p: "1re partie · 40 à 60 mots", d: "Résumez le point de vue des deux documents." },
      { p: "2e partie · 80 à 120 mots", d: "Donnez et argumentez votre propre point de vue sur le sujet." },
    ],
    structureTitle: "La structure",
    steps: [
      { s: "Titre", d: "" },
      { s: "Le point de vue des deux documents", d: "" },
      { s: "Votre point de vue", d: "" },
    ],
    examples: [
      { label: "Résumer les deux documents", quote: "De nos jours, la question de l'utilisation d'Internet par les enfants divise l'opinion publique. Certains pensent que [résumé du document A] l'Internet rend les enfants paresseux et improductifs. À l'inverse, [résumé du document B] d'autres y voient un véritable support de connaissances et de développement de l'imagination." },
      { label: "Introduire votre point de vue", quote: "À ce sujet, il est important de reconnaître qu'il devient aujourd'hui difficile d'appréhender la dynamique des sociétés actuelles en négligeant le rôle d'Internet. Cet outil est devenu incontournable ; c'est pourquoi il faut y associer un contrôle parental pour réguler les heures de connexion et choisir les sites adaptés à l'âge des enfants." },
    ],
    phraseBank: {
      title: "Templates & phrases prêtes à l'emploi",
      intro: "Présentez les avantages et les inconvénients du sujet, puis prenez position de façon réfléchie et équilibrée.",
      sections: [
        {
          kind: "phrases",
          label: "1 · Choisir un titre accrocheur",
          items: [
            "[Sujet] : pour ou contre ?",
            "[Sujet] : quels enjeux pour notre société ?",
            "[Sujet] : opportunité ou danger ?",
            "Faut-il adopter [Sujet] ?",
          ],
        },
        {
          kind: "model",
          label: "2 · Introduction",
          lines: [
            "{Le sujet / La thématique} occupe une place importante dans notre vie. Le premier document {met en avant / souligne / présente} {les avantages / les aspects positifs}. Toutefois, le deuxième document {met en avant / souligne} {ses inconvénients / ses aspects négatifs}.",
          ],
        },
        {
          kind: "model",
          label: "3A · Argument 1 — l'aspect positif (Pour)",
          lines: [
            "De mon avis, ce {sujet / thème} présente de nombreux avantages. Pour ma part, je suis fermement convaincu(e) que cette {démarche / stratégie / initiative} présente plusieurs avantages. Tout d'abord, {argument positif 1}. De plus, {argument positif 2}. Par ailleurs, {argument positif 3}.",
          ],
        },
        {
          kind: "chips",
          label: "Formules pour introduire un avantage",
          items: [
            "Pour ma part, je suis convaincu(e) que…",
            "Il est indéniable que…",
            "Force est de constater que…",
            "Il convient de souligner que…",
            "On ne peut pas nier les bienfaits de…",
          ],
        },
        {
          kind: "model",
          label: "3B · Argument 2 — l'aspect négatif (Contre / Nuance)",
          lines: [
            "Néanmoins, il faut prendre en compte les inconvénients. Certes, il existe des avantages, mais il ne faut pas négliger les inconvénients. D'abord, {inconvénient 1}. Ensuite, {inconvénient 2}. Qui plus est, {inconvénient 3}.",
          ],
        },
        {
          kind: "chips",
          label: "Connecteurs de concession et d'opposition",
          items: ["Certes…", "Néanmoins,", "Toutefois,", "Cependant,", "En revanche,", "Malgré cela,", "Il faut reconnaître que…", "On ne peut pas ignorer que…", "Qui plus est,", "Reste que…"],
        },
        {
          kind: "model",
          label: "4 · Conclusion",
          lines: [
            "En conclusion, après avoir examiné les deux avis, il semble évident qu'il faut adopter une mesure réfléchie et la mettre en œuvre avec équilibre. À titre personnel, je reste convaincu(e) que {votre prise de position finale}.",
          ],
        },
      ],
    },
  },
];
