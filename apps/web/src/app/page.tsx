'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Coffee, Menu as MenuIcon, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { IMenuItem } from '@chai-partner/shared';

// -- Simple One-Time Scroll Reveal Hook --
function useScrollReveal(threshold = 0.15) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isRevealed };
}

// -- Header Scrolled State --
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrolled;
}

export default function LandingPage() {
  const [featuredItems, setFeaturedItems] = useState<IMenuItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Fetch real menu items to showcase (no ordering functionality attached)
  useEffect(() => {
    async function loadFeatured() {
      try {
        const menuData = await apiFetch<any>('/menu');
        let flattened: IMenuItem[] = [];
        if (Array.isArray(menuData)) {
          if (menuData.length > 0 && Array.isArray(menuData[0]?.items)) {
            menuData.forEach((cat: any) => {
              if (Array.isArray(cat.items)) {
                flattened.push(...cat.items);
              }
            });
          } else {
            flattened = menuData;
          }
        }
        
        // Grab top 3 items
        let bestsellers = flattened.filter(i => i.is_bestseller);
        if (bestsellers.length < 3) {
          const others = flattened.filter(i => !i.is_bestseller).slice(0, 3 - bestsellers.length);
          bestsellers = [...bestsellers, ...others];
        }
        setFeaturedItems(bestsellers.slice(0, 3));
      } catch (err) {
        console.error("Failed to load showcase items:", err);
      }
    }
    loadFeatured();
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pinned Section Logic for the Typography Reveal (Desktop Only)
  const pinnedRef = useRef<HTMLDivElement>(null);
  const [pinnedProgress, setPinnedProgress] = useState(0);

  useEffect(() => {
    if (reducedMotion || window.innerWidth < 768) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (pinnedRef.current) {
            const rect = pinnedRef.current.getBoundingClientRect();
            // Container is 300vh. The sticky inner is 100vh.
            const maxScroll = rect.height - window.innerHeight;
            const currentScroll = -rect.top;
            
            if (currentScroll < 0) {
              setPinnedProgress(0);
            } else if (currentScroll > maxScroll) {
              setPinnedProgress(1);
            } else {
              setPinnedProgress(currentScroll / maxScroll);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedMotion]);

  // Section Reveal Hooks
  const storyReveal = useScrollReveal(0.2);
  const cultureReveal = useScrollReveal(0.2);
  const bitesReveal = useScrollReveal(0.15);
  const spaceReveal = useScrollReveal(0.2);
  const contactReveal = useScrollReveal(0.3);

  return (
    <main className="min-h-screen bg-[#FBF9F5] text-[#1E1813] font-sans selection:bg-[#C17B3A]/20">
      
      {/* ────────────────────────────────────────────────────────
          NAVIGATION
      ──────────────────────────────────────────────────────── */}
      <header 
        className={`fixed w-full z-50 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          scrolled ? 'bg-[#FBF9F5]/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.05)] py-4' : 'bg-transparent py-8'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${scrolled ? 'bg-[#1E1813] text-[#FBF9F5]' : 'bg-white text-[#1E1813]'}`}>
              <Coffee className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="hidden sm:block">
              <span className={`font-serif font-bold text-xl tracking-tight block leading-none transition-colors duration-500 ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>
                Chai Partner
              </span>
              <span className={`text-[9px] uppercase font-bold tracking-[0.2em] transition-colors duration-500 mt-0.5 block ${scrolled ? 'text-[#9B5B22]' : 'text-white/80'}`}>
                Artisan Café & Roastery
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-10">
            <button onClick={() => scrollToSection('story')} className={`text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-[#C17B3A] ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>Our Story</button>
            <button onClick={() => scrollToSection('culture')} className={`text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-[#C17B3A] ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>Chai</button>
            <button onClick={() => scrollToSection('space')} className={`text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-[#C17B3A] ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>Experience</button>
            <button onClick={() => scrollToSection('contact')} className={`text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-[#C17B3A] ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>Contact</button>
            <div className={`w-[1px] h-4 mx-2 ${scrolled ? 'bg-[#1E1813]/20' : 'bg-white/30'}`}></div>
            <button onClick={() => scrollToSection('visit')} className={`text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:text-[#C17B3A] ${scrolled ? 'text-[#1E1813]' : 'text-white'}`}>Visit Us</button>
          </nav>

          {/* Mobile Toggle */}
          <button 
            className={`lg:hidden p-3 rounded-full transition-colors ${scrolled ? 'text-[#1E1813] hover:bg-black/5' : 'text-white hover:bg-white/10'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-[#FBF9F5] z-40 flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="flex flex-col items-center gap-10 text-center">
          <button onClick={() => scrollToSection('story')} className="text-3xl font-serif text-[#1E1813] hover:text-[#C17B3A] transition-colors">Our Story</button>
          <button onClick={() => scrollToSection('culture')} className="text-3xl font-serif text-[#1E1813] hover:text-[#C17B3A] transition-colors">Chai Culture</button>
          <button onClick={() => scrollToSection('space')} className="text-3xl font-serif text-[#1E1813] hover:text-[#C17B3A] transition-colors">The Space</button>
          <button onClick={() => scrollToSection('contact')} className="text-3xl font-serif text-[#1E1813] hover:text-[#C17B3A] transition-colors">Contact</button>
          <div className="w-12 h-[1px] bg-[#1E1813]/20 my-2"></div>
          <button onClick={() => scrollToSection('visit')} className="text-xs uppercase tracking-widest font-bold text-[#9B5B22] hover:text-[#C17B3A] transition-colors">Visit Us</button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          01 — CINEMATIC HERO
      ──────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[100svh] min-h-[700px] flex items-center justify-center bg-[#0A0807] overflow-hidden">
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/hero_chai.jpg" 
            alt="Chai Partner Atmosphere" 
            fill 
            className="object-cover object-[50%_40%] opacity-0 animate-[fade_2s_ease-out_forwards]" 
            priority 
          />
          {/* Subtle noise and gradient overlay for readability and cinematic grain */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\\'0 0 200 200\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'n\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.8\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23n)\\' opacity=\\'0.04\\'/%3E%3C/svg%3E')] opacity-40 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0807]/50 via-transparent to-[#0A0807]/80"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-12 mt-20 flex flex-col items-center text-center">
          
          <div className="overflow-hidden mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70 opacity-0 animate-[slideUp_1s_cubic-bezier(0.2,0.8,0.2,1)_0.5s_forwards]">
              Artisan Café & Roastery
            </h2>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-[110px] font-serif font-bold text-white leading-[0.95] tracking-tight mb-10">
            <div className="overflow-hidden pb-2"><div className="opacity-0 animate-[slideUp_1.2s_cubic-bezier(0.2,0.8,0.2,1)_0.6s_forwards]">Good chai.</div></div>
            <div className="overflow-hidden pb-2"><div className="opacity-0 animate-[slideUp_1.2s_cubic-bezier(0.2,0.8,0.2,1)_0.8s_forwards]">Good company.</div></div>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 font-serif max-w-md leading-relaxed opacity-0 animate-[fade_1.5s_ease_1.2s_forwards]">
            A warm place for chai, comforting bites, and conversations that stay a little longer.
          </p>
          
          <div className="mt-20 opacity-0 animate-[fade_1.5s_ease_1.8s_forwards]">
            <button 
              onClick={() => scrollToSection('story')}
              className="text-xs uppercase tracking-[0.2em] font-bold text-white/60 hover:text-white transition-colors flex flex-col items-center gap-4"
            >
              <span>Discover the café</span>
              <div className="w-[1px] h-12 bg-white/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-white animate-[scrollLine_2s_ease-in-out_infinite]"></div>
              </div>
            </button>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          02 — THE CAFÉ / BRAND STORY
      ──────────────────────────────────────────────────────── */}
      <section id="story" ref={storyReveal.ref} className="w-full py-32 md:py-48 bg-[#FBF9F5]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24 items-center">
          
          <div className={`md:col-span-5 md:col-start-2 space-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${storyReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9B5B22]">The Café</h2>
            <h3 className="text-5xl md:text-7xl font-serif font-bold text-[#1E1813] leading-[1.05] tracking-tight">
              A place made<br/>for slow moments.
            </h3>
            <p className="text-xl text-[#524A42] font-serif leading-relaxed">
              We built Chai Partner on a simple truth: the best things in life take time.
            </p>
            <p className="text-sm text-[#857B72] leading-loose max-w-sm">
              We source authentic ingredients and prepare everything fresh to order. There are no shortcuts here. Just familiar Indian flavours, thoughtful café food, and a space designed around connection.
            </p>
          </div>

          <div className={`md:col-span-5 relative transition-all duration-[1.5s] delay-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${storyReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
            <div className="aspect-[3/4] rounded-none overflow-hidden relative">
              <Image src="/images/story_cafe.jpg" alt="Café Interior" fill className="object-cover grayscale-[20%]" />
            </div>
            {/* Editorial overlapping text block */}
            <div className="absolute -bottom-8 -left-8 md:-left-16 bg-white p-8 shadow-xl max-w-[240px]">
              <p className="font-serif text-2xl italic text-[#1E1813] leading-tight">
                &quot;Take your time. Your table is yours.&quot;
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          03 — CHAI CULTURE
      ──────────────────────────────────────────────────────── */}
      <section id="culture" ref={cultureReveal.ref} className="w-full py-32 md:py-48 bg-[#15110E] text-[#FBF9F5] overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-16 lg:gap-32">
          
          <div className={`flex-1 transition-all duration-[1.5s] ease-out ${cultureReveal.isRevealed ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative aspect-square md:aspect-[4/5] w-full max-w-[600px] mx-auto overflow-hidden">
               {/* Slow scale image for cinematic feel without listening to scroll */}
              <Image 
                src="/images/menu/kulhad_chai.jpg" 
                alt="Kulhad Chai" 
                fill 
                className={`object-cover transition-transform duration-[3s] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${cultureReveal.isRevealed ? 'scale-100' : 'scale-110'}`} 
                onError={(e) => e.currentTarget.src = "/images/story_cafe.jpg"}
              />
            </div>
          </div>

          <div className={`flex-1 space-y-12 transition-all duration-[1.5s] delay-200 ease-out ${cultureReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
            <h3 className="text-6xl md:text-8xl font-serif font-bold leading-[0.9] tracking-tighter">
              CHAI<br/>IS MORE<br/>THAN A DRINK.
            </h3>
            <p className="text-xl font-serif text-white/70 leading-relaxed max-w-md">
              It is the warmth in the room. The start of a story. The perfect pause in a busy day.
            </p>
          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          04 — SIGNATURE BITES (Magazine Showcase, No Cart/Ordering)
      ──────────────────────────────────────────────────────── */}
      <section ref={bitesReveal.ref} className="w-full py-32 md:py-48 bg-[#FBF9F5]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          
          <div className={`mb-24 transition-all duration-[1.5s] ease-out ${bitesReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9B5B22] mb-6">Signature Bites</h2>
            <h3 className="text-5xl md:text-7xl font-serif font-bold text-[#1E1813] leading-[1.05] tracking-tight">
              A few<br/>favourites.
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-20 border-t border-[#1E1813]/10 pt-16">
            {featuredItems.length > 0 ? (
              featuredItems.map((item, i) => (
                <div 
                  key={item.id} 
                  className={`flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${bitesReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="relative aspect-[3/4] w-full mb-8 overflow-hidden bg-[#F0ECE4]">
                    <Image 
                      src="/images/menu/bun_maska.jpg" // Fallback since we don't have all exact item images
                      alt={item.name} 
                      fill 
                      className="object-cover grayscale-[10%]" 
                      onError={(e) => e.currentTarget.src = "/images/menu/bun_maska.jpg"}
                    />
                  </div>
                  <div className="flex justify-between items-baseline mb-4">
                    <h4 className="font-serif font-bold text-2xl text-[#1E1813]">{item.name}</h4>
                    <span className="font-sans font-bold text-xs tracking-widest text-[#9B5B22]">₹{Number(item.price)}</span>
                  </div>
                  <p className="text-sm text-[#524A42] leading-relaxed line-clamp-3">{item.description}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-[#857B72] font-serif text-xl">Curating our signature collection...</div>
            )}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          05 — THE SPACE
      ──────────────────────────────────────────────────────── */}
      <section id="space" ref={spaceReveal.ref} className="w-full py-32 md:py-48 bg-white overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          
          <div className={`text-center mb-24 md:mb-32 transition-all duration-[1.5s] ease-out ${spaceReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h3 className="text-4xl sm:text-6xl md:text-8xl font-serif font-bold text-[#1E1813] leading-none tracking-tighter">
              COME FOR THE CHAI.<br/>
              <span className="text-[#9B5B22] italic">STAY FOR THE COMPANY.</span>
            </h3>
          </div>

          <div className="relative w-full aspect-[4/3] md:aspect-[21/9]">
            {/* Main large image */}
            <div className={`absolute inset-0 transition-all duration-[2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${spaceReveal.isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
               <Image src="/images/hero_chai.jpg" alt="Café Atmosphere" fill className="object-cover" />
            </div>
            
            {/* Overlapping detail image (Desktop only) */}
            <div className={`absolute -bottom-16 -right-8 w-1/3 aspect-[3/4] hidden md:block bg-white p-4 shadow-2xl transition-all duration-[2s] delay-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${spaceReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
              <div className="relative w-full h-full bg-[#F0ECE4]">
                <Image src="/images/menu/grilled_sandwich.jpg" alt="Cafe Details" fill className="object-cover" onError={(e) => e.currentTarget.src = "/images/story_cafe.jpg"} />
              </div>
            </div>
            
            {/* Overlapping detail image 2 (Desktop only) */}
            <div className={`absolute -top-16 -left-8 w-1/4 aspect-square hidden md:block bg-white p-4 shadow-2xl transition-all duration-[2s] delay-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${spaceReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
              <div className="relative w-full h-full bg-[#F0ECE4]">
                <Image src="/images/menu/mint_mojito.jpg" alt="Cafe Details" fill className="object-cover" onError={(e) => e.currentTarget.src = "/images/menu/bun_maska.jpg"} />
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          06 — CHAI × CONVERSATION (Pinned Signature Reveal)
      ──────────────────────────────────────────────────────── */}
      {/* Desktop View - Sticky Typography */}
      <section 
        ref={pinnedRef}
        className="w-full bg-[#0A0807] text-[#FBF9F5] hidden md:block relative"
        style={{ height: '250vh' }}
      >
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[1400px] px-6 text-center">
            
            {/* CHAI. */}
            <div className="overflow-hidden">
              <h2 
                className="text-8xl lg:text-[11vw] font-serif font-bold leading-none tracking-tighter will-change-transform"
                style={{ 
                  transform: reducedMotion ? 'none' : `translateY(${Math.max(0, (0.33 - pinnedProgress) * 150)}px)`,
                  opacity: pinnedProgress > 0.05 ? 1 : 0 
                }}
              >
                CHAI.
              </h2>
            </div>
            
            {/* CONVERSATION. */}
            <div className="overflow-hidden py-4">
              <h2 
                className="text-8xl lg:text-[11vw] font-serif font-bold leading-none tracking-tighter text-[#C17B3A] italic will-change-transform"
                style={{ 
                  transform: reducedMotion ? 'none' : `translateY(${Math.max(0, (0.66 - pinnedProgress) * 150)}px)`,
                  opacity: pinnedProgress > 0.35 ? 1 : 0 
                }}
              >
                CONVERSATION.
              </h2>
            </div>
            
            {/* CONNECTION. */}
            <div className="overflow-hidden">
              <h2 
                className="text-8xl lg:text-[11vw] font-serif font-bold leading-none tracking-tighter will-change-transform"
                style={{ 
                  transform: reducedMotion ? 'none' : `translateY(${Math.max(0, (1 - pinnedProgress) * 150)}px)`,
                  opacity: pinnedProgress > 0.70 ? 1 : 0 
                }}
              >
                CONNECTION.
              </h2>
            </div>

          </div>
        </div>
      </section>

      {/* Mobile View - Normal Flow Stack */}
      <section className="w-full py-32 bg-[#0A0807] text-[#FBF9F5] md:hidden">
        <div className="px-6 flex flex-col items-center text-center space-y-8">
          <h2 className="text-[14vw] font-serif font-bold leading-none">CHAI.</h2>
          <h2 className="text-[14vw] font-serif font-bold leading-none text-[#C17B3A] italic">CONVERSATION.</h2>
          <h2 className="text-[14vw] font-serif font-bold leading-none">CONNECTION.</h2>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          07 — CONTACT / VISIT US
      ──────────────────────────────────────────────────────── */}
      <section id="contact" ref={contactReveal.ref} className="w-full py-32 md:py-48 bg-[#FBF9F5]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          
          <div className={`mb-24 md:mb-32 transition-all duration-[1.5s] ease-out ${contactReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h3 className="text-5xl md:text-8xl font-serif font-bold text-[#1E1813] leading-none tracking-tighter">
              COME SAY HELLO.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 lg:gap-24 border-t border-[#1E1813]/10 pt-16">
            
            {/* Contact */}
            <div className={`space-y-6 transition-all duration-1000 ease-out delay-100 ${contactReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9B5B22] mb-8">Contact</h4>
              <div>
                <p className="text-sm text-[#857B72] mb-1">Email</p>
                <a href="mailto:hello@chaipartner.com" className="text-xl font-serif text-[#1E1813] hover:text-[#C17B3A] transition-colors">hello@chaipartner.com</a>
              </div>
              <div className="pt-8">
                <a href="mailto:hello@chaipartner.com" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#1E1813] border-b border-[#1E1813] pb-1 hover:text-[#C17B3A] hover:border-[#C17B3A] transition-colors">
                  Get in touch
                </a>
              </div>
            </div>

            {/* Visit Us (Location) */}
            <div id="visit" className={`space-y-6 transition-all duration-1000 ease-out delay-200 ${contactReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9B5B22] mb-8">Visit Us</h4>
              <div>
                <p className="text-xl font-serif text-[#1E1813] mb-2">Chai Partner</p>
                <p className="text-sm text-[#524A42] leading-relaxed">
                  123 Artisan Street<br/>
                  Cultural District<br/>
                  City, State 10001
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className={`space-y-6 transition-all duration-1000 ease-out delay-300 ${contactReveal.isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9B5B22] mb-8">Hours</h4>
              <div className="space-y-2 text-sm text-[#524A42]">
                <div className="flex justify-between border-b border-[#1E1813]/10 pb-2">
                  <span>Mon - Fri</span>
                  <span className="font-serif">8:00 AM - 9:00 PM</span>
                </div>
                <div className="flex justify-between border-b border-[#1E1813]/10 pb-2">
                  <span>Saturday</span>
                  <span className="font-serif">9:00 AM - 10:00 PM</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span>Sunday</span>
                  <span className="font-serif">9:00 AM - 8:00 PM</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────
          08 — FOOTER
      ──────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#1E1813] text-[#FBF9F5] pt-24 pb-12">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
          
          <div className="space-y-6">
            <span className="font-serif font-bold text-3xl tracking-tight block">Chai Partner</span>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C17B3A] block">Artisan Café & Roastery</span>
          </div>
          
          <div className="flex flex-col md:items-end justify-between">
            <div className="space-y-2 mb-16 text-sm text-white/60 md:text-right">
              <p>123 Artisan Street, Cultural District</p>
              <p>hello@chaipartner.com</p>
            </div>
            <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold">
              <button onClick={() => scrollToSection('story')} className="hover:text-white transition-colors">Story</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-white transition-colors">Contact</button>
            </div>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">
          <p>© {new Date().getFullYear()} Chai Partner.</p>
          <p>Artisan Café & Roastery</p>
        </div>
      </footer>
      
      {/* Required CSS for simple keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes scrollLine {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
      `}} />
    </main>
  );
}
