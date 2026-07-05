import { AppProvider } from "@/context/AppProvider";
import { useApp } from "@/context/AppContext";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Toast } from "@/components/common";
import { PAGES } from "@/pages";

function AppShell() {
  const { route, c } = useApp();
  const Page = PAGES[route] || PAGES.home;
  return (
    <div className={`min-h-screen font-body antialiased transition-colors duration-300 ${c.bg} ${c.text}`}>
      <Nav />
      <div key={route}><Page /></div>
      <Footer />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
