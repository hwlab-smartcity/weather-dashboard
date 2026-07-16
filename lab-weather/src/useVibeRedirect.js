import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function useVibeRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = useRef(location.pathname);
    const searchParams = new URLSearchParams(location.search);
    const redirectDisabled = searchParams.get('redirect') === 'false';
    const redirectTime = Number(searchParams.get('redirectTime') || 60000);
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
            navigate(isOnVibePage ? `/weather?redirectTime=${redirectTime}` : `/vibe?redirectTime=${redirectTime}`);
        }, redirectTime);

        return () => {
            clearInterval(intervalId);
        };
    }, [navigate, redirectDisabled, isRedirectScope, redirectTime]);
}