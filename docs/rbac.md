# Contrôle d'accès (RBAC + abonnement)

## Rôles

| Rôle | Qui | Pratique (menu) | Accès |
|---|---|---|---|
| `VISITOR` | non connecté | Pratique gratuite seulement | pages publiques ; la pratique gratuite affiche une page d'inscription |
| `FREE_USER` | connecté, sans abonnement | Pratique gratuite seulement | pratique gratuite, tableau de bord, progression |
| `PREMIUM_USER` | connecté, abonnement actif | tous les modules sauf Banque de questions | tout le contenu premium (via les pages de modules) |
| `ADMIN` | `app_metadata.role = "admin"` | tout, y compris Banque de questions | toutes les pages, gestion de la banque |

## Où tout est décidé

- **`src/auth/rbac.js`** — la seule source de vérité : rôles (`deriveRole`),
  abonnement actif (`hasActiveSubscription`), politique par route
  (`PAGE_ACCESS`), et raison de refus (`deniedReason`).
- **`src/components/auth/RouteGuard.jsx`** — garde centrale montée dans
  `App.jsx` autour de chaque page. Refus → page d'inscription (visiteur),
  page de connexion, page « passer au Premium » (utilisateur gratuit) ou 403
  (non-admin sur une route admin). Taper une route à la main passe par la
  même garde : masquer un lien du menu n'est jamais la protection.
- **`src/constants/navigation.js`** — configuration de navigation unique ;
  chaque entrée porte un tableau `roles`. `navLinksForRole()` filtre le menu
  (bureau + mobile) — aucun composant ne filtre de son côté.

## Attribution des rôles et de l'abonnement (Supabase)

Les rôles et le plan vivent dans **`app_metadata`**, que le client ne peut
pas modifier (contrairement à `user_metadata`). À définir depuis le
dashboard Supabase (Authentication → Users → « Raw app meta data ») ou via
l'API admin côté serveur :

```json
{ "role": "admin" }
{ "plan": "Premium" }
{ "plan": "Premium", "premium_until": "2027-01-31" }
```

- Sans `plan: "Premium"` actif → `FREE_USER`.
- `premium_until` est réévalué à chaque rendu : à l'expiration, l'accès
  premium tombe immédiatement (navigation mise à jour, routes premium
  redirigées vers la page d'abonnement) sans rafraîchir la session.
- Quand un paiement réel (Stripe, etc.) sera branché, le webhook devra
  mettre à jour `app_metadata.plan` / `premium_until` via l'API admin
  Supabase — rien à changer côté client.

## Contenu premium = banque de questions

Les pages Compréhension orale / écrite (et Expression écrite / orale dès
que leurs dossiers `src/bank/ee|eo` contiendront des quiz) rendent
`BankExplorer` (`src/components/bank/BankExplorer.jsx`) verrouillé sur leur
section : mêmes données, même moteur de quiz que la Banque de questions,
zéro duplication. La page « Banque de questions » (`bank`) n'est qu'une vue
admin de ce même composant, toutes sections confondues, et n'apparaît ni
dans le menu ni dans la recherche pour les non-admins.

## Examens blancs

La page « Examens blancs » (`mocks`, Premium/Admin) génère chaque examen
dynamiquement : 4 tâches tirées au hasard de la banque
(`src/services/examService.js`), réparties entre les épreuves disponibles,
en privilégiant les quiz les moins rencontrés par l'utilisateur — aucun ID
codé en dur, tout nouveau quiz déposé dans la banque entre automatiquement
dans le tirage. Chaque tentative est enregistrée avec son tirage et sa
progression : exécuter `supabase/migrations/20260707_exam_attempts.sql`
dans le SQL Editor du dashboard pour activer la persistance Supabase
(RLS : lignes visibles par leur propriétaire uniquement, création limitée
aux Premium/Admin via le JWT). Sans les tables, l'app retombe sur un
stockage local (localStorage) automatiquement.

## Limite connue (à traiter côté serveur)

Cette application est une SPA Vite : les quiz JSON de `src/bank/` sont
**embarqués dans le bundle client** au build. La garde de routes empêche
toute navigation non autorisée dans l'app, et les rôles sont bien décidés
côté serveur (app_metadata), mais une personne déterminée peut extraire le
contenu du bundle JavaScript. Pour une protection serveur réelle du
contenu, il faudra migrer les quiz dans des tables Supabase protégées par
RLS (politique : `plan = 'Premium'` via un claim JWT) et les charger à la
demande — la structure actuelle (`bankService.getBank()`) est le seul point
à réimplémenter ce jour-là.
