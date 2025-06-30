import { Routes, Route } from 'react-router-dom';
import Home from './scenes/home/Home';
import LoginPage from './scenes/login/LoginPage';
import CreateAccountPage from './scenes/login/CreateAccountPage';
import Sessions from './scenes/sessions/Sessions';
import MySessions from './scenes/sessions/MySessions';
import Logs from './scenes/logs/Logs';
import Private from '@components/Private';
import AdminRoute from '@components/AdminRoute/AdminRoute';
import HomePageTemplate from './templates/HomePageTemplate';

import { Error404 } from './scenes/errors/404';
import { Error403 } from './scenes/errors/403';

import { useState } from 'react';

const App = () => {
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  return (
    <Routes>
      <Route path="/" element={<Private Component={HomePageTemplate} />}>
        <Route index element={<Home />} />
        <Route path="sessions" element={<AdminRoute Component={Sessions} />} />
        <Route path="my-sessions" element={<MySessions />} />
        <Route 
          path="logs" 
          element={<AdminRoute Component={Logs} />} 
        />
      </Route>

      <Route path="/login" element={<LoginPage isAdmin={isAdminLogin} />} />
      <Route
        path="/signup"
        element={
          <CreateAccountPage
            isAdmin={isAdminLogin}
            setIsAdmin={setIsAdminLogin}
          />
        }
      />

      <Route path="/403" element={<Error403 />} />
      <Route path="*" element={<Error404 />} />
    </Routes>
  );
};

export default App;
