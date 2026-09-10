import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import DashboardView from './views/DashboardView';
import { clearMealPhotoCache } from './services/mealPhotoCache';
import useInstallPrompt from './hooks/useInstallPrompt';

const AddMealModal = lazy(() => import('./components/AddMealModal'));
const AIScannerView = lazy(() => import('./views/AIScannerView'));
const CoachChatView = lazy(() => import('./views/CoachChatView'));
const NutritionProfileView = lazy(() => import('./views/NutritionProfileView'));
const MealLogView = lazy(() => import('./views/MealLogView'));
const AnalyticsView = lazy(() => import('./views/AnalyticsView'));
const InsightsView = lazy(() => import('./views/InsightsView'));
const KnowledgeView = lazy(() => import('./views/KnowledgeView'));
const PlannerView = lazy(() => import('./views/PlannerView'));

import {
  fetchDashboardStats,
  fetchMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  saveGoalSettings,
  clearAuthSession,
  fetchCurrentUser,
  logoutUser,
  getStoredToken,
  getStoredUser,
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [stats, setStats]             = useState(null);
  const [meals, setMeals]             = useState([]);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [isMealsLoading, setMealsLoading] = useState(false);
  const [mealLoadError, setMealLoadError] = useState('');
  const [isDashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [isModalOpen, setModalOpen]   = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const statsRes = await fetchDashboardStats();
      setStats(statsRes);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setDashboardError(e.response?.data?.error || 'Unable to load dashboard data.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadMeals = useCallback(async () => {
    setMealsLoading(true);
    setMealLoadError('');
    try {
      const mealsRes = await fetchMeals();
      setMeals(mealsRes.meals || []);
      setMealsLoaded(true);
    } catch (e) {
      console.error('Meal log load error:', e);
      setMealLoadError(e.response?.data?.error || 'Unable to load meal history.');
    } finally {
      setMealsLoading(false);
    }
  }, []);

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
        setAuthChecked(true);
        loadDashboard();
      } catch (error) {
        if (error.response?.status === 401) {
          clearAuthSession();
          setCurrentUser(null);
        } else {
          setDashboardError(error.response?.data?.error || 'The server is still starting. Please retry shortly.');
        }
      } finally {
        setAuthChecked(true);
      }
    };

    bootstrapAuth();
  }, [loadDashboard]);

  useEffect(() => {
    if (currentUser && activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [activeTab, currentUser, loadDashboard]);

  useEffect(() => {
    if (currentUser && activeTab === 'log') {
      loadMeals();
    }
  }, [activeTab, currentUser, loadMeals]);

  const handleAuthenticated = (user) => {
    setCurrentUser(user);
    setAuthChecked(true);
    loadDashboard();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.warn('Server logout failed; clearing the local session.', error);
    } finally {
      clearMealPhotoCache();
      clearAuthSession();
      setCurrentUser(null);
      setStats(null);
      setMeals([]);
      setMealsLoaded(false);
      setMealLoadError('');
      setModalOpen(false);
      setEditingMeal(null);
      setActiveTab('dashboard');
    }
  };

  if (!authChecked) {
    return <div className="auth-shell"><div className="glass-panel auth-card">Loading...</div></div>;
  }

  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const handleSaveMeal = async (data) => {
    if (editingMeal) {
      await updateMeal(editingMeal.id, data);
    } else {
      await createMeal(data);
    }
    clearMealPhotoCache();
    setModalOpen(false);
    setEditingMeal(null);
    await Promise.all([
      loadDashboard(),
      loadMeals(),
    ]);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this meal record?')) {
      try {
        await deleteMeal(id);
        clearMealPhotoCache();
        await Promise.all([loadDashboard(), loadMeals()]);
      }
      catch (e) { console.error('Delete error:', e); }
    }
  };

  const handleEdit = (meal) => { setEditingMeal(meal); setModalOpen(true); };
  const openAdd    = ()     => { setEditingMeal(null); setModalOpen(true); };
  const handleSaveGoals = async (goals) => {
    try {
      await saveGoalSettings(goals);
      await loadDashboard();
    } catch (error) {
      console.error('Save goals error:', error);
      throw error;
    }
  };

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
        onOpenAddModal={openAdd}
        currentUser={currentUser}
        onLogout={handleLogout}
        canInstall={canInstall}
        onInstall={handleInstall}
      />

      <main className="main-content">
        <Suspense fallback={<div className="glass-panel loading-panel">Loading view…</div>}>
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            isLoading={isDashboardLoading}
            error={dashboardError}
            onRetry={loadDashboard}
            onNavigate={setActiveTab}
            onOpenAddModal={openAdd}
          />
        )}
        {activeTab === 'scanner' && (
          <AIScannerView
            onSaveSuccess={() => {
              clearMealPhotoCache();
              return Promise.all([
                loadDashboard(),
                ...(mealsLoaded ? [loadMeals()] : []),
              ]);
            }}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'coach' && (
          <CoachChatView />
        )}
        {activeTab === 'profile' && (
          <NutritionProfileView
            onProfileSaved={loadDashboard}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsView />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeView />
        )}
        {activeTab === 'planner' && (
          <PlannerView />
        )}
        {activeTab === 'log' && (
          mealsLoaded
            ? <MealLogView meals={meals} onRefresh={loadMeals} onEditMeal={handleEdit} onDeleteMeal={handleDelete} onOpenAddModal={openAdd} />
            : mealLoadError
              ? (
                <div className="glass-panel loading-panel">
                  <span>{mealLoadError}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={loadMeals}>Retry</button>
                </div>
              )
              : <div className="glass-panel loading-panel">{isMealsLoading ? 'Loading meal history…' : 'Preparing meal history…'}</div>
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView stats={stats} />
        )}
        </Suspense>
      </main>

      <footer className="app-footer">
        CalorieAI &bull; React · Node.js
      </footer>

      {isModalOpen ? (
        <Suspense fallback={null}>
          <AddMealModal
            isOpen={isModalOpen}
            onClose={() => { setModalOpen(false); setEditingMeal(null); }}
            onSave={handleSaveMeal}
            initialData={editingMeal}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
