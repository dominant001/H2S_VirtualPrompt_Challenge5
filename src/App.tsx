/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LandingScreen } from './components/screens/LandingScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { BudgetStudioScreen } from './components/screens/BudgetStudioScreen';
import { ChecklistScreen } from './components/screens/ChecklistScreen';
import { TimelineScreen } from './components/screens/TimelineScreen';
import { VendorHubScreen } from './components/screens/VendorHubScreen';
import { InspirationStudioScreen } from './components/screens/InspirationStudioScreen';
import { TeamScreen } from './components/screens/TeamScreen';
import { MyEventsScreen } from './components/screens/MyEventsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

const MainRouter: React.FC = () => {
  const { currentTab } = useApp();

  switch (currentTab) {
    case 'landing':
      return <LandingScreen />;
    case 'dashboard':
      return <DashboardScreen />;
    case 'budget':
      return <BudgetStudioScreen />;
    case 'checklist':
      return <ChecklistScreen />;
    case 'timeline':
      return <TimelineScreen />;
    case 'vendors':
      return <VendorHubScreen />;
    case 'inspiration':
      return <InspirationStudioScreen />;
    case 'team':
      return <TeamScreen />;
    case 'events':
      return <MyEventsScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <DashboardScreen />;
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <AppLayout>
            <ErrorBoundary>
              <MainRouter />
            </ErrorBoundary>
          </AppLayout>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
