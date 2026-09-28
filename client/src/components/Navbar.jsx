import React, { useState } from 'react';
import { LayoutDashboard, Camera, UtensilsCrossed, BarChart3, Plus, Sparkles, LogOut, Download, MessageSquareHeart, ClipboardList, BrainCircuit, BookOpenText, ClipboardPenLine, MoreHorizontal, X, User } from 'lucide-react';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner',   label: 'AI Scanner', icon: Camera,             badge: 'AI' },
  { id: 'log',       label: 'Meal Log',   icon: UtensilsCrossed },
  { id: 'coach',     label: 'Coach',      icon: MessageSquareHeart, badge: 'AI' },
  { id: 'profile',   label: 'Profile',    icon: ClipboardList },
  { id: 'insights',  label: 'Insights',   icon: BrainCircuit,       badge: 'AI' },
  { id: 'analytics', label: 'Analytics',  icon: BarChart3 },
  { id: 'knowledge', label: 'Knowledge',  icon: BookOpenText,       badge: 'RAG' },
  { id: 'planner',   label: 'Planner',    icon: ClipboardPenLine,   badge: 'AI' },
];

// Primary 5 shown in mobile bottom bar; rest go in "More" drawer
const MOBILE_PRIMARY = ['dashboard', 'scanner', 'log', 'coach', 'profile'];

export default function Navbar({ activeTab, setActiveTab, onOpenAddModal, currentUser, onLogout, canInstall, onInstall }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNav = (id) => { setActiveTab(id); setMoreOpen(false); };

  const primaryItems  = ALL_NAV_ITEMS.filter(i => MOBILE_PRIMARY.includes(i.id));
  const overflowItems = ALL_NAV_ITEMS.filter(i => !MOBILE_PRIMARY.includes(i.id));
  const isOverflowActive = overflowItems.some(i => i.id === activeTab);

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo" onClick={() => handleNav('dashboard')}>
            <div className="navbar-logo-icon">
              <div className="navbar-logo-icon-inner"><UtensilsCrossed size={20} /></div>
            </div>
            <div className="navbar-logo-text">
              <div className="navbar-logo-title">CalorieAI</div>
              <div className="navbar-logo-sub">Smart nutrition tracking</div>
            </div>
          </div>

          <nav className="navbar-nav">
            {ALL_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => handleNav(item.id)}
                  className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`} title={item.label}>
                  <Icon size={15} />
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && <span className="nav-ai-badge"><Sparkles size={9} />{item.badge}</span>}
                </button>
              );
            })}
          </nav>

          <div className="navbar-right">
            {canInstall && (
              <button onClick={onInstall} className="btn btn-secondary btn-sm navbar-install-btn">
                <Download size={15} /><span className="navbar-btn-label">Install</span>
              </button>
            )}
            <div className="navbar-user-pill">
              <span className="navbar-user-name">{currentUser?.name}</span>
              <span className="navbar-user-email">{currentUser?.email}</span>
            </div>
            <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
              <Plus size={15} /><span className="navbar-btn-label">Log Meal</span>
            </button>
            <button onClick={onLogout} className="btn btn-secondary btn-sm">
              <LogOut size={15} /><span className="navbar-btn-label">Logout</span>
            </button>
          </div>
        </div>

        {/* Tablet scrollable nav strip — 768–1023px */}
        <nav className="navbar-tablet">
          {ALL_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`navbar-tablet-item ${activeTab === item.id ? 'active' : ''}`}>
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-ai-badge"><Sparkles size={9} />{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Mobile bottom bar — below 768px */}
        <nav className="navbar-mobile">
          {canInstall && (
            <button onClick={onInstall} className="navbar-mobile-item">
              <Download size={20} /><span>Install</span>
            </button>
          )}
          {primaryItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`navbar-mobile-item ${activeTab === item.id ? 'active' : ''}`}>
                <Icon size={20} /><span>{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(v => !v)}
            className={`navbar-mobile-item ${isOverflowActive || moreOpen ? 'active' : ''}`}>
            <MoreHorizontal size={20} /><span>More</span>
          </button>
        </nav>
      </header>

      {/* Mobile "More" drawer */}
      {moreOpen && (
        <>
          <div className="mobile-drawer-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-handle" />
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">More</span>
              <button className="mobile-drawer-close" onClick={() => setMoreOpen(false)}><X size={18} /></button>
            </div>
            <div className="mobile-drawer-grid">
              {overflowItems.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => handleNav(item.id)}
                    className={`mobile-drawer-item ${activeTab === item.id ? 'active' : ''}`}>
                    <div className="mobile-drawer-item-icon"><Icon size={22} /></div>
                    <span>{item.label}</span>
                    {item.badge && <span className="nav-ai-badge"><Sparkles size={9} />{item.badge}</span>}
                  </button>
                );
              })}
            </div>
            <div className="mobile-drawer-footer">
              <div className="mobile-drawer-user">
                <User size={14} />
                <span className="mobile-drawer-user-name">{currentUser?.name}</span>
                <span className="mobile-drawer-email">{currentUser?.email}</span>
              </div>
              <div className="mobile-drawer-actions">
                <button onClick={() => { onOpenAddModal(); setMoreOpen(false); }} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <Plus size={14} /> Log Meal
                </button>
                <button onClick={() => { onLogout(); setMoreOpen(false); }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
