import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import { Pricing } from "@/pages/Pricing";
import { CheckoutDz } from "@/pages/CheckoutDz";
import { Practice } from "@/pages/Practice";
import { Exams } from "@/pages/Exams";
import { AuthPage } from "@/components/auth/AuthPage";
import { Listening } from "@/pages/Listening";
import { Reading } from "@/pages/Reading";
import { Writing } from "@/pages/Writing";
import { Speaking } from "@/pages/Speaking";
import { Vocabulary } from "@/pages/Vocabulary";
import { Grammar } from "@/pages/Grammar";
import { Mocks } from "@/pages/Mocks";
import { Calculator } from "@/pages/Calculator";
import { Guide } from "@/pages/Guide";
import { GuideExpressionEcrite } from "@/pages/GuideExpressionEcrite";
import { GuideExpressionOrale } from "@/pages/GuideExpressionOrale";
import { GuideComprehensionOrale, GuideComprehensionEcrite } from "@/pages/GuideComprehension";
import { SujetsExpressionEcrite } from "@/pages/SujetsExpressionEcrite";
import { SujetsExpressionOrale } from "@/pages/SujetsExpressionOrale";
import { SujetsActualite } from "@/pages/SujetsActualite";
import { Contact } from "@/pages/Contact";
import { FAQ } from "@/pages/FAQ";
import { Blog } from "@/pages/Blog";
import { Dashboard } from "@/pages/Dashboard";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { Admin } from "@/pages/Admin";
import { QuestionBank } from "@/pages/QuestionBank";
import { NotFound } from "@/pages/NotFound";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";

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
  practice: Practice,
  exams: Exams,
  login: Login,
  register: Register,
  "reset-password": ResetPassword,
  listening: Listening,
  reading: Reading,
  writing: Writing,
  speaking: Speaking,
  vocabulary: Vocabulary,
  grammar: Grammar,
  mocks: Mocks,
  calculator: Calculator,
  guide: Guide,
  "guide-ee": GuideExpressionEcrite,
  "guide-eo": GuideExpressionOrale,
  "guide-co": GuideComprehensionOrale,
  "guide-ce": GuideComprehensionEcrite,
  "sujets-ee": SujetsExpressionEcrite,
  "sujets-eo": SujetsExpressionOrale,
  "sujets-actualite": SujetsActualite,
  contact: Contact,
  faq: FAQ,
  blog: Blog,
  dashboard: Dashboard,
  profile: Profile,
  admin: Admin,
  bank: QuestionBank,
  terms: Terms,
  privacy: Privacy,
  notfound: NotFound,
};
