import { Link } from "react-router-dom";
import { Car, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const Header = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground tracking-tight">RoadTrip</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link to="/" className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Explorer</Link>
          {user && <Link to="/my-circuits" className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Mes circuits</Link>}
          {user && <Link to="/creator" className="px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Créateur</Link>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/my-circuits" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                <User className="w-4 h-4" /> Profil
              </Link>
              <button onClick={signOut} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
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
        <div className="md:hidden bg-card border-t border-border p-4 space-y-2">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted transition-colors">Explorer</Link>
          {user && <Link to="/my-circuits" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted transition-colors">Mes circuits</Link>}
          {user && <Link to="/creator" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 rounded-xl text-foreground font-medium hover:bg-muted transition-colors">Créateur</Link>}
          {user ? (
            <button onClick={() => { signOut(); setMenuOpen(false); }} className="block w-full text-left py-2.5 px-3 rounded-xl text-destructive font-medium hover:bg-destructive/10 transition-colors">Déconnexion</button>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="block py-2.5 px-3 rounded-xl text-primary font-semibold hover:bg-primary/10 transition-colors">Connexion</Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
