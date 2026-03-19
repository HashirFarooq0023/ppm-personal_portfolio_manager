import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, BrainCircuit, Target, PieChart, TrendingUp, Send, CheckCircle2, XCircle, X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
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
];

export const AIAnalystSheet = () => {
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [symbol, setSymbol] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
        <SheetContent className="[&>button.absolute]:hidden w-[100vw] h-[100dvh] max-w-[100vw] sm:w-[100vw] sm:max-w-[100vw] md:w-[100vw] md:max-w-[100vw] bg-background/95 bg-diagonal-pattern backdrop-blur-3xl border-none shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col p-0 !m-0 overflow-hidden fixed inset-y-0 right-0 z-50">

          {/* 1. Ambient Background Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Fixed Header */}
          <div className="p-6 pb-4 border-b border-white/5 bg-transparent relative z-50 shrink-0 flex items-center justify-between pointer-events-none">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -z-10"></div>
            <SheetTitle className="flex items-center text-emerald-400 text-2xl gap-2 font-light tracking-wide m-0 pointer-events-auto">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              AI Recommendation
            </SheetTitle>
            <SheetClose asChild className="pointer-events-auto z-50 relative">
              <Button variant="ghost" size="icon" className="group rounded-full bg-background/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 transition-all">
                <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                <span className="sr-only">Close Terminal</span>
              </Button>
            </SheetClose>
          </div>

          {/* Scrollable Chat Area with Bottom Fade Mask */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-6 hide-scroll relative z-10 [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]">

            {/* 2. Elevated Empty State */}
            {messages.length === 0 && !isAnalyzing && !error && (
              <div className="relative flex flex-col items-center justify-center h-full text-center space-y-5 mt-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <BrainCircuit className="w-16 h-16 text-emerald-400/80 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] relative z-10" />
                <p className="text-base text-slate-400 font-light tracking-wide relative z-10">
                  Type a question below to chat with your broker, or select an asset for a full analysis.
                </p>
              </div>
            )}

            {/* Chat Messages */}
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] text-sm leading-relaxed ${msg.role === 'user'
                      ? 'px-4 py-2.5 rounded-3xl rounded-br-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-50 backdrop-blur-md shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                      : 'p-3.5 sm:p-4 rounded-2xl rounded-bl-sm bg-emerald-950/30 backdrop-blur-2xl border border-emerald-500/20 text-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.2)]'
                      }`}
                  >
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" /> AI
                      </div>
                    )}

                    {msg.role === 'ai' ? (
                      <div className="text-[13px] sm:text-sm text-slate-300 leading-relaxed font-sans [&>p]:mb-5 [&>ul]:mb-5 [&>ul]:space-y-3 [&>ul]:list-none [&>ol]:mb-5 [&>ol]:space-y-3 [&>ol]:list-decimal [&>ol]:pl-5 [&_ul>li]:flex [&_ul>li]:items-start [&_ul>li]:gap-2.5 [&_ul>li::before]:content-['▹'] [&_ul>li::before]:text-emerald-500 [&_ul>li::before]:mt-[1px] [&_ul>li::before]:text-base [&_ol>li]:list-item [&_strong]:font-semibold [&_strong]:text-slate-100 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-50 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-50 [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-emerald-400 [&_h3]:uppercase [&_h3]:tracking-wider">
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
                <div className="bg-emerald-950/30 backdrop-blur-2xl border border-emerald-500/20 rounded-2xl rounded-bl-sm p-4 shadow-xl">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-wider font-bold">
                    <Sparkles className="w-3 h-3" /> AI
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Spacer to push last message above the fade mask */}
            <div className="h-12"></div>
          </div>

          {/* Fixed Input Area at Bottom */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 bg-black/40 backdrop-blur-xl shrink-0 relative z-20">
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">

              {/* 4. Polished Query Pills */}
              <div className="flex overflow-x-auto gap-2 pb-1 hide-scroll">
                {QUERY_TILES.map((tile, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(tile.query)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300 cursor-pointer group"
                  >
                    <tile.icon className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    {tile.label}
                  </button>
                ))}
              </div>

              {/* 3. "Frosted Glass" Input Container */}
              <div className="bg-black/20 backdrop-blur-2xl border-none rounded-3xl p-2 shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] focus-within:shadow-[0_8px_32px_0_rgba(16,185,129,0.2)] transition-all duration-500 flex flex-col gap-1 relative">

                {/* Subtle inner shine */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-3xl"></div>

                {/* Top Row: Symbol Context */}
                <div className="flex flex-wrap items-center gap-2 px-3 pt-2 relative z-10">

                  {/* 5. Popped Asset Badge / Input Hybrid */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)] relative w-[150px] focus-within:bg-emerald-500/20 transition-colors">
                    <span className="opacity-70 text-[10px] tracking-wider pointer-events-none">ASSET</span>
                    <input
                      type="text"
                      placeholder="(SYS)"
                      value={symbol}
                      onChange={(e) => {
                        setSymbol(e.target.value.toUpperCase());
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="bg-transparent border-none outline-none h-5 p-0 pl-1 pr-6 text-xs font-bold font-mono text-emerald-300 placeholder:text-emerald-500/40 focus:outline-none focus:ring-0 uppercase w-full shadow-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-transparent">
                      {symbol && (
                        isValidSymbol ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 animate-in zoom-in" />
                        )
                      )}
                    </div>
                    
                    {/* Symbol Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-[100] left-0 bottom-full mb-2 w-[250px] bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] max-h-[300px] overflow-y-auto hide-scroll"
                        >
                          <div className="py-1">
                            {suggestions.map((s) => (
                              <button
                                key={s.symbol}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSymbol(s.symbol);
                                  setShowSuggestions(false);
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-emerald-500/15 transition-colors flex items-center gap-3 group border-b border-white/5 last:border-0"
                              >
                                <div className="w-5 h-5 rounded-md border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 transition-all shrink-0">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex flex-col flex-1 overflow-hidden">
                                  <span className="text-xs font-bold font-mono text-emerald-100 group-hover:text-emerald-300 transition-colors">{s.symbol}</span>
                                  <span className="text-[10px] text-slate-400 uppercase truncate leading-tight">
                                    {s.name}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {symbol && !isValidSymbol && !isFetchingMarket && (
                    <span className="text-[10px] text-rose-400/80 font-medium px-2">Not in PSX Watchlist</span>
                  )}

                  {/* User Context Badge */}
                  {selectedHolding && currentMarketPrice > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-300">
                      <PieChart className="w-3 h-3 text-slate-400" />
                      <span>{selectedHolding.shares} @ {(selectedHolding.average_buy_price || 0).toFixed(0)}</span>
                      <span className={`font-bold ${(selectedHolding.profit_loss_percent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ({(selectedHolding.profit_loss_percent || 0) >= 0 ? '+' : ''}{(selectedHolding.profit_loss_percent || 0).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

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
                    className="bg-transparent border-none outline-none ring-0 text-slate-200 focus:outline-none focus:ring-0 placeholder:text-slate-500/70 text-sm h-12 w-full px-3 shadow-none"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all data-[disabled]:opacity-50 border border-emerald-500/50"
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

              <p className="text-[10px] text-slate-500 text-center font-medium tracking-wide">
                Automated Terminal Output — Verify before trading
              </p>
            </div>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
};