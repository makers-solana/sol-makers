import React, { useState, useEffect } from 'react'
import Dashboard from './Dashboard'
import Home from './Home'
import AboutUs from './AboutUs'

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (newPath: string) => {
    let target = newPath;
    if (newPath === 'home') target = '/';
    if (newPath === 'marketplace') target = '/marketplace';
    if (newPath === 'asset-earning') target = '/asset-earning';
    if (newPath === 'about') target = '/about';
    
    // Ensure it starts with /
    if (!target.startsWith('/')) target = `/${target}`;

    window.history.pushState({}, '', target);
    setPath(target);
    window.scrollTo(0, 0);
  };

  // Basic Routing Logic
  let component;
  switch (path) {
    case '/marketplace':
      component = <Dashboard onNavigate={handleNavigate} />;
      break;
    case '/asset-earning':
      // Redirects to production API domain (https://api.thehistorymaker.io)
      component = <Home onNavigate={handleNavigate} />;
      break;
    case '/about':
      component = <AboutUs onNavigate={handleNavigate} />;
      break;
    default:
      component = <Home onNavigate={handleNavigate} />;
  }

  return (
    <>
      {component}
    </>
  )
}

export default App
