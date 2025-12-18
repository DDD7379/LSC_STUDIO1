import { RouterProvider, useRouter } from './context/RouterContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import About from './pages/About';
import Games from './pages/Games';
import StaffApplication from './pages/StaffApplication';
import Support from './pages/Support';
import Links from './pages/Links';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { isAdminAuthenticated } from './utils/storage';

function AppContent() {
  const { currentPage, navigateTo } = useRouter();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'about':
        return <About />;
      case 'games':
        return <Games />;
      case 'staff-application':
        return <StaffApplication />;
      case 'support':
        return <Support />;
      case 'links':
        return <Links />;
      case 'admin-login':
        return <AdminLogin />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home />;
    }
  };

  const isAdminPage = currentPage === 'admin-login' || currentPage === 'admin';

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {!isAdminPage && <Navigation />}

      <main className={`flex-1 ${isAdminPage ? '' : 'pt-16 sm:pt-16'}`}>
        {renderPage()}
      </main>

      {!isAdminPage && (
<footer className="bg-slate-950/80 backdrop-blur-sm border-t border-slate-800 py-8">
          <div className="container mx-auto px-4 text-center space-y-6">

            {/* ניווט מהיר */}
            <div className="flex flex-wrap justify-center gap-6 text-gray-400 text-sm">
              <button onClick={() => navigateTo('home')} className="hover:text-white transition">
                בית
              </button>
              <button onClick={() => navigateTo('games')} className="hover:text-white transition">
                משחקים
              </button>
              <button onClick={() => navigateTo('about')} className="hover:text-white transition">
                אודות
              </button>
              <button onClick={() => navigateTo('support')} className="hover:text-white transition">
                תמיכה
              </button>
              <button onClick={() => navigateTo('links')} className="hover:text-white transition">
                קישורים
              </button>
            </div>

            

            {/* זכויות */}
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} LSC_Studio. כל הזכויות שמורות
            </p>

            {/* כניסת מנהל */}
            {!isAdminAuthenticated() && (
              <button
                onClick={() => navigateTo('admin-login')}
                className="text-blue-500/40 hover:text-blue-400 text-xs transition"
              >
                מנהל
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

export default App;
