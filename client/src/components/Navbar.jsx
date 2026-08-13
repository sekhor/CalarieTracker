import React from 'react';
import { LayoutDashboard, Camera, UtensilsCrossed, BarChart3, Plus, Sparkles, LogOut, Download, MessageSquareHeart } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, dbStatus, onOpenAddModal, currentUser, onLogout, canInstall, onInstall }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'AI Scanner', icon: Camera, badge: 'Azure AI' },
    { id: 'coach', label: 'Coach', icon: MessageSquareHeart, badge: 'Nutrition AI' },
    { id: 'log', label: 'Meal Log', icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
            <div className="navbar-logo-sub">Smart nutrition tracking</div>
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
          {canInstall ? (
            <button onClick={onInstall} className="btn btn-secondary btn-sm">
              <Download size={15} />
              Install App
            </button>
          ) : null}
          <div className="navbar-user-pill">
            <span>{currentUser?.name}</span>
            <span className="navbar-user-email">{currentUser?.email}</span>
          </div>
          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <Plus size={15} />
            Log Meal
          </button>
          <button onClick={onLogout} className="btn btn-secondary btn-sm">
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="navbar-mobile">
        {canInstall ? (
          <button onClick={onInstall} className="navbar-mobile-item install">
            <Download size={20} />
            <span>Install</span>
          </button>
        ) : null}
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
