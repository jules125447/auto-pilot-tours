import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Activity, Users, Car, MapPin, Headphones, DollarSign, TrendingUp,
  Loader2, ArrowLeft, Calendar, Clock, Award
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { motion } from "framer-motion";
import GpsHeatmap from "@/components/admin/GpsHeatmap";

type Period = 7 | 30 | 90 | 365;

const COLORS = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#92400e", "#b45309"];

function fmtDuration(s: number) {
  if (!s) return "0min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/admin");
      return;
    }
    if (!isAdmin) return;
    loadStats();
  }, [user, isAdmin, loading, period]);

  async function loadStats() {
    setLoadingData(true);
    const since = new Date(Date.now() - period * 86400000).toISOString();

    const [
      sessionsRes, gpsRes, stopsRes, audioRes, purchasesRes, circuitsRes, usersRes
    ] = await Promise.all([
      supabase.from("navigation_sessions").select("*").gte("started_at", since),
      supabase.from("gps_pings").select("lat,lng,speed_kmh,circuit_id,recorded_at").gte("recorded_at", since).limit(5000),
      supabase.from("stop_visits").select("*").gte("visited_at", since),
      supabase.from("audio_plays").select("*").gte("played_at", since),
      supabase.from("purchases").select("*").gte("purchased_at", since),
      supabase.from("circuits").select("id,title,price"),
      supabase.from("profiles").select("user_id,created_at").gte("created_at", since),
    ]);

    const sessions = sessionsRes.data || [];
    const pings = gpsRes.data || [];
    const stops = stopsRes.data || [];
    const audios = audioRes.data || [];
    const purchases = purchasesRes.data || [];
    const circuits = circuitsRes.data || [];
    const newUsers = usersRes.data || [];

    const circuitMap = new Map(circuits.map((c: any) => [c.id, c]));

    // KPIs
    const completedSessions = sessions.filter((s: any) => s.completed).length;
    const totalSessions = sessions.length;
    const completionRate = totalSessions ? (completedSessions / totalSessions) * 100 : 0;
    const totalRevenue = purchases.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const avgDuration = totalSessions
      ? sessions.reduce((s: number, x: any) => s + (x.duration_s || 0), 0) / totalSessions
      : 0;
    const avgDistance = totalSessions
      ? sessions.reduce((s: number, x: any) => s + (x.distance_m || 0), 0) / totalSessions / 1000
      : 0;

    // Sessions per day
    const sessionsByDay = new Map<string, number>();
    sessions.forEach((s: any) => {
      const d = new Date(s.started_at).toISOString().slice(0, 10);
      sessionsByDay.set(d, (sessionsByDay.get(d) || 0) + 1);
    });
    const sessionTrend = Array.from(sessionsByDay.entries())
      .sort()
      .map(([date, count]) => ({ date: date.slice(5), sessions: count }));

    // Hours of usage
    const hourCounts = new Array(24).fill(0);
    sessions.forEach((s: any) => {
      hourCounts[new Date(s.started_at).getHours()]++;
    });
    const hourly = hourCounts.map((c, i) => ({ hour: `${i}h`, sessions: c }));

    // Top circuits
    const circuitUsage = new Map<string, number>();
    sessions.forEach((s: any) => {
      circuitUsage.set(s.circuit_id, (circuitUsage.get(s.circuit_id) || 0) + 1);
    });
    const topCircuits = Array.from(circuitUsage.entries())
      .map(([id, count]) => ({
        name: (circuitMap.get(id) as any)?.title || "Inconnu",
        sessions: count,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);

    // Revenue per circuit
    const revPerCircuit = new Map<string, number>();
    purchases.forEach((p: any) => {
      revPerCircuit.set(p.circuit_id, (revPerCircuit.get(p.circuit_id) || 0) + Number(p.amount));
    });
    const topRevenue = Array.from(revPerCircuit.entries())
      .map(([id, rev]) => ({ name: (circuitMap.get(id) as any)?.title || "Inconnu", revenue: rev }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Revenue by day
    const revByDay = new Map<string, number>();
    purchases.forEach((p: any) => {
      const d = new Date(p.purchased_at).toISOString().slice(0, 10);
      revByDay.set(d, (revByDay.get(d) || 0) + Number(p.amount));
    });
    const revenueTrend = Array.from(revByDay.entries())
      .sort()
      .map(([date, revenue]) => ({ date: date.slice(5), revenue: Number(revenue.toFixed(2)) }));

    // Audio engagement
    const audioCompletion = audios.length
      ? (audios.filter((a: any) => a.completed).length / audios.length) * 100
      : 0;
    const avgAudioListen = audios.length
      ? audios.reduce((s: number, a: any) => s + (a.played_seconds || 0), 0) / audios.length
      : 0;
    const topAudios = (() => {
      const m = new Map<string, { plays: number; sec: number }>();
      audios.forEach((a: any) => {
        const cur = m.get(a.audio_zone_id) || { plays: 0, sec: 0 };
        cur.plays++;
        cur.sec += a.played_seconds || 0;
        m.set(a.audio_zone_id, cur);
      });
      return Array.from(m.entries())
        .map(([id, v]) => ({ name: id.slice(0, 8), plays: v.plays, listen: Math.round(v.sec / Math.max(v.plays, 1)) }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 6);
    })();

    // Top stops
    const stopMap = new Map<string, { visits: number; dwell: number }>();
    stops.forEach((s: any) => {
      const cur = stopMap.get(s.stop_id) || { visits: 0, dwell: 0 };
      cur.visits++;
      cur.dwell += s.dwell_seconds || 0;
      stopMap.set(s.stop_id, cur);
    });
    const topStops = Array.from(stopMap.entries())
      .map(([id, v]) => ({ name: id.slice(0, 8), visits: v.visits, dwell: Math.round(v.dwell / Math.max(v.visits, 1)) }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8);

    // Conversion (sessions vs purchases)
    const conversionRate = totalSessions ? (purchases.length / totalSessions) * 100 : 0;

    setStats({
      kpi: {
        totalSessions,
        completedSessions,
        completionRate,
        totalRevenue,
        avgDuration,
        avgDistance,
        newUsers: newUsers.length,
        purchases: purchases.length,
        conversionRate,
        avgRevenuePerUser: newUsers.length ? totalRevenue / newUsers.length : 0,
        topCircuit: topCircuits[0]?.name || "—",
      },
      sessionTrend,
      hourly,
      topCircuits,
      topRevenue,
      revenueTrend,
      audio: { audioCompletion, avgAudioListen, topAudios, totalPlays: audios.length },
      topStops,
      pings,
      sessions,
      purchases,
    });
    setLoadingData(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold">Accès restreint</h1>
          <p className="text-muted-foreground">
            Cette zone est réservée aux administrateurs. Connecté en tant que <strong>{user.email}</strong>.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Retour</Button>
            <Button variant="ghost" onClick={() => signOut().then(() => navigate("/auth?redirect=/admin"))}>
              Changer de compte
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-lg hover:bg-muted transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Admin Analytics
              </h1>
              <p className="text-xs text-muted-foreground">Connecté : {user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {([7, 30, 90, 365] as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {p === 365 ? "1 an" : `${p}j`}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {loadingData || !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="trips">Trajets</TabsTrigger>
              <TabsTrigger value="gps">GPS & Heatmap</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi icon={Users} label="Nouveaux utilisateurs" value={stats.kpi.newUsers} accent="from-primary/20 to-transparent" />
                <Kpi icon={Car} label="Sessions" value={stats.kpi.totalSessions} sub={`${stats.kpi.completedSessions} terminées`} />
                <Kpi icon={Activity} label="Taux complétion" value={`${stats.kpi.completionRate.toFixed(1)}%`} />
                <Kpi icon={DollarSign} label="Revenus" value={`${stats.kpi.totalRevenue.toFixed(2)} €`} sub={`${stats.kpi.purchases} achats`} />
                <Kpi icon={Clock} label="Durée moyenne" value={fmtDuration(stats.kpi.avgDuration)} />
                <Kpi icon={MapPin} label="Distance moyenne" value={`${stats.kpi.avgDistance.toFixed(1)} km`} />
                <Kpi icon={TrendingUp} label="Conversion" value={`${stats.kpi.conversionRate.toFixed(1)}%`} />
                <Kpi icon={Award} label="Circuit top" value={stats.kpi.topCircuit} small />
              </div>

              <Card className="p-6">
                <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Sessions sur {period} jours
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={stats.sessionTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" stroke="currentColor" opacity={0.5} />
                    <YAxis stroke="currentColor" opacity={0.5} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="sessions" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* TRIPS */}
            <TabsContent value="trips" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="font-display text-lg font-bold mb-4">Circuits les plus empruntés</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.topCircuits} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" stroke="currentColor" opacity={0.5} />
                      <YAxis dataKey="name" type="category" width={120} stroke="currentColor" opacity={0.6} fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="sessions" fill="#f97316" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h2 className="font-display text-lg font-bold mb-4">Horaires d'utilisation</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.hourly}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="hour" stroke="currentColor" opacity={0.5} fontSize={10} />
                      <YAxis stroke="currentColor" opacity={0.5} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="sessions" fill="#fb923c" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-6">
                <h2 className="font-display text-lg font-bold mb-4">Stops les plus visités</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.topStops.map((s: any) => (
                    <div key={s.name} className="p-4 rounded-xl bg-muted/40 border border-border/50">
                      <div className="text-xs text-muted-foreground font-mono">{s.name}…</div>
                      <div className="text-2xl font-bold mt-1">{s.visits}</div>
                      <div className="text-xs text-muted-foreground">visites · {s.dwell}s moy.</div>
                    </div>
                  ))}
                  {stats.topStops.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">Aucune visite enregistrée.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* GPS */}
            <TabsContent value="gps" className="space-y-6">
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Heatmap de fréquentation GPS
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.pings.length.toLocaleString()} positions enregistrées sur la période.
                </p>
                <GpsHeatmap pings={stats.pings} />
              </Card>
            </TabsContent>

            {/* AUDIO */}
            <TabsContent value="audio" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi icon={Headphones} label="Lectures totales" value={stats.audio.totalPlays} />
                <Kpi icon={Activity} label="Taux complétion" value={`${stats.audio.audioCompletion.toFixed(1)}%`} />
                <Kpi icon={Clock} label="Écoute moyenne" value={`${Math.round(stats.audio.avgAudioListen)}s`} />
                <Kpi icon={TrendingUp} label="Audios uniques" value={stats.audio.topAudios.length} />
              </div>
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold mb-4">Audios les plus écoutés</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.audio.topAudios}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" stroke="currentColor" opacity={0.5} fontSize={10} />
                    <YAxis stroke="currentColor" opacity={0.5} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="plays" fill="#f97316" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="listen" fill="#92400e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* BUSINESS */}
            <TabsContent value="business" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi icon={DollarSign} label="Revenu total" value={`${stats.kpi.totalRevenue.toFixed(2)} €`} />
                <Kpi icon={TrendingUp} label="Achats" value={stats.kpi.purchases} />
                <Kpi icon={Activity} label="Conversion" value={`${stats.kpi.conversionRate.toFixed(1)}%`} />
                <Kpi icon={Users} label="ARPU" value={`${stats.kpi.avgRevenuePerUser.toFixed(2)} €`} />
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="font-display text-lg font-bold mb-4">Revenus par jour</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={stats.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" stroke="currentColor" opacity={0.5} />
                      <YAxis stroke="currentColor" opacity={0.5} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-6">
                  <h2 className="font-display text-lg font-bold mb-4">Circuits les plus rentables</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={stats.topRevenue} dataKey="revenue" nameKey="name" outerRadius={100} label={(e: any) => `${e.revenue.toFixed(0)}€`}>
                        {stats.topRevenue.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, sub, small, accent
}: { icon: any; label: string; value: any; sub?: string; small?: boolean; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-5 relative overflow-hidden bg-gradient-to-br ${accent || "from-card to-card"}`}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
          <Icon className="w-4 h-4 text-primary/60" />
        </div>
        <div className={`font-bold ${small ? "text-base truncate" : "text-2xl"}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </Card>
    </motion.div>
  );
}
