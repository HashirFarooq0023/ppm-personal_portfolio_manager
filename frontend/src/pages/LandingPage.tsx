import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export default function LandingPage() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smoothing for the background spotlight
  const spotlightX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const spotlightY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30">
      {/* Interactive Mouse Spotlight */}
      <motion.div 
        style={{
          left: spotlightX,
          top: spotlightY,
        }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0"
      />

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
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1.5px,transparent_1.5px),linear-gradient(to_bottom,#ffffff15_1.5px,transparent_1.5px)] bg-[size:45px_45px] [mask-image:radial-gradient(ellipse_95%_95%_at_50%_50%,#000_85%,transparent_100%)] pointer-events-none" 
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
          scale: [1, 1.4, 1],
          x: [0, -60, 0],
          y: [0, -40, 0],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-psx-green/10 rounded-full blur-[130px] -z-10 pointer-events-none" 
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
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
          }
        }}
        className="max-w-4xl w-full text-center space-y-8 relative z-50"
      >
        <motion.div 
          variants={{ 
            hidden: { opacity: 0, y: 10 }, 
            visible: { opacity: 1, y: 0 } 
          }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-accent/30 text-label text-muted-foreground mb-4"
        >
          <Zap className="w-3.5 h-3.5 text-psx-green" />
          <span>Real-time PSX Intelligence</span>
        </motion.div>

        <motion.h1 
          variants={{ 
            hidden: { opacity: 0, y: 20 }, 
            visible: { opacity: 1, y: 0 } 
          }}
          className="text-display font-bold tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent"
        >
          Personal Portfolio <br /> Manager <span className="text-primary font-mono italic">AI BASED</span>
        </motion.h1>
        
        <motion.p 
          variants={{ 
            hidden: { opacity: 0, y: 20 }, 
            visible: { opacity: 1, y: 0 } 
          }}
          className="text-subheader text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Track your Pakistan Stock Exchange holdings with surgical precision. 
          Real-time prices, advanced analytics, and premium Glassmorphism design.
        </motion.p>

        <motion.div 
          variants={{ 
            hidden: { opacity: 0, y: 20 }, 
            visible: { opacity: 1, y: 0 } 
          }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <SignInButton mode="modal">
            <motion.button 
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 0 30px hsl(var(--primary) / 0.5)",
                y: -2 
              }}
              whileTap={{ scale: 0.95 }}
              className="h-12 px-8 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
            >
              Login
            </motion.button>
          </SignInButton>
          <SignUpButton mode="modal">
            <motion.button 
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: "hsl(var(--surface-hover))",
                y: -2
              }}
              whileTap={{ scale: 0.95 }}
              className="h-12 px-8 glass-strong border border-border/50 text-foreground rounded-xl font-bold transition-all"
            >
              Create Account
            </motion.button>
          </SignUpButton>
        </motion.div>

        <motion.div 
          variants={{ 
            hidden: { opacity: 0, scale: 0.95 }, 
            visible: { opacity: 1, scale: 1 } 
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16"
        >
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
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 100, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.02 }}
      className="glass-strong p-6 rounded-2xl text-left border border-border/20 hover:border-primary/40 transition-colors group relative"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center mb-4 border border-border/20 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-body font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-label text-muted-foreground leading-relaxed">{desc}</p>
      
      {/* Inner Glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
