import React, { useEffect, useState } from 'react';

export default function Home() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 880 : false
  );
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 880);
    }
    window.addEventListener('resize', onResize);

    // Inject Google Fonts once
    const id = 'fccps-google-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Montserrat:wght@400;700&display=swap';
      document.head.appendChild(link);
    }

    // Add keyframes CSS for animation (keeps CSS in-component, not an external file)
    const animId = 'fccps-keyframes';
    if (!document.getElementById(animId)) {
      const style = document.createElement('style');
      style.id = animId;
      style.innerHTML = `@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-100%);} to { opacity: 1; transform: translateX(0);} }`;
      document.head.appendChild(style);
    }

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const colors = {
    white: '#ffffff',
    bgGradient: 'linear-gradient(to bottom right, #001845, #023E7D, #0466C8, #979DAC, #5C677D, #023E7D)'
  };

  const container = {
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    fontFamily: 'Nunito, Arial, Helvetica, sans-serif',
    background: colors.bgGradient,
    color: colors.white,
    boxSizing: 'border-box'
  };

  const navbar = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    padding: '0 30px'
  };

  const navLogo = {
    color: colors.white,
    fontSize: isMobile ? '1.5rem' : '2rem',
    fontFamily: "Gill Sans, Gill Sans MT, Calibri, 'Trebuchet MS', sans-serif",
    textDecoration: 'none'
  };

  const navbarItems = {
    display: 'flex',
    gap: isMobile ? 12 : 45,
    paddingRight: isMobile ? 20 : 150,
    alignItems: 'center'
  };

  const item = {
    padding: '10px 15px',
    color: colors.white,
    borderRadius: 80,
    fontSize: isMobile ? '0.95rem' : '1.12rem',
    cursor: 'pointer',
    background: 'transparent',
    transition: '0.3s ease',
    fontFamily: 'Verdana, Geneva, Tahoma, sans-serif'
  };

  const mainSection = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 60px)'
  };

  const sectionDetails = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20
  };

  const mainText = {
    color: colors.white,
    fontSize: isMobile ? '2.2rem' : '5rem',
    fontWeight: 700,
    marginBottom: 20,
    fontFamily: 'Montserrat, "Lato", sans-serif',
    display: 'flex',
    alignItems: 'center',
    animation: 'slideInFromLeft 1s ease-out forwards'
  };

  const startBtn = {
    color: hovered ? 'black' : colors.white,
    borderRadius: 80,
    padding: '10px 24px',
    fontSize: isMobile ? '1rem' : '1.12rem',
    backgroundColor: hovered ? 'rgba(232, 237, 230, 0.659)' : 'rgb(16, 6, 35)',
    border: hovered ? '2px solid black' : '2px solid transparent',
    transition: '0.1s',
    cursor: 'pointer'
  };

  function handleGetStarted(e) {
    e.preventDefault();
    // Adjust navigation to your app routing as needed
    window.location.href = '/login';
  }

  const navLinks = ['Home', 'Model Training', 'Contribution', 'About us', 'Contact us'];

  return (
    <div style={container}>
      <header>
        <nav style={navbar} aria-label="Main navigation">
          <a href="#" style={navLogo} className="nav-logo">
            <h2 style={{ margin: 0 }}>FCCPS</h2>
          </a>

          <ul style={{ ...navbarItems, listStyle: 'none', margin: 0 }}>
            {navLinks.map((label) => (
              <li key={label} style={{ margin: 0 }}>
                <a
                  href="#"
                  style={item}
                  onClick={(e) => e.preventDefault()}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#001845'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.white; }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <section style={mainSection}>
          <div style={sectionDetails}>
            <b>
              <p style={mainText}>Let's Get Started</p>
            </b>

            <div className="login" onClick={handleGetStarted}>
              <a
                href="#"
                style={startBtn}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleGetStarted}
              >
                Get Started
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer></footer>
    </div>
  );
}

