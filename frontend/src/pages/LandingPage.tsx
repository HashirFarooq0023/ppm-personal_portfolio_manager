import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Moving Grid */}
      <motion.div 
        animate={{ 
          backgroundPosition: ['0px 0px', '40px 40px'] 
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" 
      />

      {/* Animated Tracing Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
        <motion.div 
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-psx-green/50 to-transparent"
        />
        <motion.div 
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 4 }}
          className="absolute bottom-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5
            }}
            animate={{ 
              y: [null, "-=100"],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: Math.random() * 10 + 10, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10
            }}
          />
        ))}
      </div>

      {/* Animated Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
          opacity: [0.03, 0.06, 0.03]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
          y: [0, -30, 0],
          opacity: [0.03, 0.05, 0.03]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-psx-green/5 rounded-full blur-[120px] -z-10 pointer-events-none" 
      />

      {/* Neural Pulse Effect */}
      <motion.div 
        animate={{ opacity: [0, 0.08, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary/5 pointer-events-none"
      />

      {/* AI Data Streams (Fast horizontal lines) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`stream-${i}`}
            className="absolute h-[1px] w-48 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            style={{ top: `${15 + i * 15}%`, left: '-10%' }}
            animate={{ x: ['0vw', '110vw'] }}
            transition={{ 
              duration: 2.5 + Math.random() * 1.5, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 1.2
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-8 relative z-50"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-accent/30 text-label text-muted-foreground mb-4">
          <Zap className="w-3.5 h-3.5 text-psx-green" />
          <span>Real-time PSX Intelligence</span>
        </div>

        <h1 className="text-display font-bold tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
          Personal Portfolio <br /> Manager <span className="text-primary font-mono italic">AI BASED</span>
        </h1>
        
        <p className="text-subheader text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Track your Pakistan Stock Exchange holdings with surgical precision. 
          Real-time prices, advanced analytics, and premium Glassmorphism design.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <SignInButton mode="modal">
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px hsl(var(--primary) / 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-bold transition-shadow shadow-lg shadow-primary/20"
            >
              Login
            </motion.button>
          </SignInButton>
          <SignUpButton mode="modal">
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "hsl(var(--surface-hover))" }}
              whileTap={{ scale: 0.95 }}
              className="h-12 px-8 glass-strong border border-border/50 text-foreground rounded-xl font-bold transition-all"
            >
              Create Account
            </motion.button>
          </SignUpButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
          <FeatureCard 
            icon={<TrendingUp className="w-5 h-5 text-psx-green" />}
            title="Live Market"
            desc="Direct feed from PSX backend updated every 60 seconds."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-5 h-5 text-primary" />}
            title="Secure Vault"
            desc="Clerk-protected authentication for your portfolio data."
          />
          <FeatureCard 
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
            title="FastAPI Core"
            desc="High-performance Python backend powering your trades."
          />
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass-strong p-6 rounded-2xl text-left border border-border/20 hover:border-primary/30 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center mb-4 border border-border/20">
        {icon}
      </div>
      <h3 className="text-body font-semibold mb-2">{title}</h3>
      <p className="text-label text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
