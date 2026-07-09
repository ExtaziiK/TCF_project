import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import { Pricing } from "@/pages/Pricing";
import { Practice } from "@/pages/Practice";
import { AuthPage } from "@/components/auth/AuthPage";
import { Listening } from "@/pages/Listening";
import { Reading } from "@/pages/Reading";
import { Writing } from "@/pages/Writing";
import { Speaking } from "@/pages/Speaking";
import { Vocabulary } from "@/pages/Vocabulary";
import { Grammar } from "@/pages/Grammar";
import { Mocks } from "@/pages/Mocks";
import { Contact } from "@/pages/Contact";
import { FAQ } from "@/pages/FAQ";
import { Blog } from "@/pages/Blog";
import { Dashboard } from "@/pages/Dashboard";
import { Profile } from "@/pages/Profile";
import { Admin } from "@/pages/Admin";
import { QuestionBank } from "@/pages/QuestionBank";

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
  practice: Practice,
  login: Login,
  register: Register,
  listening: Listening,
  reading: Reading,
  writing: Writing,
  speaking: Speaking,
  vocabulary: Vocabulary,
  grammar: Grammar,
  mocks: Mocks,
  contact: Contact,
  faq: FAQ,
  blog: Blog,
  dashboard: Dashboard,
  profile: Profile,
  admin: Admin,
  bank: QuestionBank,
};
