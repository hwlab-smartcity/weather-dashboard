import { useEffect, useMemo, useState } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = import.meta.env.VITE_MQTT_BROKER_URL ?? 'wss://test.mosquitto.org:8081';
const MQTT_TOPIC = import.meta.env.VITE_MQTT_STATUS_TOPIC ?? 'lab-weather/vibe';

const vibeImageByValue = {
    90: {
        label: 'A',
        src: '/vibe-a.svg',
        alt: 'Vibe A',
    },
    100: {
        label: 'B',
        src: '/vibe-b.svg',
        alt: 'Vibe B',
    },
    999: {
        label: 'C',
        src: '/vibe-c.svg',
        alt: 'Vibe C',
    },
};

export default function VibePage() {
    const [lastValue, setLastValue] = useState(null);

    useEffect(() => {
        const client = mqtt.connect(MQTT_BROKER, {
            reconnectPeriod: 2000,
        });

        client.on('connect', () => {
            client.subscribe(MQTT_TOPIC, (subscribeError) => {
                if (subscribeError) {
                    console.error('MQTT subscribe error:', subscribeError.message);
                }
            });
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
