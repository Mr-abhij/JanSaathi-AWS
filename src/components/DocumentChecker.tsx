import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Language, translations } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface DocResult {
  documentType: string;
  name: string;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  isValid: boolean;
  warnings: string[];
  fields: Record<string, string>;
}

const DocumentChecker = ({ lang: propLang, onBack }: { lang?: Language; onBack: () => void }) => {
  const [searchParams] = useSearchParams();
  const lang = propLang ?? ((searchParams.get("lang") || "en") as Language);
  const t = translations[lang];
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DocResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setResult(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);

      try {
        const { data, error } = await supabase.functions.invoke("document-ocr", {
          body: { image: base64, mimeType: file.type, language: lang },
        });

        if (error) throw error;
        setResult(data);
      } catch (err) {
        console.error(err);
        setResult({
          documentType: "Unknown",
          name: "—",
          documentNumber: "—",
          isValid: false,
          warnings: ["Could not process this document. Please try a clearer image."],
          fields: {},
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground text-sm">{t.documentChecker}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">{t.uploadDocument}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.uploadHint}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </div>

        {/* Preview */}
        {preview && (
          <img src={preview} alt="Document preview" className="rounded-xl border border-border max-h-48 mx-auto" />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t.checking}</span>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {result.documentType}
                </CardTitle>
                <Badge variant={result.isValid ? "default" : "destructive"} className={result.isValid ? "bg-success text-success-foreground" : ""}>
                  {result.isValid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {result.isValid ? "Valid" : "Issues Found"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium text-foreground">{result.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Document No.</p>
                  <p className="font-medium text-foreground">{result.documentNumber}</p>
                </div>
                {result.issueDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Issue Date</p>
                    <p className="font-medium text-foreground">{result.issueDate}</p>
                  </div>
                )}
                {result.expiryDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Expiry Date</p>
                    <p className="font-medium text-foreground">{result.expiryDate}</p>
                  </div>
                )}
                {Object.entries(result.fields || {}).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-muted-foreground text-xs">{key}</p>
                    <p className="font-medium text-foreground">{typeof val === "object" ? JSON.stringify(val) : String(val ?? "—")}</p>
                  </div>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-2 pt-2">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <span className="text-foreground">{typeof w === "object" ? JSON.stringify(w) : String(w)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DocumentChecker;
