import { useNavigate } from 'react-router-dom';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { TopAppBar } from '../components/layout/TopAppBar';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Icon } from '../components/ui/Icon';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <TopAppBar minimal />

      <main className="relative min-h-screen pt-24 pb-32 flex flex-col items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />

        <section className="relative z-10 flex w-full max-w-4xl flex-col items-center px-3 text-center sm:px-4 lg:px-6">
          <div className="mb-stack-gap-lg animate-floating">
            <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto glass-card rounded-2xl flex items-center justify-center border-primary/20 shadow-2xl shadow-primary/20">
              <Icon name="medical_services" className="text-[80px] md:text-[120px] text-primary" filled />
              <div className="absolute inset-0 border border-white/5 rounded-2xl animate-spin-slow" />
            </div>
          </div>

          <GlassCard className="w-full max-w-2xl p-6 sm:p-8 md:p-12">
            <div className="flex flex-col gap-stack-gap-md">
              <h1 className="text-3xl md:text-5xl font-bold text-on-surface leading-tight">
                Welcome to <span className="text-primary italic">EASEeHealth</span>
              </h1>
              <p className="text-base text-on-surface-variant max-w-lg mx-auto">
                The AI-powered decentralized healthcare platform. Secure, private, and patient-controlled medical records on the blockchain.
              </p>
            </div>

            <div className="mt-stack-gap-lg flex flex-col items-center justify-center gap-3 md:flex-row">
              <Button size="lg" onClick={() => navigate('/connect-wallet')}>
                Get Started
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/connect-wallet')}>
                Connect Wallet
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: 'encrypted', label: 'Encrypted' },
                { icon: 'verified_user', label: 'Patient-Controlled' },
                { icon: 'public', label: 'Decentralized' },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-1 opacity-60">
                  <Icon name={f.icon} className="text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest">{f.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <div className="relative z-10 mt-stack-gap-lg grid w-full max-w-5xl grid-cols-1 gap-4 px-3 sm:px-4 md:grid-cols-2 md:gap-6 lg:px-6">
          {[
            { icon: 'shield', title: 'Privacy-First Design', desc: 'Your medical data is encrypted and controlled only by you. Grant or revoke access to doctors at any time.' },
            { icon: 'link', title: 'Blockchain Security', desc: 'Immutable audit trails and consent records stored on-chain for transparency and trust.' },
          ].map((card) => (
            <GlassCard key={card.title} className="p-6 flex items-start gap-4" hover>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name={card.icon} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-on-surface mb-1">{card.title}</h3>
                <p className="text-sm text-on-surface-variant">{card.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </main>

      <footer className="w-full px-6 py-8 flex flex-col items-center gap-2 relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          © 2026 EASEeHealth
        </p>
      </footer>
    </div>
  );
}
