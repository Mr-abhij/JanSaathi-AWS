import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, MessageCircle, FileCheck, Shield, Mic, Clock, ShieldAlert, UserCircle, LogIn } from "lucide-react";
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
  const navigate = useNavigate();
  const t = translations[language];

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  const deadlines = [
    { name: t.scholarship, deadline: t.scholarshipDeadline, urgent: false },
    { name: t.pmay, deadline: t.pmayDeadline, urgent: true },
    { name: t.vidyasiri, deadline: t.vidyasiriDeadline, urgent: false },
    { name: t.bhagyaLakshmi, deadline: t.bhagyaLakshmiDeadline, urgent: false },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="w-full px-4 py-3 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">{t.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
            {(["en", "hi", "kn"] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  language === lang
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {languageNames[lang]}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
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

          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t.appName}</h1>
            <p className="text-lg text-secondary font-medium">{t.tagline}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.subtitle}</p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {features.map(({ icon: Icon, labelKey }) => (
              <div
                key={labelKey}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-xs text-foreground"
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
