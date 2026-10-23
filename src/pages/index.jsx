import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Every page is its own chunk, fetched on first visit, so a visitor's first
// download is the shell and the page they opened — not the admin, the guides,
// the blog posts and the practice tools. Home included: its demos, calculator
// and carousel were a third of the entry bundle on every other page. Each
// page's prerendered HTML preloads its chunk (scripts/prerender.mjs), so
// lazy costs no extra round trip. Each lazy page carries its
// own Suspense boundary, so App needs no change to render one.
function PageLoading() {
  return (
    <main className="min-h-screen pt-32 flex justify-center" aria-busy="true">
      <Loader2 size={22} className="animate-spin text-blue-600 opacity-60" />
    </main>
  );
}

function lazyPage(load, name) {
  const Lazy = lazy(() => load().then((m) => ({ default: m[name] })));
  function LazyPage(props) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  LazyPage.displayName = `Lazy(${name})`;
  return LazyPage;
}

const Home = lazyPage(() => import("@/pages/Home"), "Home");
const About = lazyPage(() => import("@/pages/About"), "About");
const Pricing = lazyPage(() => import("@/pages/Pricing"), "Pricing");
const CheckoutDz = lazyPage(() => import("@/pages/CheckoutDz"), "CheckoutDz");
const Exams = lazyPage(() => import("@/pages/Exams"), "Exams");
const AuthPage = lazyPage(() => import("@/components/auth/AuthPage"), "AuthPage");
const Pratique = lazyPage(() => import("@/pages/Pratique"), "Pratique");
const Mocks = lazyPage(() => import("@/pages/Mocks"), "Mocks");
const Calculator = lazyPage(() => import("@/pages/Calculator"), "Calculator");
const Avis = lazyPage(() => import("@/pages/Avis"), "Avis");
const Guide = lazyPage(() => import("@/pages/Guide"), "Guide");
const GuideExpressionEcrite = lazyPage(() => import("@/pages/GuideExpressionEcrite"), "GuideExpressionEcrite");
const GuideExpressionOrale = lazyPage(() => import("@/pages/GuideExpressionOrale"), "GuideExpressionOrale");
const GuideComprehensionOrale = lazyPage(() => import("@/pages/GuideComprehension"), "GuideComprehensionOrale");
const GuideComprehensionEcrite = lazyPage(() => import("@/pages/GuideComprehension"), "GuideComprehensionEcrite");
const SujetsExpressionEcrite = lazyPage(() => import("@/pages/SujetsExpressionEcrite"), "SujetsExpressionEcrite");
const SujetsExpressionOrale = lazyPage(() => import("@/pages/SujetsExpressionOrale"), "SujetsExpressionOrale");
const SujetsActualite = lazyPage(() => import("@/pages/SujetsActualite"), "SujetsActualite");
const SujetModeleReponse = lazyPage(() => import("@/pages/SujetModeleReponse"), "SujetModeleReponse");
const Contact = lazyPage(() => import("@/pages/Contact"), "Contact");
const FAQ = lazyPage(() => import("@/pages/FAQ"), "FAQ");
const Blog = lazyPage(() => import("@/pages/Blog"), "Blog");
const Dashboard = lazyPage(() => import("@/pages/Dashboard"), "Dashboard");
const Profile = lazyPage(() => import("@/pages/Profile"), "Profile");
const ResetPassword = lazyPage(() => import("@/pages/ResetPassword"), "ResetPassword");
const Admin = lazyPage(() => import("@/pages/Admin"), "Admin");
const Moderation = lazyPage(() => import("@/pages/Moderation"), "Moderation");
const CodePromo = lazyPage(() => import("@/pages/CodePromo"), "CodePromo");
const QuestionBank = lazyPage(() => import("@/pages/QuestionBank"), "QuestionBank");
const NotFound = lazyPage(() => import("@/pages/NotFound"), "NotFound");
const Terms = lazyPage(() => import("@/pages/Terms"), "Terms");
const Privacy = lazyPage(() => import("@/pages/Privacy"), "Privacy");
const Accessibility = lazyPage(() => import("@/pages/Accessibility"), "Accessibility");

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
