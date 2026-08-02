// Déclaration d'accessibilité.
//
// Third of the footer's legal trio, and the one with the least law behind it:
// an accessibility statement is mandatory for public bodies (Quebec, EU), and
// voluntary for a private platform like this one. It is published anyway
// because the footer already carried the word "Accessibilité" as a dead label
// for months — a claim with no page behind it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE RULE FOR EDITING THIS FILE: every statement below is checkable against
// the code, and was checked when written. Section 2 lists only what is actually
// implemented; section 3 lists the gaps found in the same pass, by name, and
// each one is a real finding rather than a hedge:
//
//   · no skip link — nothing lets a keyboard user jump the fixed <header>
//   · RealAudio's progress bar is a div with onClick and role="progressbar",
//     so seeking is mouse-only (and the role is wrong for a control: an
//     operable seek bar is a slider). Play/pause IS a labelled <button>.
//   · `c.faint` is text-slate-400, ~2.5:1 on the light canvas — under the 4.5:1
//     AA target for body text. It is used for timestamps and hints.
//   · four <div onClick> handlers remain outside the semantic button path
//
// Fixing one of these means editing section 3 in the SAME commit. A statement
// that lists gaps already closed is as dishonest as one that hides them, and
// this document is worth exactly as much as its accuracy.
//
// What section 4 describes is different in kind: those are limits of the
// EXERCISE, not defects to fix. A listening test with a transcript stops
// measuring listening. They are disclosed so a candidate knows before paying.
// ─────────────────────────────────────────────────────────────────────────────

export const A11Y_UPDATED = "2 août 2026";

// The target, named once. WCAG 2.1 AA is the level Quebec, Canada and the EU
// all converge on; "viser" is deliberate — nothing here claims conformity, and
// no third party has audited the site.
export const A11Y_STANDARD = "WCAG 2.1 niveau AA";

export const A11Y_SECTIONS = [
  {
    t: "1. Notre engagement",
    p: [
      "Passerelle prépare des candidates et des candidats à un examen qui décide d'un projet d'immigration. Une plateforme qui exclut une partie d'entre eux échoue à ce qu'elle promet. Nous visons donc le niveau WCAG 2.1 AA, le référentiel retenu au Québec, au Canada et dans l'Union européenne.",
      "Cette déclaration n'est pas une attestation de conformité. Le site n'a pas été audité par un tiers et nous ne prétendons pas être pleinement conformes : nous décrivons ci-dessous ce qui est en place, ce qui ne l'est pas encore, et ce qui ne le sera pas. Les limites listées à la section 3 ont été relevées par nos soins, et elles sont nommées précisément plutôt que résumées en une formule prudente.",
      "Ce document décrit l'état du site à la date indiquée en tête. Il est mis à jour quand le site change, pas une fois par an.",
    ],
  },
  {
    t: "2. Ce qui est en place aujourd'hui",
    p: [
      "Navigation au clavier : les commandes de la plateforme sont de véritables boutons et liens, atteignables par la touche Tabulation et activables par Entrée ou Espace. Chaque élément reçoit un contour bleu net et décalé lorsqu'il a le focus, y compris en mode sombre — vous voyez toujours où vous êtes.",
      "Lecteurs d'écran : la page annonce ses régions (en-tête, navigation principale, contenu principal). Les boutons qui n'affichent qu'une icône — lecture audio, menus, fermeture, réseaux sociaux — portent un intitulé textuel lu à voix haute au lieu d'être annoncés comme « bouton ». Les illustrations des questions ont une alternative textuelle, et les éléments purement décoratifs sont masqués aux technologies d'assistance plutôt que lus inutilement.",
      "Animations : si votre système est réglé sur « réduire les animations », toutes les animations et transitions du site sont désactivées, sans exception et sans réglage à trouver dans nos préférences. C'est le réglage de votre appareil qui décide.",
      "Lisibilité : un thème clair et un thème sombre sont disponibles, et le site suit le zoom du navigateur ainsi que la taille de police du système. La langue de la page est déclarée et suit le sélecteur français / anglais, pour que la synthèse vocale emploie la bonne prononciation.",
      "Sous-titres et transcriptions ne sont pas concernés ici : hors des documents d'examen, la plateforme ne diffuse pas de vidéo.",
    ],
  },
  {
    t: "3. Limites connues",
    p: [
      "Nous préférons les nommer que les laisser découvrir. À la date de cette déclaration :",
      "Il n'existe pas encore de lien « Aller au contenu principal ». Un utilisateur au clavier doit traverser la barre de navigation à chaque page avant d'atteindre le contenu.",
      "Le lecteur audio des questions : le bouton Écouter / Pause est accessible au clavier et correctement annoncé, mais la barre de progression ne se déplace qu'à la souris. Il n'est pas possible d'avancer ou de reculer dans un document audio au clavier. (En mode examen, l'écoute est unique et la barre n'est de toute façon pas déplaçable.)",
      "Certains textes secondaires — horodatages, mentions d'aide, compteurs — s'affichent en gris clair dont le contraste reste sous le rapport de 4,5:1 exigé au niveau AA. L'information principale n'en dépend jamais, mais ces mentions sont difficiles à lire pour une vision affaiblie.",
      "Quelques commandes secondaires, en particulier dans l'espace d'administration, n'ont pas été vérifiées au clavier et peuvent ne pas être atteignables autrement qu'à la souris.",
      "Enfin, le site n'a pas été testé avec l'ensemble des combinaisons de lecteurs d'écran et de navigateurs. Un problème peut donc exister sans que nous le sachions : la section 5 est là pour ça.",
    ],
  },
  {
    t: "4. Limites propres à l'épreuve",
    p: [
      "Certaines barrières ne sont pas des défauts que nous pourrions corriger : elles tiennent à ce que l'examen mesure. Nous les indiquons pour que personne ne découvre après un achat que la plateforme ne convient pas à sa situation.",
      "La compréhension orale repose sur des documents audio sans transcription, et il n'y en aura pas : un test d'écoute accompagné du texte ne mesure plus l'écoute. Cette épreuve n'est donc pas praticable par une personne sourde ou fortement malentendante.",
      "L'expression orale suppose un microphone et une prise de parole en français. Elle ne peut pas être remplacée par une réponse écrite sans cesser d'évaluer ce qu'elle évalue.",
      "Les TCF blancs et certaines séries sont chronométrés parce que la contrainte de temps fait partie de l'épreuve reproduite. Ces durées ne peuvent pas être allongées. En dehors du mode examen, l'entraînement libre n'impose aucune limite de temps : vous pouvez travailler à votre rythme sur les mêmes contenus.",
      "Si vous avez besoin d'un aménagement pour le véritable TCF Canada — temps majoré, format adapté, assistance — la demande se fait auprès de votre centre de passation et de France Éducation international, qui organisent l'examen officiel. Passerelle est une plateforme de préparation indépendante et n'a aucun rôle dans ces aménagements.",
    ],
  },
  {
    t: "5. Signaler un problème",
    p: [
      "Si une page, une commande ou un exercice vous est inutilisable, écrivez à {courriel}. C'est la même adresse que pour le reste du service, et elle est relevée.",
      "Indiquez si possible la page concernée, ce que vous tentiez de faire, et votre équipement — navigateur, système, lecteur d'écran ou autre aide technique employée. Ces trois éléments suffisent presque toujours à reproduire le problème.",
      "Nous accusons réception sous quelques jours ouvrables. Quand un correctif demande du temps, nous cherchons d'abord une solution de contournement pour que vous puissiez continuer à travailler entre-temps, et les problèmes qui empêchent complètement l'usage d'une fonction passent devant le reste.",
      "Les signalements reçus alimentent directement la section 3 : c'est ainsi que cette liste s'allonge, puis se raccourcit.",
    ],
  },
  {
    t: "6. Portée de cette déclaration",
    p: [
      "La présente déclaration couvre le site tcfpasserelle.com et l'application accessible à cette adresse. Elle ne couvre pas les services tiers que vous pourriez utiliser en parallèle, ni nos pages sur les réseaux sociaux, dont l'accessibilité relève des plateformes qui les hébergent.",
      "Passerelle est une plateforme privée et non un organisme public : cette déclaration est publiée volontairement, et non en exécution d'une obligation légale de publication. Elle vient en complément des conditions générales d'utilisation et de la politique de confidentialité, sans les modifier.",
    ],
  },
];
