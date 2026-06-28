import { useEffect, useMemo, useState } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = import.meta.env.VITE_MQTT_BROKER_URL ?? 'ws://192.168.88.253:8083/mqtt';
const MQTT_TOPIC = import.meta.env.VITE_MQTT_STATUS_TOPIC ?? 'lab-weather/vibe';
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USER;
const MQTT_PASSWORD_RAW = import.meta.env.VITE_MQTT_PASS;
const CLIENT_ID_PREFIX = import.meta.env.VITE_MQTT_CLIENT_ID_PREFIX ?? 'vibe-client-';

const vibeImageByValue = {
    90: {
        label: 'A',
        src: '/vibe-a.png',
        alt: 'Vibe A',
    },
    100: {
        label: 'B',
        src: '/vibe-b.png',
        alt: 'Vibe B',
    },
    999: {
        label: 'C',
        src: '/vibe-c.png',
        alt: 'Vibe C',
    },
};

export default function VibePage() {
    const [lastValue, setLastValue] = useState(null);

    useEffect(() => {
        const clientId = `${CLIENT_ID_PREFIX}${Math.random().toString(16).substring(2, 8)}`;
        const cleanPassword = MQTT_PASSWORD_RAW.replace(/^"|"$/g, '');

        console.log('MQTT Password (Debug):', cleanPassword);

        const client = mqtt.connect(MQTT_BROKER, {
            clientId: clientId,
            username: MQTT_USERNAME,
            password: cleanPassword,
            protocol: 'ws',
            keepalive: 60,
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            clean: true,
        });

        client.on('connect', () => {
            console.log('MQTT connect:', clientId);
            client.subscribe(MQTT_TOPIC, (subscribeError) => {
                if (subscribeError) {
                    console.error('MQTT subscribe error:', subscribeError.message);
                }
            });
        });

        client.on('reconnect', () => {
            console.log('MQTT reconnect');
        });

        client.on('close', () => {
            console.log('MQTT close');
        });

        client.on('error', (clientError) => {
            console.error('MQTT client error:', clientError.message);
        });

        client.on('message', (_topic, payload) => {
            const parsed = Number(payload.toString().trim());
            if (!Number.isNaN(parsed)) {
                setLastValue(parsed);
            }
        });

        return () => {
            client.end(true);
        };
    }, []);

    const selectedImage = useMemo(() => {
        if (lastValue === null) return null;
        return vibeImageByValue[lastValue] ?? null;
    }, [lastValue]);

    return (
        <main className="w-screen h-screen bg-black overflow-hidden">
            {selectedImage && (
                <img
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="w-full h-full object-cover"
                />
            )}
        </main>
    );
}