import { MainLayout } from "@/components/layout-main";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Zap, Globe, TrendingUp, Calendar } from "lucide-react";
import heroBg from "@assets/generated_images/dark_abstract_energy_waves_background.png";

export default function LandingPage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80"></div>
        </div>

        <div className="container relative z-10 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">EIF 2025 Registration Open</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight mb-6 text-white">
              Connect with the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
                Future of Energy
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The premier digital matchmaking platform for energy innovators and global capital. 
              Schedule meetings, discover opportunities, and close deals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?mode=register&role=investor">
                <Button size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-white rounded-full w-full sm:w-auto">
                  Join as Investor
                </Button>
              </Link>
              <Link href="/auth?mode=register&role=company">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-white/20 hover:bg-white/5 hover:text-white rounded-full w-full sm:w-auto backdrop-blur-sm">
                  Join as Company
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Capital Managed", value: "$50B+" },
              { label: "Companies Listed", value: "1,200+" },
              { label: "Meetings Arranged", value: "15k+" },
              { label: "Countries Represented", value: "45+" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold font-heading text-white mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Engineered for Deal Flow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform streamlines the entire process of discovery, diligence, and scheduling.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "Global Discovery",
                desc: "Filter thousands of companies by sector, stage, and geography with precision."
              },
              {
                icon: Zap,
                title: "Smart Matching",
                desc: "Our algorithm suggests the most relevant connections based on your investment thesis."
              },
              {
                icon: Calendar,
                title: "Seamless Scheduling",
                desc: "Book 1:1 meetings directly through the platform with integrated calendar sync."
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-white/10 backdrop-blur-sm hover:bg-card/80 transition-colors duration-300">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-30 blur-3xl"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">Ready to transform your portfolio?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join the leading energy investors and innovators building the net-zero future.
          </p>
          <Link href="/auth">
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full">
              Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
