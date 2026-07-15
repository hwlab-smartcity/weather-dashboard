import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function useVibeRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = useRef(location.pathname);

    useEffect(() => {
        currentPath.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const isOnVibePage = currentPath.current.startsWith('/vibe');
            navigate(isOnVibePage ? '/weather/' : '/vibe');
        }, 60000);

        return () => {
            clearInterval(intervalId);
        };
    }, [navigate]);
}