import React from 'react';
import { LayoutDashboard, Camera, UtensilsCrossed, BarChart3, Settings, Database, Plus, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, dbStatus, onOpenAddModal }) {
  const isMssql = dbStatus?.engine === 'mssql';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'AI Scanner', icon: Camera, badge: 'Azure AI' },
    { id: 'log', label: 'Meal Log', icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <div className="navbar-logo" onClick={() => setActiveTab('dashboard')}>
          <div className="navbar-logo-icon">
            <div className="navbar-logo-icon-inner">
              <UtensilsCrossed size={20} />
            </div>
          </div>
          <div>
            <div className="navbar-logo-title">CalorieAI</div>
            <div className="navbar-logo-sub">Azure OpenAI · MSSQL</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="navbar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-ai-badge">
                    <Sparkles size={10} />
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="navbar-right">
          <div
            onClick={() => setActiveTab('settings')}
            title={isMssql ? 'MSSQL Connected' : 'Using Local Storage Fallback'}
            className={`db-status-pill ${isMssql ? 'db-status-connected' : 'db-status-fallback'}`}
          >
            <Database size={13} />
            <span>{isMssql ? 'MSSQL Connected' : 'Local Store'}</span>
            <span className={`status-dot ${isMssql ? 'status-dot-on' : 'status-dot-off'}`} />
          </div>

          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <Plus size={15} />
            Log Meal
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="navbar-mobile">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`navbar-mobile-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
