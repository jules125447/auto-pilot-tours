import { Link } from "react-router-dom";
import { Car, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const Header = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">RoadTrip</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Explorer</Link>
          {user && <Link to="/my-circuits" className="hover:text-foreground transition-colors">Mes circuits</Link>}
          {user && <Link to="/creator" className="hover:text-foreground transition-colors">Créateur</Link>}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/my-circuits" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium">
                <User className="w-4 h-4" /> Mon profil
              </Link>
              <button onClick={signOut} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Connexion
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-card border-t border-border p-4 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2 text-foreground font-medium">Explorer</Link>
          {user && <Link to="/my-circuits" onClick={() => setMenuOpen(false)} className="block py-2 text-foreground font-medium">Mes circuits</Link>}
          {user && <Link to="/creator" onClick={() => setMenuOpen(false)} className="block py-2 text-foreground font-medium">Créateur</Link>}
          {user ? (
            <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-destructive font-medium">Déconnexion</button>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="block py-2 text-primary font-medium">Connexion</Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
