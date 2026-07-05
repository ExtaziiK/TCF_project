import { useApp } from "@/context/AppContext";
import { AuthPage } from "@/components/auth/AuthPage";

export function LoginGate({ children }) {
  const { user } = useApp();
  if (!user) return <AuthPage mode="login" />;
  return children;
}
