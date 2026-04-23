import React, { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Info, Menu, X, Sun, Moon, Globe } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import "./Home.css";

// Globals from CDN
declare global {
  interface Window {
    gsap: any;
    ScrollTrigger: any;
  }
}

const Home = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeLabelRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hintBoxRef = useRef<HTMLDivElement>(null);
  const [hintPressed, setHintPressed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { wallet, connected = false } = useWallet();

  // Helper to append wallet param to external links
  const getSyncUrl = (baseUrl: string) => {
    if (connected && wallet?.adapter.name) {
      const url = new URL(baseUrl);
      url.searchParams.set('wallet', wallet.adapter.name);
      return url.toString();
    }
    return baseUrl;
  };

  useLayoutEffect(() => {
    if (!window.gsap || !window.ScrollTrigger) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const wrap = wrapRef.current;
    if (!wrap) return;

    const panels = gsap.utils.toArray(".panel") as HTMLElement[];
    if (!panels.length) return;

    // Global progress
    const stProgress = ScrollTrigger.create({
      trigger: wrap,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self: any) => {
        const bars = document.querySelectorAll(".progress__bar");
        const percent = `${Math.round(self.progress * 100)}%`;
        bars.forEach((bar: any) => {
          bar.style.width = percent;
        });
      },
    });

    const setActive = (i: number) => {
      const label = panels[i]?.dataset?.label || "Section";
      if (activeLabelRef.current) activeLabelRef.current.textContent = label;
    };

    // Pin/stack for all except last
    const loopPanels = panels.slice(0, -1);
    const mm = gsap.matchMedia();

    mm.add("(min-width: 981px)", () => {
      loopPanels.forEach((panel, i) => {
        // Parallax blobs
        const blobs = panel.querySelectorAll(".blob");
        if (blobs.length) {
          gsap.to(blobs, {
            yPercent: () => gsap.utils.random(-12, 12),
            xPercent: () => gsap.utils.random(-10, 10),
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        // Content in
        const copyBits = panel.querySelectorAll(
          ".kicker, .title, .desc, .chips, .cta-row, .cards, .masonry, .quote, .steps"
        );
        const media = panel.querySelectorAll(
          ".frame, .device, .poster, .tile, img"
        );

        if (copyBits.length) {
          gsap.fromTo(
            copyBits,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.06,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 70%",
                end: "top 25%",
                scrub: 0.3,
              },
            }
          );
        }

        if (media.length) {
          gsap.fromTo(
            media,
            { y: 18, opacity: 0, scale: 0.98 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 70%",
                end: "top 25%",
                scrub: 0.35,
              },
            }
          );
        }

        // Main stack transition
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: "bottom bottom",
            pin: true,
            pinSpacing: false,
            scrub: true,
            invalidateOnRefresh: true,
            onEnter: () => setActive(i),
            onEnterBack: () => setActive(i),
            onRefresh: () => {
              gsap.set(panel, {
                transformOrigin:
                  "center " +
                  (panel.offsetHeight - window.innerHeight / 2) +
                  "px",
              });
            },
          },
        });

        tl.to(
          panel,
          {
            scale: 0.92,
            opacity: 0.88,
            duration: 0.6,
            ease: "none",
          },
          0
        )
          .to(
            panel,
            {
              scale: 0.82,
              opacity: 0.55,
              duration: 0.6,
              ease: "none",
            },
            0.6
          )
          .to(
            panel,
            { opacity: 0, duration: 0.12, ease: "none" },
            1.2
          );
      });
      return () => { };
    });

    // Mobile fallback (simpler animations)
    mm.add("(max-width: 980px)", () => {
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top 50%",
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        });
      });
    });

    // Last panel label
    ScrollTrigger.create({
      trigger: panels[panels.length - 1],
      start: "top 55%",
      onEnter: () => setActive(panels.length - 1),
      onEnterBack: () => setActive(panels.length - 1),
    });

    ScrollTrigger.refresh();

    return () => {
      stProgress.kill();
      ScrollTrigger.getAll().forEach((st: any) => st.kill());
      mm.revert();
    };
  }, []);

  const handleJumpNext = () => {
    const panels = document.querySelectorAll(".panel");
    const el = panels[1];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - 78;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleJumpTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="home-container">
      <header className="topbar">
        <div className="brand" onClick={handleJumpTop} style={{ cursor: 'pointer' }}>
          <span className="dot"></span>
          <span className="name">Makers</span>
          <span className="pill" ref={activeLabelRef}>Intro</span>
        </div>

        <nav className="right header-nav-desktop">
          <button
            className="chip"
            style={{ marginRight: '10px' }}
            onClick={() => onNavigate('marketplace')}
          >
            Marketplace
          </button>
          <a
            href={getSyncUrl("https://api.thehistorymaker.io/")}
            className="chip"
            style={{ marginRight: "10px" }}
          >
            Asset & Earning
          </a>
          <button
            className="chip"
            onClick={() => window.open('https://docs.thehistorymaker.io/', '_blank')}
            title="About Us"
          >
            About Us
          </button>
          <div className="progress" aria-label="Scroll progress">
            <div className="progress__bar" ref={progressBarRef}></div>
          </div>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '8px',
            borderRadius: '12px',
            cursor: 'pointer',
            zIndex: 1001
          }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '280px',
        height: '100vh',
        backgroundColor: '#07080c',
        zIndex: 2000,
        padding: '80px 24px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease-in-out',
        transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}>NAVIGATION</span>
          <a href="#" onClick={(e) => { e.preventDefault(); handleJumpTop(); setIsMobileMenuOpen(false); }} style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Home</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('marketplace'); }} style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Marketplace</a>
          <a href={getSyncUrl("https://api.thehistorymaker.io/")} style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Asset & Earning</a>
          <a href="https://docs.thehistorymaker.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>About Us</a>
        </div>

        <div style={{ marginTop: 'auto', padding: '20px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div className="progress" aria-label="Scroll progress" style={{ width: '100%', marginBottom: '10px' }}>
            <div className="progress__bar" ref={progressBarRef}></div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>Scroll Progress</span>
        </div>
      </div>

      {/* Overlay for Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1500 }}
        />
      )}

      <main className="slides-wrapper" id="wrap" ref={wrapRef}>
        {/* Panel 1 */}
        <section className="panel panel--intro" data-label="Home">
          <div className="panel-bg">
            <span className="blob b1"></span>
            <span className="blob b2"></span>
            <span className="grid"></span>
          </div>

          <div className="panel-shell">
            <div className="copy">
              <div className="kicker">Real World Assets • Solana • Premium</div>
              <div className="title-row">
                <img src="https://app.thehistorymaker.io/makers-dark01.png" alt="Makers Logo" className="title-logo" />
                <h1 className="title">Makers</h1>
              </div>
              <p className="desc">
                Bridging Bali's finest real estate with global liquidity.
                Transparent on-chain ownership, consistent yields, and a seamless investor experience.
              </p>

              <div className="chips">
                <span className="mini">Fractionalized</span>
                <span className="mini">On-Chain Yield</span>
                <span className="mini">Verified Assets</span>
                <span className="mini">Liquid Markets</span>
              </div>

              <div className="cta-row">
                <button
                  className="btn btn--primary"
                  onClick={() => onNavigate('marketplace')}
                  type="button"
                >
                  Explore Marketplace
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={handleJumpNext}
                  type="button"
                >
                  Learn More
                </button>
              </div>

              {/* Hint Box (About Us) */}
              <div
                className="hint"
                ref={hintBoxRef}
                style={{ display: hintPressed ? 'block' : 'none' }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={18} style={{ color: 'var(--accent2)', marginTop: '2px' }} />
                  <div>
                    <strong>The Makers Protocol</strong> allows fractional ownership of premium Balinese villas.
                    Each token represents a real-world share with automated rental yield distribution.
                  </div>
                </div>
              </div>
            </div>

            <div className="media">
              <div className="frame">
                <img
                  src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1100"
                  alt="Bali Villa"
                />
                <div className="frame__badge">Bali</div>
                <div className="frame__meta">
                  <span>Portfolio</span>
                  <span>10 / 40000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Panel 2 */}
        <section className="panel panel--stats" data-label="Stats">
          <div className="panel-bg">
            <span className="blob b3"></span>
            <span className="blob b4"></span>
            <span className="grid"></span>
          </div>

          <div className="panel-shell">
            <div className="copy">
              <div className="kicker">Real-time Performance</div>
              <h2 className="title title--sm">Protocol Dashboard</h2>
              <p className="desc">
                Monitor valuation growth, rental yields, and secondary market activity in real-time.
              </p>

              <div className="cards">
                <article className="card">
                  <div className="card__top">
                    <span className="tag">Protocol TVL</span>
                    <span className="val"><b>$19.4</b>M</span>
                  </div>
                  <div className="bar"><i style={{ width: '85%' }}></i></div>
                  <div className="card__foot">Growing weekly</div>
                </article>

                <article className="card">
                  <div className="card__top">
                    <span className="tag">Avg Yield</span>
                    <span className="val"><b>0.0044</b></span>
                  </div>
                  <div className="bar"><i style={{ width: '72%' }}></i></div>
                  <div className="card__foot">Net ROI (Leasehold)</div>
                </article>

                <article className="card">
                  <div className="card__top">
                    <span className="tag">Holders</span>
                    <span className="val"><b>1.2</b>k+</span>
                  </div>
                  <div className="bar"><i style={{ width: '64%' }}></i></div>
                  <div className="card__foot">Distributed globally</div>
                </article>
              </div>
            </div>

            <div className="media">
              <div className="device">
                <div className="device__screen">
                  <div className="chart">
                    <div className="chart__row">
                      <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <div className="chart__bars">
                      <i style={{ height: '42%' }}></i>
                      <i style={{ height: '66%' }}></i>
                      <i style={{ height: '54%' }}></i>
                      <i style={{ height: '82%' }}></i>
                      <i style={{ height: '61%' }}></i>
                      <i style={{ height: '90%' }}></i>
                    </div>
                  </div>
                  <div className="device__meta">
                    <span>Active Yield Tracking</span>
                    <span className="pulse"></span>
                  </div>
                </div>
                <div className="device__base"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Panel 3 */}
        <section className="panel panel--gallery" data-label="Portfolio">
          <div className="panel-bg">
            <span className="blob b5"></span>
            <span className="blob b6"></span>
            <span className="grid"></span>
          </div>

          <div className="panel-shell">
            <div className="copy">
              <div className="kicker">Featured Villa Collection</div>
              <h2 className="title title--sm">World-Class Assets</h2>
              <p className="desc">
                From Bali We curate only the most productive real estate.
              </p>

              <div className="chips">
                <span className="mini">Villa Dreamland 1</span>
                <span className="mini">Villa Dreamland 2</span>
                <span className="mini">Villa Dreamland 3</span>
                <span className="mini">Villa Dreamland 4</span>
              </div>
            </div>

            <div className="media">
              <div className="masonry">
                <div className="tile">
                  <img
                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"
                    alt="Villa 1"
                  />
                  <span className="tile__cap">Villa Dreamland 1</span>
                </div>
                <div className="tile">
                  <img
                    src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800"
                    alt="Villa 2"
                  />
                  <span className="tile__cap">Villa Dreamland 2</span>
                </div>
                <div className="tile">
                  <img
                    src="https://balivillasale.com/wp-content/uploads/2022/12/WhatsApp-Image-2022-12-19-at-12.27.30-2-592x444.jpeg"
                    alt="Villa 3"
                  />
                  <span className="tile__cap">Villa Dreamland 3</span>
                </div>
                <div className="tile">
                  <img
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"
                    alt="Villa 4"
                  />
                  <span className="tile__cap">Villa Dreamland 4</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Panel 4 */}
        <section className="panel panel--story" data-label="Vision">
          <div className="panel-bg">
            <span className="blob b7"></span>
            <span className="blob b8"></span>
            <span className="grid"></span>
          </div>

          <div className="panel-shell">
            <div className="copy">
              <div className="kicker">Our Mission</div>
              <h2 className="title title--sm">Democratic Ownership</h2>
              <p className="desc">
                We believe premium property ownership shouldn't be reserved for the ultra-wealthy.
                By fractionalizing assets, we open the door to everyone.
              </p>

              <blockquote className="quote">
                “Makers is more than a protocol; it's the infrastructure for the future of global real estate.”
                <span className="who">- The Makers Vision</span>
              </blockquote>

              <div className="steps">
                <div className="step"><b>1</b> Curate</div>
                <div className="step"><b>2</b> Tokenize</div>
                <div className="step"><b>3</b> List</div>
                <div className="step"><b>4</b> Yield</div>
              </div>
            </div>

            <div className="media">
              <div className="poster">
                <img
                  src="https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=1100"
                  alt="Vision"
                />
                <div className="poster__glow"></div>
                <div className="poster__stamp">SCROLL</div>
              </div>
            </div>
          </div>
        </section>

        {/* Panel 5 (unpinned ending) */}
        <section className="panel panel--launch" data-label="Join">
          <div className="panel-bg">
            <span className="blob b9"></span>
            <span className="blob b10"></span>
            <span className="grid"></span>
          </div>

          <div className="panel-shell panel-shell--center">
            <div className="final">
              <div className="kicker">Ready to start?</div>
              <h2 className="title title--lg">Build your portfolio.</h2>
              <p className="desc">
                The most productive assets in the world are waiting.
                Join the Makers ecosystem today and start earning on-chain yield.
              </p>

              <div className="cta-row" style={{ justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    if (connected && wallet?.adapter.name) {
                      window.location.href = `/marketplace?wallet=${encodeURIComponent(wallet.adapter.name)}`;
                    } else {
                      onNavigate?.('marketplace');
                    }
                  }}
                  className="btn btn--primary"
                >
                  Invest Now <ArrowRight size={18} />
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={handleJumpTop}
                >
                  Back to Top
                </button>
              </div>

              <div className="foot">
                <span className="small">Makers Protocol © 2026</span>
                <span className="small">Built on Solana</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
