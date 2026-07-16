import { useEffect, useMemo, useState } from 'react';
import mqtt from 'mqtt';
import { AudioLines, Radio, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const FALLBACK_BROKER_URL = 'ws://192.168.88.253:8083/mqtt';
const FALLBACK_TOPICS = ['vibe/sound/board1', 'vibe/sound/board2', 'vibe/sound/board3'];
const FALLBACK_STATUS_TOPIC = 'vibe/status/504';
const FALLBACK_CLIENT_ID_PREFIX = 'vibe_web';

const FALLBACK_THRESHOLD_MEETING = 90;
const FALLBACK_THRESHOLD_STUDY = 100;
const FALLBACK_THRESHOLD_RELAX = 999;

function formatDisplayValue(rawText) {
    if (!rawText) return '-';

    try {
        const parsed = JSON.parse(rawText);
        if (typeof parsed === 'number' || typeof parsed === 'string') return String(parsed);

        if (parsed && typeof parsed === 'object') {
            if (parsed.value !== undefined) return String(parsed.value);
            if (parsed.level !== undefined) return String(parsed.level);
            if (parsed.db !== undefined) return String(parsed.db);
        }
    } catch {
        // Non-JSON payloads are shown directly.
    }

    return rawText;
}

function parseThresholdValue(rawText) {
    if (!rawText) return null;

    try {
        const parsed = JSON.parse(rawText);
        if (typeof parsed === 'number') return parsed;
        if (typeof parsed === 'string') {
            const parsedNumber = Number(parsed.trim());
            return Number.isNaN(parsedNumber) ? null : parsedNumber;
        }

        if (parsed && typeof parsed === 'object') {
            const candidate = parsed.threshold ?? parsed.value ?? parsed.status;
            const parsedNumber = Number(candidate);
            return Number.isNaN(parsedNumber) ? null : parsedNumber;
        }
    } catch {
        const parsedNumber = Number(rawText.trim());
        return Number.isNaN(parsedNumber) ? null : parsedNumber;
    }

    return null;
}

function normalizeBrokerUrl(url) {
    if (!url) return url;
    const normalized = url.trim();
    if (normalized.startsWith('ws://') || normalized.startsWith('wss://')) return normalized;
    if (normalized.startsWith('ws:')) {
        return `ws://${normalized.slice(3).replace(/^\/\//, '')}`;
    }
    if (normalized.startsWith('wss:')) {
        return `wss://${normalized.slice(4).replace(/^\/\//, '')}`;
    }
    return `ws://${normalized}`;
}

function parseEnvNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function createClientId(prefix) {
    const safePrefix = (prefix || FALLBACK_CLIENT_ID_PREFIX).trim() || FALLBACK_CLIENT_ID_PREFIX;
    const randomPart = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    return `${safePrefix}_${randomPart}`;
}

export default function VibeControl() {
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || FALLBACK_BROKER_URL;
    const normalizedBrokerUrl = normalizeBrokerUrl(brokerUrl);
    const statusTopic = import.meta.env.VITE_MQTT_STATUS_TOPIC || FALLBACK_STATUS_TOPIC;
    const mqttUser = import.meta.env.VITE_MQTT_USER?.trim() || '';
    const mqttPass = import.meta.env.VITE_MQTT_PASS?.trim() || '';
    const hasMqttCredentials = mqttUser.length > 0 && mqttPass.length > 0;
    const clientIdPrefix = import.meta.env.VITE_MQTT_CLIENT_ID_PREFIX || FALLBACK_CLIENT_ID_PREFIX;
    const mqttClientId = useMemo(() => createClientId(clientIdPrefix), [clientIdPrefix]);

    const topics = useMemo(
        () => [
            import.meta.env.VITE_MQTT_TOPIC_1 || FALLBACK_TOPICS[0],
            import.meta.env.VITE_MQTT_TOPIC_2 || FALLBACK_TOPICS[1],
            import.meta.env.VITE_MQTT_TOPIC_3 || FALLBACK_TOPICS[2],
        ],
        [],
    );

    const thresholdPresets = useMemo(
        () => ({
            meeting: parseEnvNumber(import.meta.env.VITE_THRESHOLD_MEETING, FALLBACK_THRESHOLD_MEETING),
            study: parseEnvNumber(import.meta.env.VITE_THRESHOLD_STUDY, FALLBACK_THRESHOLD_STUDY),
            relax: parseEnvNumber(import.meta.env.VITE_THRESHOLD_RELAX, FALLBACK_THRESHOLD_RELAX),
        }),
        [],
    );

    const [status, setStatus] = useState(hasMqttCredentials ? 'connecting' : 'error');
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [thresholdInfo, setThresholdInfo] = useState({
        value: null,
        updatedAt: null,
    });
    const [messages, setMessages] = useState(() =>
        topics.reduce((acc, topic) => {
            acc[topic] = { value: '-', raw: '', updatedAt: null };
            return acc;
        }, {}),
    );

    // นาฬิกาเพื่อคอยเช็คสถานะ Offline ของไมค์ (อัปเดตทุก 1 วินาที)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!hasMqttCredentials) {
            console.error('Missing MQTT credentials in env. Set VITE_MQTT_USER and VITE_MQTT_PASS.');
            return;
        }

        const connectOptions = {
            protocol: 'ws',
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            keepalive: 60,
            clean: true,
            clientId: mqttClientId,
            username: mqttUser,
            password: mqttPass,
        };

        const client = mqtt.connect(normalizedBrokerUrl, connectOptions);

        client.on('connect', () => {
            setStatus('connected');
            client.subscribe([...topics, statusTopic], { qos: 0 }, (err) => {
                if (err) {
                    console.error('MQTT subscribe error:', err);
                    setStatus('error');
                }
            });
        });

        client.on('reconnect', () => setStatus('reconnecting'));
        client.on('close', () => setStatus('disconnected'));
        client.on('error', (err) => {
            console.error('MQTT connection error:', err);
            setStatus('error');
        });

        client.on('message', (topic, payload) => {
            const raw = payload.toString('utf-8').trim();

            if (topic === statusTopic) {
                const parsedValue = parseThresholdValue(raw);
                setThresholdInfo({
                    value: parsedValue,
                    updatedAt: new Date(),
                });
                return;
            }

            setMessages((prev) => ({
                ...prev,
                [topic]: {
                    value: formatDisplayValue(raw),
                    raw,
                    updatedAt: new Date(),
                },
            }));
        });

        return () => {
            client.end(true);
        };
    }, [hasMqttCredentials, mqttClientId, mqttPass, mqttUser, normalizedBrokerUrl, statusTopic, topics]);

    const statusTone =
        status === 'connected'
            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
            : 'text-amber-300 bg-amber-500/10 border-amber-500/30';

    // เช็คค่า Threshold เพื่อกำหนดสีและข้อความ
    let thresholdLabel = 'Custom';
    let modeColorStyle = 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
    let modeSubTextStyle = 'text-cyan-100';

    if (thresholdInfo.value === thresholdPresets.meeting) {
        thresholdLabel = 'ประชุม';
        modeColorStyle = 'border-red-500/30 bg-red-500/10 text-red-400';
        modeSubTextStyle = 'text-red-100';
    } else if (thresholdInfo.value === thresholdPresets.study) {
        thresholdLabel = 'เรียน';
        modeColorStyle = 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
        modeSubTextStyle = 'text-yellow-100';
    } else if (thresholdInfo.value === thresholdPresets.relax) {
        thresholdLabel = 'พัก';
        modeColorStyle = 'border-green-500/30 bg-green-500/10 text-green-400';
        modeSubTextStyle = 'text-green-100';
    }

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
            <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
                <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6 md:py-6 xl:px-8 xl:py-7">
                    <div>
                        <h1 className="text-5xl md:text-7xl xl:text-8xl font-black tracking-tight leading-none">VIBE CONTROL</h1>
                        <p className="mt-3 text-base md:text-lg xl:text-xl text-slate-400">
                            Live microphone values from 3 MQTT topics
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                        <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 text-base font-semibold md:text-lg ${statusTone}`}>
                            {status === 'connected' ? <Radio size={20} /> : <WifiOff size={20} />}
                            <span>MQTT: {status.toUpperCase()}</span>
                        </div>

                    </div>
                </header>

                <section className={`rounded-3xl border p-6 md:p-8 xl:p-10 ${modeColorStyle}`}>
                    <div className="text-sm uppercase tracking-[0.32em] opacity-80 md:text-base">Current Mode</div>
                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-7xl md:text-[8rem] xl:text-[10rem] font-black leading-none">
                                {thresholdLabel}
                            </div>
                            <div className={`mt-3 text-3xl md:text-4xl xl:text-5xl font-bold ${modeSubTextStyle}`}>
                                Threshold: {thresholdInfo.value ?? '-'} dB
                            </div>
                        </div>
                        <div className="text-base md:text-lg xl:text-xl opacity-80">
                            <div className="mt-1">
                                Updated:{' '}
                                {thresholdInfo.updatedAt
                                    ? thresholdInfo.updatedAt.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    })
                                    : 'waiting for message'}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 text-base md:grid-cols-3 xl:text-lg">
                        <div className="rounded-2xl border border-current/20 bg-slate-900/40 p-4 md:p-5"><span className="font-bold">{thresholdPresets.meeting} dB</span> = ประชุม</div>
                        <div className="rounded-2xl border border-current/20 bg-slate-900/40 p-4 md:p-5"><span className="font-bold">{thresholdPresets.study} dB</span> = เรียน</div>
                        <div className="rounded-2xl border border-current/20 bg-slate-900/40 p-4 md:p-5"><span className="font-bold">{thresholdPresets.relax} dB</span> = พัก</div>
                    </div>
                </section>

                <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 md:grid-cols-3">
                    {topics.map((topic, index) => {
                        const item = messages[topic] || { value: '-', raw: '', updatedAt: null };

                        // คำนวณสถานะต่างๆ ของไมค์
                        const isWaiting = !item.updatedAt;
                        const isOffline = !isWaiting && (currentTime - item.updatedAt.getTime() > 3000);
                        const micValueNum = Number(item.value);
                        const isOverThreshold = !isNaN(micValueNum) && thresholdInfo.value !== null && micValueNum > thresholdInfo.value;

                        // กำหนดสีของค่าไมค์
                        let valueColor = 'text-cyan-300';
                        if (isOffline) {
                            valueColor = 'text-slate-500';
                        } else if (isOverThreshold) {
                            valueColor = 'text-red-500';
                        }

                        return (
                            <article
                                key={topic}
                                className={`flex h-full flex-col rounded-3xl border ${isOverThreshold && !isOffline ? 'border-red-500/50' : 'border-slate-800'} bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 shadow-xl transition-colors md:p-8 xl:p-10`}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-xl md:text-2xl xl:text-3xl font-bold tracking-wide text-slate-200">MIC {index + 1}</h2>
                                    <AudioLines className={isOverThreshold && !isOffline ? 'text-red-500' : 'text-cyan-300'} size={32} />
                                </div>

                                <div className={`mt-6 text-7xl md:text-[5.5rem] xl:text-[7rem] font-black ${valueColor}`}>
                                    {isOffline ? (
                                        'OFFLINE'
                                    ) : (
                                        item.value !== '-' ? `${item.value} dB` : '-'
                                    )}
                                </div>

                                <div className="mt-auto pt-6 text-sm md:text-base xl:text-lg text-slate-400">
                                    <div>
                                        Updated:{' '}
                                        {item.updatedAt
                                            ? item.updatedAt.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            })
                                            : 'waiting for message'}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

        </div>

    );
}