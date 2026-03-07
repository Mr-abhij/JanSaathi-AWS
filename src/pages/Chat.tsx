import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, FileCheck, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Language, translations } from "@/lib/i18n";
import { type ChatMessage, streamChat } from "@/lib/chat-stream";
import ReactMarkdown from "react-markdown";
import DocumentChecker from "@/components/DocumentChecker";

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse-dot"
        style={{ animationDelay: `${i * 0.16}s` }}
      />
    ))}
  </div>
);

const speechLangMap: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  gu: "gu-IN",
  bn: "bn-IN",
};

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lang = (searchParams.get("lang") || "en") as Language;
  const t = translations[lang];

  // if ?voice=1 is present we should start listening as soon as greeting finishes
  const shouldAutoVoice = searchParams.get("voice") === "1";


  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDocChecker, setShowDocChecker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-greet on mount and optionally start voice input
  useEffect(() => {
    sendMessage("", true).then(() => {
      if (shouldAutoVoice) {
        toggleVoiceInput();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice input using Web Speech API
  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLangMap[lang];
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang]);

  // Text-to-speech for assistant messages
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Strip markdown formatting
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/🔗.*?\n/g, "")
      .replace(/---/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[🚨✅📅📞🛡️⏰]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = speechLangMap[lang];
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const sendMessage = async (userInput: string, isGreeting = false) => {
    const newMessages: ChatMessage[] = isGreeting
      ? []
      : [...messages, { role: "user" as const, content: userInput }];

    if (!isGreeting) {
      setMessages(newMessages);
      setInput("");
    }
    setIsLoading(true);

    let assistantText = "";
    const upsert = (chunk: string) => {
      assistantText += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantText } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    await streamChat({
      messages: isGreeting
        ? [{ role: "user", content: `[SYSTEM: Greet the user in ${lang === "hi" ? "Hindi" : lang === "kn" ? "Kannada" : "English"}. Introduce yourself and ask their age to begin.]` }]
        : newMessages,
      language: lang,
      onDelta: upsert,
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${err}` },
        ]);
        setIsLoading(false);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  };

  if (showDocChecker) {
    return <DocumentChecker lang={lang} onBack={() => setShowDocChecker(false)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary text-primary-foreground shrink-0">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-primary-foreground text-sm">{t.appName}</h1>
          <p className="text-xs text-primary-foreground">{t.tagline}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setShowDocChecker(true)}
        >
          <FileCheck className="w-4 h-4 mr-1" />
          {t.documentChecker}
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="space-y-1">
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:mb-1 [&_p]:mt-0">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            {children}
                          </a>
                        ),
                      }}
                    >{msg.content}</ReactMarkdown>
                  </div>
                  {/* TTS button for assistant messages */}
                  {!isLoading && msg.content.length > 10 && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {t.speakResponse}
                    </button>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Safety tip bar */}
      <div className="shrink-0 bg-secondary/10 border-t border-secondary/20 px-4 py-1.5 text-center">
        <p className="text-xs text-secondary font-medium">{t.safetyTip}</p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {/* Voice input button */}
          <Button
            type="button"
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            className="rounded-xl shrink-0"
            onClick={toggleVoiceInput}
            disabled={isLoading}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? t.voiceListening : t.typeMessage}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
