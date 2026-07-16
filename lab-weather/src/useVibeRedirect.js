import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function useVibeRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = useRef(location.pathname);
    const redirectDisabled = new URLSearchParams(location.search).get('redirect') === 'false';
    const isRedirectScope = location.pathname.startsWith('/weather') || location.pathname.startsWith('/vibe');

    useEffect(() => {
        currentPath.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (redirectDisabled || !isRedirectScope) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            const isOnVibePage = currentPath.current.startsWith('/vibe');
            navigate(isOnVibePage ? '/weather' : '/vibe');
        }, 10000);

        return () => {
            clearInterval(intervalId);
        };
    }, [navigate, redirectDisabled, isRedirectScope]);
}