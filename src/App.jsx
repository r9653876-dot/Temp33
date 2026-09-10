import React from 'react';
import { Logo } from './components/Logo';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* Decorative background elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <header className="header glass-panel">
        <Logo />
        <nav className="nav">
          <Button variant="ghost">Log In</Button>
          <Button variant="primary">Join LumiLove</Button>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Find Your Kind of <span className="text-gradient">Connection.</span>
            </h1>
            <p className="hero-subtitle">
              A women-only space to meet, connect and build meaningful relationships.
            </p>
            <div className="hero-actions">
              <Button size="lg" variant="primary">Join LumiLove</Button>
              <Button size="lg" variant="secondary">Explore How It Works</Button>
            </div>
          </div>
          
          <div className="hero-visual">
            <Card hoverable glass className="preview-card">
              <div className="preview-image-placeholder"></div>
              <div className="preview-info">
                <h3>Sarah, 28</h3>
                <p>Creative Director • New York</p>
                <div className="preview-tags">
                  <span className="tag">Art</span>
                  <span className="tag">Coffee</span>
                  <span className="tag">Travel</span>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
