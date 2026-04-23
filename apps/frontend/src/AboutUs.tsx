import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import './AboutUs.css';

interface AboutUsProps {
  onNavigate: (page: string) => void;
}

const AboutUs = ({ onNavigate }: AboutUsProps) => {
  const [coverTurned, setCoverTurned] = useState(false);
  const [innerTurned, setInnerTurned] = useState(false);

  const handleCoverClick = () => {
    if (!coverTurned) setCoverTurned(true);
  };

  const handleInnerClick = () => {
    if (coverTurned && !innerTurned) setInnerTurned(true);
    else if (innerTurned) setInnerTurned(false);
    else if (coverTurned) setCoverTurned(false);
  };

  return (
    <div className="about-us-container">
      {/* ── Navigation ── */}
      <nav style={{
        position: 'fixed', top: '20px', left: '20px', right: '20px', zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: '1200px', margin: '0 auto',
      }}>
        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'white' }}>MAKERS</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => onNavigate('home')}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </button>
          <button onClick={() => onNavigate('marketplace')}
            style={{ background: 'linear-gradient(90deg,#9945FF,#14F195)', border: 'none', color: 'white', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>
            Marketplace
          </button>
        </div>
      </nav>

      {/* ── Heading ── */}
      <h2 style={{
        fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px',
        background: 'linear-gradient(90deg,#9945FF,#14F195)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        ABOUT US
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '32px', maxWidth: '560px', textAlign: 'center', fontSize: '0.95rem' }}>
        Discover the story behind Makers and our mission to democratize luxury real estate.
      </p>

      {/* ── Book ── */}
      <div className="cover">
        <div className="book">

          {/* LEFT HALF — always visible — shows "Our Vision" page */}
          <div className="book__page book__page--left">
            <div className="page__content" style={{ justifyContent: 'flex-start' }}>
              <h1 className="page__content-title">Our Vision</h1>
              <div className="page__content-blockquote">
                <p className="page__content-blockquote-text">
                  "Makers is the infrastructure for the future of global real estate.
                  Bridging Bali's finest assets with global liquidity, transparent ownership
                  and consistent on-chain yield."
                </p>
                <span className="page__content-blockquote-reference">The Makers Protocol*</span>
              </div>
              <div style={{ clear: 'both', width: '100%' }} />
              <div className="page__content-text" style={{ marginTop: '12px' }}>
                <p>
                  We believe premium property ownership shouldn't be reserved for the
                  ultra-wealthy. By fractionalizing assets, we open the door to everyone.
                </p>
                <p>
                  Our protocol tracks <b>$19.4M</b> in TVL with an average <b>0.0044 ARY</b>.
                  Join 1,200+ global holders in the revolution of Real World Assets.
                </p>
                <p>
                  Transparent on-chain ownership, consistent yields, and a seamless
                  investor experience — built on Solana and Ethereum.
                </p>
              </div>
              <div className="page__number">3</div>
            </div>
          </div>

          {/* INNER PAGE — front: Title, back: Mission/Contents */}
          <div
            className={`book__page book__page--inner ${innerTurned ? 'turned' : ''}`}
            onClick={handleInnerClick}
            title={innerTurned ? 'Click to flip back' : 'Click to turn page'}
          >
            {/* Front face — Title page */}
            <div className="book__page-front">
              <div className="page__content">
                <h1 className="page__content-book-title">Makers</h1>
                <h2 className="page__content-author">RWA Platform</h2>
                <div className="page__content-copyright">
                  <p>The Makers Society</p>
                  <p>Global — MMXXIV</p>
                </div>
              </div>
            </div>

            {/* Back face — Mission / Contents */}
            <div className="book__page-back">
              <div className="page__content" style={{ justifyContent: 'flex-start' }}>
                <h1 className="page__content-title">Mission Overview</h1>
                <table className="page__content-table">
                  <tbody>
                    <tr><td align="left">Part I</td><td align="left">Democratization</td><td align="right">3</td></tr>
                    <tr><td align="left">Part II</td><td align="left">Transparency</td><td align="right">12</td></tr>
                    <tr><td align="left">Part III</td><td align="left">Yield Protocol</td><td align="right">25</td></tr>
                    <tr><td align="left">Part IV</td><td align="left">Future Assets</td><td align="right">48</td></tr>
                  </tbody>
                </table>
                <div className="page-steps">
                  <p><b>1. Curate</b> — High-productivity assets</p>
                  <p><b>2. Tokenize</b> — Legal fractionalization</p>
                  <p><b>3. List</b> — Global liquidity access</p>
                  <p><b>4. Yield</b> — Automated distributions</p>
                </div>
                <div className="page__number">2</div>
              </div>
            </div>
          </div>

          {/* COVER — flips left to reveal inner pages */}
          <div
            className={`book__page book__page--cover ${coverTurned ? 'turned' : ''}`}
            onClick={handleCoverClick}
            title={coverTurned ? '' : 'Click to open'}
          >
            <img
              src="/assets/villa_uluwatu_1774384936394.png"
              alt="Makers Book Cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800';
              }}
            />
          </div>

        </div>
      </div>

      {/* ── Hint ── */}
      <p className="page-click-hint">
        {!coverTurned
          ? '📖 Click the cover to open the book'
          : !innerTurned
          ? '➡ Click the right page to turn'
          : '⬅ Click again to flip back'}
      </p>
    </div>
  );
};

export default AboutUs;
