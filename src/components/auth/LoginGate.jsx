import { useApp } from "@/context/AppContext";
import { AuthPage } from "@/components/auth/AuthPage";

export function LoginGate({ children }) {
  const { user, authReady } = useApp();
  if (!authReady) return null;
  if (!user) return <AuthPage mode="login" />;
  return children;
}
