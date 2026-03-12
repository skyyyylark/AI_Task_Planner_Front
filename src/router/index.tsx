import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import BoardsPage from '../pages/BoardsPage'
import BoardPage from '../pages/BoardPage'
import ProtectedRoute from '../components/layout/ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/boards', element: <BoardsPage /> },
      { path: '/boards/:id', element: <BoardPage /> },
    ],
  },
  { path: '*', element: <LoginPage /> },
])