import toastEmitter, { TOAST_EMITTER_KEY } from './toastEmitter';

export const handleAuthSuccess = (response, loginAuth, navigate, redirectTo = null) => {
    const { id, username, email, role, picture } = response.user;
    const payload = { id, username, email, role, picture };
    // Emit toast notification
    toastEmitter.emit(TOAST_EMITTER_KEY, 'Login successful');

    // Update authentication state
    loginAuth(payload);

    // Navigate to the appropriate page
    if (redirectTo) {
        navigate(redirectTo);
    } else {
        navigate('/');
    }
};
