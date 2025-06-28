import { Routes, Route } from 'react-router-dom';
import Home from './scenes/home/Home';
import LoginPage from './scenes/login/LoginPage';
import CreateAccountPage from './scenes/login/CreateAccountPage';
import PasswordResetPage from './scenes/login/PassswordResetPage';
import ForgotPasswordPage from './scenes/login/ForgotPasswordPage';
import CheckYourEmailPage from './scenes/login/CheckYourEmailPage';
import SetNewPasswordPage from './scenes/login/SetNewPassword';
import Private from '@components/Private';
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route path="/check-email" element={<CheckYourEmailPage />} />
      <Route path="/set-new-password" element={<SetNewPasswordPage />} />

      <Route path="/403" element={<Error403 />} />
      <Route path="*" element={<Error404 />} />
    </Routes>
  );
};

export default App;
