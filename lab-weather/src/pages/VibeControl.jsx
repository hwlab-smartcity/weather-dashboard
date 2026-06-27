import { useEffect, useMemo, useState } from 'react';
import mqtt from 'mqtt';
import { AudioLines, Radio, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const FALLBACK_BROKER_URL = '192.168.88.253:1883';
const FALLBACK_TOPICS = ['vibe/sound/board1', 'vibe/sound/board2', 'vibe/sound/board3'];
const FALLBACK_STATUS_TOPIC = 'vibe/status/504';

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
    if (url.startsWith('ws://') || url.startsWith('wss://')) return url;
    return `ws://${url}`;
}

function parseEnvNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export default function VibeControl() {
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL || FALLBACK_BROKER_URL;
    const normalizedBrokerUrl = normalizeBrokerUrl(brokerUrl);
    const statusTopic = import.meta.env.VITE_MQTT_STATUS_TOPIC || FALLBACK_STATUS_TOPIC;
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

    const [status, setStatus] = useState('connecting');
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

    useEffect(() => {
        const client = mqtt.connect(normalizedBrokerUrl, {
            reconnectPeriod: 3000,
            connectTimeout: 10000,
            clean: true,
        });

        client.on('connect', () => {
            setStatus('connected');
            client.subscribe([...topics, statusTopic], { qos: 0 }, (err) => {
                if (err) {
                    setStatus('error');
                }
            });
        });

        client.on('reconnect', () => setStatus('reconnecting'));
        client.on('close', () => setStatus('disconnected'));
        client.on('error', () => setStatus('error'));

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
    }, [normalizedBrokerUrl, statusTopic, topics]);

    const statusTone =
        status === 'connected'
            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
            : 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    let thresholdLabel = 'ไม่ตรงกับ preset';
    if (thresholdInfo.value === thresholdPresets.meeting) thresholdLabel = 'ประชุม';
    if (thresholdInfo.value === thresholdPresets.study) thresholdLabel = 'เรียน';
    if (thresholdInfo.value === thresholdPresets.relax) thresholdLabel = 'relex';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 md:px-10">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">VIBE CONTROL</h1>
                        <p className="mt-2 text-slate-400">
                            Live microphone values from 3 MQTT topics
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusTone}`}>
                            {status === 'connected' ? <Radio size={16} /> : <WifiOff size={16} />}
                            <span>MQTT: {status.toUpperCase()}</span>
                        </div>
                        <Link
                            to="/"
                            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                        >
                            Back to Weather
                        </Link>
                    </div>
                </header>

                <section className="mb-6 rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-6 md:p-8">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Threshold Status</div>
                    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-6xl md:text-8xl font-black text-cyan-300 leading-none">
                                {thresholdInfo.value ?? '-'}
                            </div>
                            <div className="mt-2 text-2xl md:text-3xl font-bold text-cyan-100">โหมด: {thresholdLabel}</div>
                        </div>
                        <div className="text-sm text-cyan-100/80">
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

                    <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-cyan-100/90 md:grid-cols-3">
                        <div className="rounded-xl border border-cyan-400/20 bg-slate-900/40 p-3"><span className="font-bold">{thresholdPresets.meeting}</span> = ประชุม</div>
                        <div className="rounded-xl border border-cyan-400/20 bg-slate-900/40 p-3"><span className="font-bold">{thresholdPresets.study}</span> = เรียน</div>
                        <div className="rounded-xl border border-cyan-400/20 bg-slate-900/40 p-3"><span className="font-bold">{thresholdPresets.relax}</span> = relex</div>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {topics.map((topic, index) => {
                        const item = messages[topic] || { value: '-', raw: '', updatedAt: null };

                        return (
                            <article
                                key={topic}
                                className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 shadow-xl"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-bold tracking-wide text-slate-200">MIC {index + 1}</h2>
                                    <AudioLines className="text-cyan-300" size={22} />
                                </div>


                                <div className="mt-5 text-5xl font-black text-cyan-300">{item.value}</div>

                                <div className="mt-5 text-sm text-slate-400">
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
                                    <div className="mt-1 truncate text-xs text-slate-500">Raw: {item.raw || '-'}</div>
                                </div>
                            </article>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
