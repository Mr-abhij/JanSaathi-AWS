import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, MessageCircle, FileText, LogOut, User, Clock, Trash2, Upload, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NotificationCenter from "@/components/NotificationCenter";

interface Profile {
  full_name: string | null;
  age: number | null;
  state: string | null;
  occupation: string | null;
  annual_income: number | null;
  category: string | null;
  gender: string | null;
}

interface SavedScheme {
  id: string;
  scheme_name: string;
  scheme_url: string | null;
  deadline: string | null;
  created_at: string;
}

interface UserDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  verified: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [schemes, setSchemes] = useState<SavedScheme[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Profile>({
    full_name: null, age: null, state: null, occupation: null,
    annual_income: null, category: null, gender: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const [profileRes, schemesRes, docsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("saved_schemes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setEditForm(profileRes.data);
    }
    setSchemes(schemesRes.data || []);
    setDocuments(docsRes.data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // use upsert so new users get a row and existing ones are updated
    const profileData = {
      id: user.id,
      full_name: editForm.full_name,
      age: editForm.age,
      state: editForm.state,
      occupation: editForm.occupation,
      annual_income: editForm.annual_income,
      category: editForm.category,
      gender: editForm.gender,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
    setProfile(editForm);
    setEditing(false);
    toast({ title: "Profile updated!" });
    
    // Auto-trigger scheme matching after profile update
    try {
      await supabase.functions.invoke("match-schemes");
      toast({ title: "🔔 Checking for matching schemes...", description: "Check your notifications for personalized alerts!" });
    } catch (err) {
      console.error("Scheme match trigger failed:", err);
    }

    // redirect to home so user sees their name and schemes immediately
    navigate("/");
  };

  const deleteScheme = async (id: string) => {
    await supabase.from("saved_schemes").delete().eq("id", id);
    setSchemes((prev) => prev.filter((s) => s.id !== id));
  };

  const uploadDocument = async (file: File, docType: string) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }

    await supabase.from("user_documents").insert({
      user_id: user.id,
      document_type: docType,
      file_name: file.name,
      file_path: filePath,
    });

    await loadData();
    setUploading(false);
    toast({ title: "Document uploaded!" });
  };

  const deleteDocument = async (doc: UserDocument) => {
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("user_documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between border-b border-border bg-background text-black">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-black">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-black">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-black border-black bg-white hover:bg-black/10" onClick={() => navigate("/")}>Home</Button>
          <NotificationCenter />
          <Button variant="outline" size="sm" className="text-black border-black bg-white hover:bg-black/10" onClick={() => navigate("/chat?lang=en")">
            <MessageCircle className="w-4 h-4 mr-1" /> Chat
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> My Profile
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => editing ? saveProfile() : setEditing(true)}>
                {editing ? "Save" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "full_name", label: "Full Name", type: "text" },
                  { key: "age", label: "Age", type: "number" },
                  { key: "state", label: "State", type: "text" },
                  { key: "occupation", label: "Occupation", type: "text" },
                  { key: "annual_income", label: "Annual Income (₹)", type: "number" },
                  { key: "category", label: "Category", type: "text" },
                  { key: "gender", label: "Gender", type: "text" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <input
                      type={type}
                      value={(editForm as any)[key] ?? ""}
                      onChange={(e) => setEditForm((prev) => ({
                        ...prev,
                        [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value,
                      }))}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Name</p><p className="font-medium text-foreground">{profile?.full_name || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Age</p><p className="font-medium text-foreground">{profile?.age || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">State</p><p className="font-medium text-foreground">{profile?.state || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Occupation</p><p className="font-medium text-foreground">{profile?.occupation || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Income</p><p className="font-medium text-foreground">{profile?.annual_income ? `₹${profile.annual_income.toLocaleString()}` : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Category</p><p className="font-medium text-foreground">{profile?.category || "—"}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Schemes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" /> Saved Schemes & Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {schemes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved schemes yet. Chat with AI to discover schemes!</p>
            ) : (
              schemes.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.scheme_name}</p>
                    {s.deadline && <p className="text-xs text-muted-foreground">📅 {s.deadline}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.scheme_url && (
                      <a href={s.scheme_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteScheme(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* My Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" /> My Documents
              </CardTitle>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                    Upload
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const docType = prompt("Document type (e.g., Aadhaar, Income Certificate, Caste Certificate):");
                      if (docType) uploadDocument(file, docType);
                    }
                  }}
                />
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{d.document_type}</p>
                      <Badge variant={d.verified ? "default" : "secondary"} className={d.verified ? "bg-success text-success-foreground text-[10px]" : "text-[10px]"}>
                        {d.verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.file_name}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDocument(d)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* URL Checker */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" /> Fraud / Scam URL Checker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <URLChecker />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const TRUSTED_DOMAINS = [
  ".gov.in", ".nic.in", ".india.gov.in", "pmkisan.gov.in", "pmaymis.gov.in",
  "scholarships.gov.in", "pmjay.gov.in", "nrega.nic.in", "nfsa.gov.in",
  "mudra.org.in", "standupmitra.in", "pmvishwakarma.gov.in", "pmujjwalayojana.com",
];

const URLChecker = () => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ safe: boolean; message: string } | null>(null);

  const checkUrl = () => {
    if (!url.trim()) return;
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const hostname = parsed.hostname.toLowerCase();
      const isSafe = TRUSTED_DOMAINS.some((d) => hostname.endsWith(d));
      setResult({
        safe: isSafe,
        message: isSafe
          ? `✅ This appears to be an official government portal (${hostname}). It's safe to proceed.`
          : `🚨 WARNING: "${hostname}" is NOT a recognized government domain. Official schemes use .gov.in or .nic.in domains. Do NOT share personal information or pay any fees on this website. Report fraud: 1800-111-555`,
      });
    } catch {
      setResult({ safe: false, message: "🚨 Invalid URL. Please enter a valid website address." });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Paste any scheme URL to verify if it's a legitimate government portal or a potential scam.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL here (e.g., pmkisan.gov.in)"
          className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === "Enter" && checkUrl()}
        />
        <Button size="sm" onClick={checkUrl}>Check</Button>
      </div>
      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.safe ? "bg-success/10 border border-success/20 text-foreground" : "bg-destructive/10 border border-destructive/20 text-foreground"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
