import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, MessageCircle, FileCheck, Shield, Mic, Clock, ShieldAlert, UserCircle, LogIn, ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { type Language, translations, languageNames } from "@/lib/i18n";

const features = [
  { icon: MessageCircle, labelKey: "startChat" },
  { icon: FileCheck, labelKey: "documentChecker" },
  { icon: Shield, labelKey: "verifiedScheme" },
  { icon: Mic, labelKey: "voiceInput" },
  { icon: ShieldAlert, labelKey: "fraudAlert" },
];

const Index = () => {
  const [language, setLanguage] = useState<Language>("en");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();
  const t = translations[language];

  const availableLangs: Language[] = ["en", "hi", "kn", "mr", "ta", "te", "gu", "bn"];

  // clicking a feature pill navigates or triggers actions
  const handleFeatureClick = (labelKey: string) => {
    switch (labelKey) {
      case "startChat":
        navigate(`/chat?lang=${language}`);
        break;
      case "documentChecker":
        navigate(`/document-checker?lang=${language}`);
        break;
      case "verifiedScheme":
        navigate("/dashboard");
        break;
      case "voiceInput":
        navigate(`/chat?lang=${language}&voice=1`);
        break;
      case "fraudAlert":
        // no action for now, could show safety info
        break;
    }
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  // when user logs in, fetch profile and saved schemes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setSchemes([]);
      return;
    }
    const load = async () => {
      const [{ data: prof }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("saved_schemes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(prof || null);
      const { data: s } = await supabase.from("saved_schemes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setSchemes(s || []);
    };
    load();
  }, [user]);

  const deadlines = [
    { name: t.scholarship, deadline: t.scholarshipDeadline, urgent: false },
    { name: t.pmay, deadline: t.pmayDeadline, urgent: true },
    { name: t.vidyasiri, deadline: t.vidyasiriDeadline, urgent: false },
    { name: t.bhagyaLakshmi, deadline: t.bhagyaLakshmiDeadline, urgent: false },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="w-full px-4 py-3 flex items-center justify-between border-b border-border bg-background text-black">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center border border-black">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg text-black">{t.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-black border border-black shadow-sm flex items-center gap-1"
            >
              {language === "en" ? "English" : languageNames[language]}
              <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-md z-20">
                {availableLangs.map((langOpt) => (
                  <div
                    key={langOpt}
                    onClick={() => {
                      setLanguage(langOpt);
                      setShowLangMenu(false);
                    }}
                    className="px-3 py-1 text-xs hover:bg-primary/10 cursor-pointer"
                  >
                    {languageNames[langOpt]}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-black border-black bg-white hover:bg-black/10"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            {user ? <UserCircle className="w-4 h-4 mr-1" /> : <LogIn className="w-4 h-4 mr-1" />}
            {user ? "Dashboard" : "Login"}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 w-full text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          {profile && profile.full_name && (
            <p className="text-sm font-medium mt-2">Namaste, {profile.full_name}</p>
          )}

          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t.appName}</h1>
            <p className="text-lg text-secondary font-medium">{t.tagline}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
          </div>

          {schemes.length > 0 && (
            <div className="w-full mt-4 text-left">
              <h2 className="text-sm font-semibold text-foreground mb-2">Your saved schemes</h2>
              <div className="space-y-2">
                {schemes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{s.scheme_name}</p>
                    {s.scheme_url && (
                      <a href={s.scheme_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {features.map(({ icon: Icon, labelKey }) => (
              <div
                key={labelKey}
                onClick={() => handleFeatureClick(labelKey)}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-xs text-foreground cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-secondary" />
                <span>{t[labelKey]}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs mx-auto text-base font-semibold rounded-xl h-12 bg-primary hover:bg-primary/90"
            onClick={() => navigate(`/chat?lang=${language}`)}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            {t.startChat}
          </Button>

          {/* Deadline Alerts Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full bg-card border border-border rounded-xl p-4 text-left space-y-3"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-sm text-foreground">{t.deadlinesTitle}</h2>
            </div>
            <div className="space-y-2">
              {deadlines.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-xs ${
                    d.urgent
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-muted"
                  }`}
                >
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className={`shrink-0 ${d.urgent ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {d.deadline}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Safety tip */}
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl px-4 py-3">
            <p className="text-xs text-secondary font-medium">{t.safetyTip}</p>
          </div>

          <p className="text-xs text-muted-foreground">{t.poweredBy}</p>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
