import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, ShieldCheck, TrendingUp, Globe, Activity, CheckCircle2, ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans w-full">
      <Navbar />
      <HeroSection />
      <MarqueeSection />
      <HorizontalScrollSection />
      <StickyScrollReveal />
      <CTASection />
      <Footer />
    </div>
  );
}

// --- Navbar ---
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b",
        scrolled ? "bg-background/80 backdrop-blur-md border-border py-2" : "bg-transparent border-transparent py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-lg rotate-0 group-hover:rotate-12 transition-transform duration-300" />
            <Zap className="w-5 h-5 text-primary fill-current relative z-10" />
          </div>
          <span className="text-xl font-bold tracking-tight">EIF Portal</span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#process" className="hover:text-primary transition-colors">Process</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" className="hidden sm:inline-flex hover:bg-foreground/5 font-medium">Sign In</Button>
            </Link>
            <Link href="/auth">
              <Button className="shadow-lg shadow-primary/25 rounded-full px-6">Get Access</Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// --- Hero Section ---
const HeroSection = () => {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 300]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-[0.15] dark:opacity-30">
          <div className="perspective-grid absolute inset-0 -top-[50%] h-[200%] w-full" />
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        
        {/* Fade to background at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10" />
      </div>

      <motion.div 
        style={{ y, opacity }}
        className="relative z-20 text-center px-4 w-full max-w-5xl mx-auto flex flex-col items-center"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">2025 Deal Cycle Open</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.1] md:leading-[0.95]">
          <span className="block">Powering the</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary pb-2">
             Energy Future
          </span>
        </h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-light px-4"
        >
          The definitive platform connecting institutional capital with high-growth energy innovators.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:w-auto"
        >
          <Link href="/auth">
            <Button size="lg" className="w-full h-14 text-lg px-8 rounded-full shadow-[0_0_30px_-5px_rgba(136,63,249,0.3)] hover:shadow-[0_0_50px_-5px_rgba(136,63,249,0.5)] transition-all duration-300">
              Join as Investor <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline" className="w-full h-14 text-lg px-8 rounded-full backdrop-blur-md bg-background/50">
              List Company
            </Button>
          </Link>
        </motion.div>
      </motion.div>
      
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground/50 hidden md:block"
      >
        <ChevronDown size={32} />
      </motion.div>
    </section>
  );
};

// --- Marquee Section ---
const MarqueeSection = () => {
  return (
    <div className="w-full border-y border-border bg-card/30 backdrop-blur-sm overflow-hidden py-6 md:py-8 z-30 relative">
      <div className="max-w-full overflow-hidden flex mask-linear-gradient">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          className="flex whitespace-nowrap gap-8 md:gap-16 text-muted-foreground/40 font-bold text-2xl md:text-4xl uppercase tracking-tighter"
        >
           {[...Array(4)].map((_, i) => (
             <React.Fragment key={i}>
                <span>Renewables</span>
                <span className="text-primary/40">•</span>
                <span>Grid Tech</span>
                <span className="text-primary/40">•</span>
                <span>Storage</span>
                <span className="text-primary/40">•</span>
                <span>Carbon Capture</span>
                <span className="text-primary/40">•</span>
                <span>Mobility</span>
                <span className="text-primary/40">•</span>
                <span>Hydrogen</span>
                <span className="text-primary/40">•</span>
             </React.Fragment>
           ))}
        </motion.div>
      </div>
    </div>
  );
};

// --- Horizontal Scroll Section (static cards) ---
const HorizontalScrollSection = () => {
  const cards = [
    { title: "Smart Matching", sub: "Algorithmic Deal Flow", icon: Zap, desc: "Our engine analyzes your thesis against thousands of data points to surface the highest-probability matches." },
    { title: "Verified Entities", sub: "Trust & Safety", icon: ShieldCheck, desc: "Every investor and company undergoes a rigorous verification process to ensure a high-quality ecosystem." },
    { title: "Global Reach", sub: "Borderless Investment", icon: Globe, desc: "Access opportunities across 4 continents, from emerging markets to established hubs." },
    { title: "Growth Metrics", sub: "Real-time Data", icon: TrendingUp, desc: "Track portfolio performance and market trends with our integrated analytics dashboard." },
    { title: "Direct Scheduling", sub: "Frictionless Meetings", icon: Activity, desc: "Bypass the back-and-forth. Our integrated calendar system handles timezones and availability." },
  ];

  return (
    <section id="features" className="relative bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="w-full mb-8">
          <h2 className="text-4xl md:text-6xl font-bold mb-2">The Network Effect</h2>
          <p className="text-xl text-muted-foreground max-w-xl">
             A powerful suite of tools designed to accelerate capital deployment.
          </p>
        </div>

        {/* Static card grid: stacked on mobile, multi-column on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
          {cards.map((card, i) => (
            <FeatureCard key={i} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ card, className }: { card: any, className?: string }) => (
  <div className={cn(
    "group relative bg-card border border-border rounded-3xl p-6 overflow-hidden hover:border-primary/50 transition-colors duration-500 shadow-sm hover:shadow-xl min-h-[120px]",
    className
  )}>
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:gap-6">
       <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4 md:mb-0 group-hover:scale-110 transition-transform duration-500">
          <card.icon className="w-7 h-7 text-foreground group-hover:text-primary transition-colors" />
       </div>
       <div className="flex-1">
         <h3 className="text-lg md:text-xl font-bold mb-1">{card.title}</h3>
         <p className="text-primary font-medium tracking-wide uppercase text-xs md:text-sm mb-1">{card.sub}</p>
         <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{card.desc}</p>
       </div>
    </div>

    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-colors text-foreground group-hover:text-white">
        <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
      </div>
    </div>
  </div>
);

// --- Sticky Scroll Reveal Section ---
const StickyScrollReveal = () => {
  const [activeCard, setActiveCard] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const content = [
    {
      title: "Create Profile",
      description: "Build a rich, data-driven profile showcasing your investment thesis or company traction. Upload decks, set preferences, and get verified.",
      visual: <MockupProfile />
    },
    {
      title: "Discover & Match",
      description: "Our matching engine surfaces the most relevant counterparts. Filter by sector, stage, check size, and geography to find your next deal.",
      visual: <MockupDiscovery />
    },
    {
      title: "Meet & Transact",
      description: "Request meetings directly through the platform. Manage your schedule, track follow-ups, and move from introduction to term sheet faster.",
      visual: <MockupMeeting />
    },
  ];

  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth < 1024);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (!isMobile) {
        const cardIndex = Math.min(
            Math.floor(latest * content.length),
            content.length - 1
        );
        setActiveCard(cardIndex);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, isMobile, content.length]);

  return (
    <section id="process" ref={ref} className="relative lg:h-[100vh] bg-muted/30">
       <div className="lg:sticky lg:top-0 min-h-screen flex items-center justify-center py-12 lg:py-0">
          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
             
             {/* Text Content */}
             <div className="space-y-8 lg:space-y-6 relative z-10 order-2 lg:order-1">
                <div className="mb-6 lg:mb-8">
                   <h2 className="text-4xl md:text-5xl font-bold mb-2">How It Works</h2>
                   <p className="text-lg md:text-xl text-muted-foreground">Streamlined from registration to handshake.</p>
                </div>
                
                <div className="space-y-6 md:space-y-8">
                   {content.map((item, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0.5 }}
                        animate={{ 
                           opacity: isMobile ? 1 : activeCard === index ? 1 : 0.3,
                           x: isMobile ? 0 : activeCard === index ? 0 : -20
                        }}
                        className="cursor-pointer group"
                        onClick={() => setActiveCard(index)}
                      >
                         <h3 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-4 group-hover:text-primary transition-colors">
                            <span className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full text-sm border transition-colors duration-300",
                                isMobile || activeCard === index 
                                    ? "bg-primary border-primary text-white" 
                                    : "border-border text-muted-foreground"
                            )}>{index + 1}</span>
                            {item.title}
                         </h3>
                         <p className="text-lg text-muted-foreground pl-14 max-w-md leading-relaxed">
                            {item.description}
                         </p>
                         
                         {/* Mobile Visual Reveal */}
                         <div className="lg:hidden mt-8 pl-14">
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-border/50 bg-background">
                                {item.visual}
                            </div>
                         </div>
                      </motion.div>
                   ))}
                </div>
             </div>

             {/* Desktop Visual Content */}
             <div className="relative h-[500px] w-full hidden lg:flex items-center justify-center order-1 lg:order-2">
                 <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/10 blur-[100px] rounded-full" />
                 
                 <div className="relative w-full h-full max-w-[500px] mx-auto">
                    {content.map((item, index) => (
                       <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9, rotateX: 10, y: 50 }}
                          animate={{ 
                              opacity: activeCard === index ? 1 : 0,
                              scale: activeCard === index ? 1 : 0.9,
                              rotateX: activeCard === index ? 0 : 10,
                              y: activeCard === index ? 0 : 50,
                              zIndex: activeCard === index ? 10 : 0,
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute inset-0 flex items-center justify-center"
                       >
                           <div className="w-full relative shadow-2xl rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl">
                                {item.visual}
                           </div>
                       </motion.div>
                    ))}
                 </div>
             </div>

          </div>
       </div>
    </section>
  );
};

// --- CTA Section ---
const CTASection = () => {
   return (
    <section className="py-20 relative overflow-hidden flex items-center justify-center min-h-[60vh] bg-background">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(136,63,249,0.1)_0%,rgba(0,0,0,0)_70%)]" />
             <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
           >
              <h2 className="text-4xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.1] md:leading-[0.95]">
                Ready to Shape <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">The Future?</span>
              </h2>
              <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light">
                Join thousands of investors and founders accelerating the global energy transition.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                 <Link href="/auth">
                    <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-10 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all duration-300">
                       Start as Investor
                    </Button>
                 </Link>
                 <Link href="/auth">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg h-14 px-10 rounded-full font-semibold hover:bg-secondary/90 transition-all duration-300">
                       Start as Company
                    </Button>
                 </Link>
              </div>
           </motion.div>
        </div>
    </section>
   )
}

// --- Footer ---
const Footer = () => (
    <footer className="border-t border-border bg-card pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary fill-current" />
                 </div>
                 <span className="text-xl font-bold">EIF Portal</span>
              </div>
              <p className="text-muted-foreground max-w-sm font-light leading-relaxed">
                The Energy Investors Forum (EIF) connects the world's leading energy investors with the most promising innovations in the sector.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Platform</h4>
              <ul className="space-y-4 text-muted-foreground text-sm font-medium">
                <li><a href="#" className="hover:text-primary transition-colors">For Investors</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">For Companies</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4 text-muted-foreground text-sm font-medium">
                <li><a href="#" className="hover:text-primary transition-colors">About EIF</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Events</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2024 Energy Investors Forum. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
)

// --- Visual Mockups for Sticky Section ---

const MockupProfile = () => (
    <div className="w-full bg-card rounded-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-900 to-primary/50" />
        <div className="p-6 relative">
            <div className="w-16 h-16 rounded-full bg-background border-4 border-card absolute -top-8 left-6 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚀</span>
            </div>
            <div className="mt-10 space-y-4">
                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted/50 rounded animate-pulse" />
                <div className="flex flex-wrap gap-2 pt-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">Series A</div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs border border-blue-500/20">CleanTech</div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs border border-green-500/20">$5M Raised</div>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">Metrics</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-2xl font-bold">$1.2M</div>
                            <div className="text-xs text-muted-foreground">ARR</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">120%</div>
                            <div className="text-xs text-muted-foreground">YoY Growth</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const MockupDiscovery = () => (
    <div className="w-full bg-card rounded-xl p-6 grid gap-4">
        <div className="flex justify-between items-center mb-2">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                <BarChart3 size={16} />
            </div>
        </div>
        {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-background border border-border flex items-center justify-center font-bold text-xs text-muted-foreground">
                    {i === 1 ? "SF" : i === 2 ? "NY" : "LD"}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-24 bg-foreground/20 rounded" />
                    <div className="h-2 w-16 bg-foreground/10 rounded" />
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded bg-background border border-border text-muted-foreground">
                    9{9-i}% Match
                </div>
            </div>
        ))}
        <Button variant="outline" size="sm" className="w-full mt-2">View All Matches</Button>
    </div>
)

const MockupMeeting = () => (
    <div className="w-full bg-card rounded-xl p-6">
        <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold">Meeting Confirmed</h3>
            <p className="text-muted-foreground text-sm">Tuesday, Oct 24 • 2:00 PM</p>
        </div>
        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">SC</div>
                <div className="text-sm font-medium">Sarah Chen (Investor)</div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs text-secondary font-bold">VS</div>
                <div className="text-sm font-medium">VoltStorage (Company)</div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
             <Button variant="outline" size="sm" className="w-full">Reschedule</Button>
             <Button size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">Add to Calendar</Button>
        </div>
    </div>
)
