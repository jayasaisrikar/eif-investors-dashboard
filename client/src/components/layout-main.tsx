import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                E
              </span>
              Energy Investors Forum
            </a>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/"><a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</a></Link>
            <Link href="#"><a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a></Link>
            <Link href="#"><a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Events</a></Link>
            <div className="flex items-center gap-4 ml-4">
              <Link href="/auth">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/auth?mode=register">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">Get Started</Button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl p-4 flex flex-col gap-4">
            <Link href="/"><a onClick={() => setIsOpen(false)} className="text-sm font-medium p-2 hover:bg-white/5 rounded">Home</a></Link>
            <Link href="#"><a onClick={() => setIsOpen(false)} className="text-sm font-medium p-2 hover:bg-white/5 rounded">About</a></Link>
            <Link href="/auth"><a onClick={() => setIsOpen(false)} className="text-sm font-medium p-2 hover:bg-white/5 rounded">Log In</a></Link>
            <Link href="/auth?mode=register"><a onClick={() => setIsOpen(false)} className="text-sm font-medium p-2 hover:bg-white/5 rounded text-primary">Get Started</a></Link>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="text-lg font-bold font-heading">EIF Portal</div>
            <p className="text-sm text-muted-foreground">Connecting the future of energy with the capital to build it.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">For Investors</a></li>
              <li><a href="#" className="hover:text-primary">For Companies</a></li>
              <li><a href="#" className="hover:text-primary">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">About EIF</a></li>
              <li><a href="#" className="hover:text-primary">Contact</a></li>
              <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Connect</h4>
            <div className="flex gap-4">
              {/* Social Icons would go here */}
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground">
          © 2025 Energy Investors Forum. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
