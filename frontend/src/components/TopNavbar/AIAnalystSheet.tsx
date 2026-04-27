import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Sparkles, Loader2, BrainCircuit, Target, PieChart, TrendingUp, Send, CheckCircle2, XCircle, X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/useTheme";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { TOP_PSX_SYMBOLS } from "@/data/mockData";

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

const QUERY_TILES = [
  { icon: TrendingUp, label: "Trend & Repute", query: "Analyze the current trend and general market repute for this stock." },
  { icon: BrainCircuit, label: "Projects & Goals", query: "List the current running projects and future goals. Include reference links." },
  { icon: Target, label: "Risk Strategy", query: "What is the main risk involved with this stock right now, and what is the ideal entry strategy?" },
  { icon: PieChart, label: "Sector Health", query: "How is the overall sector performing relative to this specific symbol?" },
];


export const AIAnalystSheet = () => {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [symbol, setSymbol] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-Context: Pre-populate symbol from URL if in Terminal/Detail view
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts.includes('terminal') || pathParts.includes('dashboard')) {
      const lastPart = pathParts[pathParts.length - 1];
      // Basic check if the last part looks like a symbol (uppercase, 2-5 chars)
      if (lastPart && lastPart === lastPart.toUpperCase() && lastPart.length >= 2 && lastPart.length <= 10) {
        setSymbol(lastPart);
      }
    }
  }, [location, isOpen]);


  const suggestions = useMemo(() => {
    if (!symbol) return TOP_PSX_SYMBOLS.slice(0, 50);
    return TOP_PSX_SYMBOLS.filter(s =>
      s.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
      s.name.toLowerCase().includes(symbol.toLowerCase())
    ).slice(0, 50);
  }, [symbol]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch available symbols from market watch
  const { data: marketData, isFetching: isFetchingMarket } = useQuery({
    queryKey: ["marketWatchSymbols"],
    queryFn: async () => {
      const res = await fetch("/api/market/watch");
      if (!res.ok) throw new Error("Failed to fetch symbols");
      return res.json() as Promise<{ symbol: string; current_price: number }[]>;
    },
  });

  // Fetch the user's portfolio to drive the Context Panel
  const { data: portfolioData } = useQuery({
    queryKey: ["portfolioData"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch("/api/portfolio", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!isOpen,
  });

  const selectedHolding = useMemo(() => {
    if (!symbol || !portfolioData?.items) return null;
    return portfolioData.items.find((item: any) => item.symbol === symbol) || null;
  }, [symbol, portfolioData]);

  const currentMarketPrice = useMemo(() => {
    if (!symbol || !marketData) return 0;
    const item = marketData.find(m => m.symbol === symbol);
    return item ? (item.current_price || 0) : 0;
  }, [symbol, marketData]);

  const isValidSymbol = useMemo(() => {
    if (!symbol || !marketData) return false;
    return marketData.some(m => m.symbol === symbol);
  }, [symbol, marketData]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isAnalyzing, error]);

  const handleAnalyze = async () => {
    if (!question.trim()) return;

    const userMessage = question;

    const history = messages.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content
    }));

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuestion("");
    setIsAnalyzing(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol || null,
          question: userMessage,
          history: history
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response_text }]);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };


  const isSubmitDisabled = !question.trim() || isAnalyzing;

  return (
    <>
      {/* Global style to hide scrollbar but keep functionality */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all font-medium px-2.5 sm:px-4"
          >
            <Sparkles className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">AI Recommendation</span>
          </Button>
        </SheetTrigger>

        {/* Added [&>button.absolute]:hidden to remove Shadcn's default close icon */}
        <SheetContent className="[&>button.absolute]:hidden w-[100vw] h-[100dvh] max-w-[100vw] sm:w-[100vw] sm:max-w-[100vw] md:w-[100vw] md:max-w-[100vw] bg-background dark:bg-background/95 dark:bg-diagonal-pattern backdrop-blur-3xl border-none shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col p-0 !m-0 overflow-hidden fixed inset-y-0 right-0 z-50">

          {/* 1. Ambient Background Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Fixed Header */}
          <div className="p-4 sm:p-6 pb-2 sm:pb-4 bg-background/80 backdrop-blur-xl relative z-50 shrink-0 pointer-events-none">
            <div className="max-w-[95%] mx-auto flex items-center justify-between w-full">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -z-10"></div>
              <SheetTitle className="flex items-center text-emerald-700 dark:text-emerald-400 text-lg sm:text-2xl gap-2 font-light tracking-wide m-0 pointer-events-auto">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-pulse" />
                AI Recommendation
              </SheetTitle>
              <SheetDescription className="sr-only">
                AI Broker Interface for PSX Stock Analysis and Recommendation.
              </SheetDescription>
              <SheetClose asChild className="pointer-events-auto z-50 relative">
                <Button variant="ghost" size="icon" className="group rounded-full bg-background/50 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-border/50 hover:border-rose-500/30 transition-all">
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  <span className="sr-only">Close Terminal</span>
                </Button>
              </SheetClose>
            </div>
          </div>


          {/* Scrollable Chat Area with Bottom Fade Mask */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-[95%] mx-auto space-y-6 hide-scroll relative z-20 [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]">

            {/* 2. Elevated Empty State */}
            {messages.length === 0 && !isAnalyzing && !error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center justify-center h-full text-center space-y-6 mt-16"
              >
                <div className="relative">
                  {/* Neural Pulse Background */}
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"
                  />
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-psx-green/5 rounded-full blur-3xl pointer-events-none -z-10" />
                  
                  <motion.div
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BrainCircuit className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] relative z-10" />
                  </motion.div>
                </div>
                
                <div className="max-w-md space-y-3">
                  <p className="text-lg sm:text-xl text-foreground font-black tracking-tight relative z-10">
                    Your Personal AI Broker
                  </p>
                  <p className="text-sm text-foreground/80 font-medium leading-relaxed relative z-10">
                    Type a question below to chat with your broker, or select a PSX asset (e.g., HUBC) for a deep dive analysis.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Chat Messages */}
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`inline-flex flex-col w-fit max-w-[95%] sm:max-w-[90%] text-sm leading-relaxed break-words overflow-wrap-anywhere ${msg.role === 'user'
                      ? 'px-4 py-2.5 rounded-3xl rounded-br-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-50 backdrop-blur-md shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                      : 'p-3.5 sm:p-4 rounded-2xl rounded-bl-sm bg-secondary/30 dark:bg-emerald-950/30 backdrop-blur-2xl border border-emerald-500/20 text-foreground shadow-[0_8px_30px_rgb(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]'
                      }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" /> AI
                      </div>
                    )}

                    {msg.role === 'ai' ? (
                      <div className="text-[13px] sm:text-sm text-foreground/90 leading-relaxed font-sans [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ul:last-child]:mb-0 [&>ul]:space-y-2 [&>ul]:list-none [&>ol]:mb-3 [&>ol:last-child]:mb-0 [&>ol]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5 [&_ul>li]:relative [&_ul>li]:pl-5 [&_ul>li]:mb-2 [&_ul>li:last-child]:mb-0 [&_ul>li::before]:content-['▹'] [&_ul>li::before]:absolute [&_ul>li::before]:left-0 [&_ul>li::before]:top-0 [&_ul>li::before]:text-emerald-500 [&_ul>li::before]:text-sm [&_ol>li]:list-item [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-emerald-500 [&_h3]:uppercase [&_h3]:tracking-wider">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-loose">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error State */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="mt-0.5 font-bold">!</div>
                <p>{error}</p>
              </div>
            )}

            {/* Typing Indicator */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="w-fit inline-block bg-secondary/30 dark:bg-emerald-950/30 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl rounded-bl-sm p-4 shadow-xl max-w-[92%] sm:max-w-none">
                  <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 text-xs uppercase tracking-wider font-bold">
                    <Sparkles className="w-3 h-3" /> AI
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500 dark:text-emerald-400" />
                    <span>Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Spacer to push last message above the fade mask */}
            <div className="h-12"></div>
          </div>

          {/* Fixed Input Area at Bottom */}
          <div className="px-3 py-2 sm:px-6 sm:py-4 bg-background/80 dark:bg-black/40 backdrop-blur-xl shrink-0 relative z-30">
            <div className="w-full max-w-[95%] mx-auto flex flex-col gap-2 sm:gap-3">

              {/* 4. Polished Query Pills (Larger & More Prominent) */}
              <div className="flex overflow-x-auto gap-3 pb-1 hide-scroll">
                {QUERY_TILES.map((tile, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuestion(tile.query)}
                    className="shrink-0 flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-5 sm:py-3 rounded-2xl bg-muted/40 backdrop-blur-md border border-border/40 text-[10px] sm:text-sm font-bold text-emerald-800 dark:text-emerald-50 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 cursor-pointer group"
                  >
                    <tile.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 dark:text-emerald-500/70 group-hover:text-emerald-500 transition-colors" />
                    {tile.label}
                  </motion.button>
                ))}
              </div>

              {/* 3. "Frosted Glass" Input Container */}
              <div className="bg-secondary/40 dark:bg-black/20 backdrop-blur-2xl border border-border/10 rounded-3xl p-2 shadow-[0_8px_32px_0_rgba(16,185,129,0.05)] dark:shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] focus-within:shadow-[0_8px_32px_0_rgba(16,185,129,0.2)] transition-all duration-500 flex flex-col gap-1 relative">

                {/* Subtle inner shine */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-3xl"></div>



                {/* Bottom Row: Chat Prompt & Send */}
                <div className="flex gap-2 items-end px-1 pb-1 relative z-10">
                  <input
                    type="text"
                    placeholder="Chat with your broker about the market..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitDisabled) {
                        handleAnalyze();
                      }
                    }}
                    className="bg-transparent border-none outline-none ring-0 text-foreground font-semibold focus:outline-none focus:ring-0 placeholder:text-muted-foreground/90 text-sm h-10 sm:h-12 w-full px-3 shadow-none"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all data-[disabled]:opacity-50 border border-emerald-500/50"
                    onClick={handleAnalyze}
                    disabled={isSubmitDisabled}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 text-center font-medium tracking-wide">
                Automated Terminal Output — Verify before trading
              </p>
            </div>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
};