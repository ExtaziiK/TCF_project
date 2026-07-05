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
import { ProgressPage } from "@/pages/ProgressPage";
import { Admin } from "@/pages/Admin";
import { QuestionBank } from "@/pages/QuestionBank";

function Login() {
  return <AuthPage mode="login" />;
}

function Register() {
  return <AuthPage mode="register" />;
}

// Maps each route id to its page component. Dashboard/Progress already
// self-gate behind LoginGate; Admin self-gates on `user.admin`.
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
  progress: ProgressPage,
  admin: Admin,
  bank: QuestionBank,
};
