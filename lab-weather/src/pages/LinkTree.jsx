import { Link } from 'react-router-dom';

const links = [
    {
        title: 'Weather',
        description: 'Open the lab weather monitor and live sensor overlay.',
        to: '/weather',
    },
    {
        title: 'Vibe',
        description: 'Open the microphone and threshold control page.',
        to: '/vibe',
    },
];

export default function LinkTree() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 md:px-10">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col justify-center">
                <div className="mb-10">
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Dashboard</p>
                    <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Link Tree</h1>
                    <p className="mt-4 max-w-2xl text-lg text-slate-400">
                        Choose one of the dashboard views below.
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-900"
                        >
                            <div className="text-sm uppercase tracking-[0.28em] text-slate-500">Open</div>
                            <div className="mt-4 text-3xl font-black tracking-tight text-white">
                                {link.title}
                            </div>
                            <p className="mt-3 text-slate-400">{link.description}</p>
                            <div className="mt-6 text-sm font-semibold text-cyan-300 transition group-hover:text-cyan-200">
                                Go to {link.to}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}