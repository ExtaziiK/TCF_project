import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import { Pricing } from "@/pages/Pricing";
import { CheckoutDz } from "@/pages/CheckoutDz";
import { Exams } from "@/pages/Exams";
import { AuthPage } from "@/components/auth/AuthPage";
import { Pratique } from "@/pages/Pratique";
import { Mocks } from "@/pages/Mocks";
import { Calculator } from "@/pages/Calculator";
import { Avis } from "@/pages/Avis";
import { Guide } from "@/pages/Guide";
import { GuideExpressionEcrite } from "@/pages/GuideExpressionEcrite";
import { GuideExpressionOrale } from "@/pages/GuideExpressionOrale";
import { GuideComprehensionOrale, GuideComprehensionEcrite } from "@/pages/GuideComprehension";
import { SujetsExpressionEcrite } from "@/pages/SujetsExpressionEcrite";
import { SujetsExpressionOrale } from "@/pages/SujetsExpressionOrale";
import { SujetsActualite } from "@/pages/SujetsActualite";
import { SujetModeleReponse } from "@/pages/SujetModeleReponse";
import { Contact } from "@/pages/Contact";
import { FAQ } from "@/pages/FAQ";
import { Blog } from "@/pages/Blog";
import { Dashboard } from "@/pages/Dashboard";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { Admin } from "@/pages/Admin";
import { Moderation } from "@/pages/Moderation";
import { CodePromo } from "@/pages/CodePromo";
import { QuestionBank } from "@/pages/QuestionBank";
import { NotFound } from "@/pages/NotFound";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { Accessibility } from "@/pages/Accessibility";

function Login() {
  return <AuthPage mode="login" />;
}

function Register() {
  return <AuthPage mode="register" />;
}

// Maps each route id to its page component. Access control (auth, premium,
// admin) is enforced centrally by RouteGuard (src/auth/rbac.js), not here.
export const PAGES = {
  home: Home,
  about: About,
  pricing: Pricing,
  "checkout-dz": CheckoutDz,
  // The old free-practice and per-épreuve pages open the Épreuves hub (on the
  // matching tab), which has the free plan's locks built in.
  practice: Exams,
  exams: Exams,
  login: Login,
  register: Register,
  "reset-password": ResetPassword,
  listening: Exams,
  reading: Exams,
  writing: Exams,
  speaking: Exams,
  // The six practice tools all open the Pratique hub, on their own tab;
  // "entrainement" is the hub's own address (the nav's « Pratique » link).
  entrainement: Pratique,
  vocabulary: Pratique,
  grammar: Pratique,
  conjugation: Pratique,
  dictee: Pratique,
  mocks: Mocks,
  calculator: Calculator,
  avis: Avis,
  guide: Guide,
  "guide-ee": GuideExpressionEcrite,
  "guide-eo": GuideExpressionOrale,
  "guide-co": GuideComprehensionOrale,
  "guide-ce": GuideComprehensionEcrite,
  "sujets-ee": SujetsExpressionEcrite,
  "sujets-eo": SujetsExpressionOrale,
  "sujets-actualite": SujetsActualite,
  "sujet-reponse": SujetModeleReponse,
  contact: Contact,
  faq: FAQ,
  blog: Blog,
  dashboard: Dashboard,
  profile: Profile,
  admin: Admin,
  moderation: Moderation,
  "code-promo": CodePromo,
  bank: QuestionBank,
  revision: Pratique,
  carnet: Pratique,
  terms: Terms,
  privacy: Privacy,
  accessibility: Accessibility,
  notfound: NotFound,
};
