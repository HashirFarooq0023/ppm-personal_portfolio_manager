import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { AIAnalystSheet } from './TopNavbar/AIAnalystSheet';

export default function TopNavbar() {
  const { theme, toggle } = useTheme();

  return (
    <header className="h-20 flex items-center px-6 gap-4 glass-strong border-b border-border/10 bg-background/50 backdrop-blur-md relative z-50">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-psx-green shadow-[0_0_10px_#10B981]" />
        <span className="text-3xl font-bold tracking-wider text-foreground">PPM</span>
        <span className="text-xs text-muted-foreground ml-2 mt-2 tracking-widest hidden sm:inline">AI BASED</span>
      </div>

      {/* NEW: The Revolving Quote Strip */}
      <div className="flex-1 max-w-2xl mx-8 overflow-hidden relative glass rounded-full px-4 py-2 hidden lg:block h-10">
        <div className="flex flex-nowrap animate-marquee w-max text-label text-psx-green/80 font-mono whitespace-nowrap items-center h-full">
          <div className="flex flex-nowrap shrink-0 items-center">
            <span className="mx-8">"    The stock market is a device for transferring money from the impatient to the patient." - Warren Buffett</span>
            <span className="mx-8">"    Risk comes from not knowing what you are doing." - Warren Buffett</span>
            <span className="mx-8">"    In the short run, the market is a voting machine but in the long run, it is a weighing machine." - Benjamin Graham</span>
            <span className="mx-8">"    Know what you own, and know why you own it." - Peter Lynch</span>
            <span className="mx-8">"    The individual investor should act consistently as an investor and not as a speculator." - Benjamin Graham</span>
            <span className="mx-8">"    Far more money has been lost by investors preparing for corrections... than has been lost in corrections themselves." - Peter Lynch</span>
            <span className="mx-8">"    The best way to measure your investing success is ... by whether you've put in place a financial plan and a behavioral discipline that are likely to get you where you want to go." - Benjamin Graham</span>
            <span className="mx-8">"    Investing isn't about beating others at their game. It's about controlling yourself at your own game." - Benjamin Graham</span>
            <span className="mx-8">"    Behind every stock is a company. Find out what it's doing." - Peter Lynch</span>
            <span className="mx-8">"    Price is what you pay. Value is what you get." - Warren Buffett</span>
          </div>
          <div className="flex flex-nowrap shrink-0 items-center">
            <span className="mx-8">"The stock market is a device for transferring money from the impatient to the patient." - Warren Buffett</span>
            <span className="mx-8">"Risk comes from not knowing what you are doing." - Warren Buffett</span>
            <span className="mx-8">"In the short run, the market is a voting machine but in the long run, it is a weighing machine." - Benjamin Graham</span>
            <span className="mx-8">"Know what you own, and know why you own it." - Peter Lynch</span>
            <span className="mx-8">"The individual investor should act consistently as an investor and not as a speculator." - Benjamin Graham</span>
            <span className="mx-8">"Far more money has been lost by investors preparing for corrections... than has been lost in corrections themselves." - Peter Lynch</span>
            <span className="mx-8">"The best way to measure your investing success is ... by whether you've put in place a financial plan and a behavioral discipline that are likely to get you where you want to go." - Benjamin Graham</span>
            <span className="mx-8">"Investing isn't about beating others at their game. It's about controlling yourself at your own game." - Benjamin Graham</span>
            <span className="mx-8">"Behind every stock is a company. Find out what it's doing." - Peter Lynch</span>
            <span className="mx-8">"Price is what you pay. Value is what you get." - Warren Buffett</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-label text-muted-foreground font-mono-tabular hidden sm:inline">
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} PKT
        </span>
        
        <SignedIn>
          <div className="mr-2">
            <AIAnalystSheet />
          </div>
        </SignedIn>

        <button
          onClick={toggle}
          className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-surface-hover transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          )}
        </button>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-3 py-1.5 text-label font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
