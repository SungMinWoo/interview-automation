import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectListPage from '@/pages/ProjectListPage';
import ProjectCreatePage from '@/pages/ProjectCreatePage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import AnalysisPage from '@/pages/AnalysisPage';
import QuestionnairePage from '@/pages/QuestionnairePage';
import DistributionPage from '@/pages/DistributionPage';
import ResponsesPage from '@/pages/ResponsesPage';
import ManualEntryPage from '@/pages/ManualEntryPage';
import AggregationPage from '@/pages/AggregationPage';
import DesignBriefPage from '@/pages/DesignBriefPage';
import SurveyPage from '@/pages/SurveyPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import ToolsPage from '@/pages/ToolsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public routes (redirect to dashboard if already logged in)
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // Public standalone (no auth check, no AppLayout)
  {
    path: '/survey/:token',
    element: <SurveyPage />,
  },
  {
    path: '/oauth/callback',
    element: <OAuthCallbackPage />,
  },

  // Protected routes with AppLayout
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/projects', element: <ProjectListPage /> },
          { path: '/projects/new', element: <ProjectCreatePage /> },
          { path: '/projects/:projectId', element: <ProjectDetailPage /> },
          { path: '/projects/:projectId/analysis', element: <AnalysisPage /> },
          { path: '/projects/:projectId/questionnaire', element: <QuestionnairePage /> },
          { path: '/projects/:projectId/distribution', element: <DistributionPage /> },
          { path: '/projects/:projectId/responses', element: <ResponsesPage /> },
          { path: '/projects/:projectId/responses/manual/:employeeId', element: <ManualEntryPage /> },
          { path: '/projects/:projectId/aggregation', element: <AggregationPage /> },
          { path: '/projects/:projectId/design-brief', element: <DesignBriefPage /> },
          { path: '/tools', element: <ToolsPage /> },
        ],
      },
    ],
  },

  // Catch-all 404
  { path: '*', element: <NotFoundPage /> },
]);
