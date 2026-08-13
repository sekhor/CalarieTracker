import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AddMealModal from './components/AddMealModal';
import AuthScreen from './components/AuthScreen';
import DashboardView from './views/DashboardView';
import AIScannerView from './views/AIScannerView';
import CoachChatView from './views/CoachChatView';
import MealLogView from './views/MealLogView';
import AnalyticsView from './views/AnalyticsView';
import useInstallPrompt from './hooks/useInstallPrompt';

import {
  fetchDashboardStats,
  fetchMeals,
  fetchSettings,
  createMeal,
  updateMeal,
  deleteMeal,
  clearAuthSession,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [stats, setStats]             = useState(null);
  const [meals, setMeals]             = useState([]);
  const [settingsData, setSettings]   = useState(null);
  const [isModalOpen, setModalOpen]   = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  const loadAll = async () => {
    try {
      const [statsRes, mealsRes, settingsRes] = await Promise.all([
        fetchDashboardStats(),
        fetchMeals(),
        fetchSettings(),
      ]);
      setStats(statsRes);
      setMeals(mealsRes.meals || []);
      setSettings(settingsRes);

      // Seed sample meals on first empty launch
      // if ((!mealsRes.meals || mealsRes.meals.length === 0)) {
      //   await seedSamples();
      // }
    } catch (e) {
      console.error('Init load error:', e);
    }
  };

  const seedSamples = async () => {
    const samples = [
      { meal_name: 'Avocado Egg Toast', meal_type: 'Breakfast', calories: 380, protein_g: 16.5, carbs_g: 32, fat_g: 22, notes: 'Multigrain sourdough with organic eggs', logged_at: new Date().toISOString() },
      { meal_name: 'Grilled Salmon Bowl', meal_type: 'Lunch', calories: 590, protein_g: 44, carbs_g: 48, fat_g: 24, notes: 'Wild Atlantic salmon with brown rice and broccoli', logged_at: new Date().toISOString() },
      { meal_name: 'Greek Yogurt Parfait', meal_type: 'Snack', calories: 290, protein_g: 21, carbs_g: 39, fat_g: 5, notes: 'Non-fat Greek yogurt with blueberries and granola', logged_at: new Date().toISOString() },
    ];
    try {
      for (const s of samples) await createMeal(s);
      const [statsRes, mealsRes] = await Promise.all([fetchDashboardStats(), fetchMeals()]);
      setStats(statsRes);
      setMeals(mealsRes.meals || []);
    } catch (e) {
      console.warn('Seeding failed:', e);
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setAuthChecked(true);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        setCurrentUser(response.user);
        await loadAll();
      } catch (error) {
        clearAuthSession();
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    bootstrapAuth();
  }, []);

  const handleAuthenticated = async (user) => {
    setCurrentUser(user);
    setAuthChecked(true);
    await loadAll();
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setStats(null);
    setMeals([]);
    setSettings(null);
    setModalOpen(false);
    setEditingMeal(null);
    setActiveTab('dashboard');
  };

  if (!authChecked) {
    return <div className="auth-shell"><div className="glass-panel auth-card">Loading...</div></div>;
  }

  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const handleSaveMeal = async (data) => {
    try {
      if (editingMeal) await updateMeal(editingMeal.id, data);
      else await createMeal(data);
      setModalOpen(false);
      setEditingMeal(null);
      await loadAll();
    } catch (e) {
      console.error('Save meal error:', e);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this meal record?')) {
      try { await deleteMeal(id); await loadAll(); }
      catch (e) { console.error('Delete error:', e); }
    }
  };

  const handleEdit = (meal) => { setEditingMeal(meal); setModalOpen(true); };
  const openAdd    = ()     => { setEditingMeal(null); setModalOpen(true); };
  const handleInstall = async () => {
    try {
      await promptInstall();
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbStatus={settingsData?.database}
        onOpenAddModal={openAdd}
        currentUser={currentUser}
        onLogout={handleLogout}
        canInstall={canInstall}
        onInstall={handleInstall}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView stats={stats} onNavigate={setActiveTab} onOpenAddModal={openAdd} />
        )}
        {activeTab === 'scanner' && (
          <AIScannerView onSaveSuccess={loadAll} onNavigate={setActiveTab} />
        )}
        {activeTab === 'coach' && (
          <CoachChatView />
        )}
        {activeTab === 'log' && (
          <MealLogView meals={meals} onRefresh={loadAll} onEditMeal={handleEdit} onDeleteMeal={handleDelete} onOpenAddModal={openAdd} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView stats={stats} />
        )}
      </main>

      <footer className="app-footer">
        CalorieAI &bull; React · Node.js
      </footer>

      <AddMealModal
        isOpen={isModalOpen}
        onClose={() => { setModalOpen(false); setEditingMeal(null); }}
        onSave={handleSaveMeal}
        initialData={editingMeal}
      />
    </div>
  );
}
