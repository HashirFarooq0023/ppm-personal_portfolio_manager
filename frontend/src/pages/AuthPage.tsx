import { SignIn, SignUp } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { motion } from "framer-motion";

export default function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Moving Grid */}
      <motion.div 
        animate={{ 
          backgroundPosition: ['0px 0px', '40px 40px'] 
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" 
      />

      {/* Animated Tracing Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
        <motion.div 
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute top-0 left-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-psx-green/50 to-transparent"
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5
            }}
            animate={{ 
              y: [null, "-=80"],
              opacity: [0, 0.4, 0]
            }}
            transition={{ 
              duration: Math.random() * 8 + 8, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      {/* Animated Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 40, 0],
          y: [0, -20, 0],
          opacity: [0.05, 0.08, 0.05]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, -30, 0],
          y: [0, 30, 0],
          opacity: [0.05, 0.07, 0.05]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-psx-green/5 rounded-full blur-[120px] -z-10" 
      />

      {/* AI Data Streams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`auth-stream-${i}`}
            className="absolute h-[1px] w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{ top: `${25 + i * 20}%`, left: '-10%' }}
            animate={{ x: ['0vw', '110vw'] }}
            transition={{ 
              duration: 3.5, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 1.5
            }}
          />
        ))}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 glass-strong p-2 rounded-3xl shadow-[0_0_80px_-20px_rgba(34,197,94,0.15)] border border-primary/20"
      >
        {mode === 'sign-in' ? (
          <SignIn 
            routing="path" 
            path="/sign-in" 
            signUpUrl="/sign-up"
            appearance={{
              baseTheme: dark,
              elements: {
                card: "bg-transparent shadow-none border-none",
                headerTitle: "text-foreground font-bold text-2xl tracking-tight",
                headerSubtitle: "text-muted-foreground/80",
                socialButtonsBlockButton: "glass hover:bg-surface-hover border-border/50",
                formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-all font-bold shadow-lg shadow-primary/20",
                footerActionLink: "text-primary hover:text-primary/80 transition-colors font-medium",
                identityPreviewText: "text-foreground",
                formFieldLabel: "text-muted-foreground/90 font-semibold",
                formFieldInput: "glass-strong border-border/40 focus:border-primary/50 text-foreground",
                dividerLine: "bg-border/30",
                dividerText: "text-muted-foreground/60"
              }
            }}
          />
        ) : (
          <SignUp 
            routing="path" 
            path="/sign-up" 
            signInUrl="/sign-in"
            appearance={{
              baseTheme: dark,
              elements: {
                card: "bg-transparent shadow-none border-none",
                headerTitle: "text-foreground font-bold text-2xl tracking-tight",
                headerSubtitle: "text-muted-foreground/80",
                socialButtonsBlockButton: "glass hover:bg-surface-hover border-border/50",
                formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-all font-bold shadow-lg shadow-primary/20",
                footerActionLink: "text-primary hover:text-primary/80 transition-colors font-medium",
                formFieldLabel: "text-muted-foreground/90 font-semibold",
                formFieldInput: "glass-strong border-border/40 focus:border-primary/50 text-foreground",
                dividerLine: "bg-border/30",
                dividerText: "text-muted-foreground/60"
              }
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
