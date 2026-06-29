import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import mqtt from 'mqtt';

export default function useVibeRedirect() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = useRef(location.pathname);

    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://192.168.88.253:8083/mqtt';
    const statusTopic = import.meta.env.VITE_MQTT_STATUS_TOPIC || 'vibe/status/504';
    const mqttUser = import.meta.env.VITE_MQTT_USER?.trim() || '';
    const mqttPass = import.meta.env.VITE_MQTT_PASS?.trim() || '';
    const clientIdPrefix = import.meta.env.VITE_MQTT_CLIENT_ID_PREFIX || 'vibe_web';

    const mqttClientId = useMemo(() => {
        return `${clientIdPrefix}_redir_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    }, [clientIdPrefix]);

    useEffect(() => {
        currentPath.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (!mqttUser || !mqttPass) return;

        let normalizedUrl = brokerUrl.trim();
        if (normalizedUrl.startsWith('ws:')) {
            normalizedUrl = `ws://${normalizedUrl.slice(3).replace(/^\/\//, '')}`;
        } else if (normalizedUrl.startsWith('wss:')) {
            normalizedUrl = `wss://${normalizedUrl.slice(4).replace(/^\/\//, '')}`;
        } else if (!normalizedUrl.startsWith('ws://') && !normalizedUrl.startsWith('wss://')) {
            normalizedUrl = `ws://${normalizedUrl}`;
        }

        const client = mqtt.connect(normalizedUrl, {
            protocol: 'ws',
            reconnectPeriod: 5000,
            clientId: mqttClientId,
            username: mqttUser,
            password: mqttPass,
        });

        client.on('connect', () => {
            client.subscribe(statusTopic, { qos: 0 });
        });

        client.on('message', (topic, message, packet) => {
            if (packet.retain) {
                return;
            }

            if (topic === statusTopic && currentPath.current !== '/vibe') {
                const payload = message.toString().trim();

                if (payload) {
                    navigate('/vibe');
                }
            }
        });

        return () => {
            client.end(true);
        };
    }, [brokerUrl, mqttClientId, mqttPass, mqttUser, statusTopic, navigate]);
}