import { Link } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer } from '../components/Layout'
import {
  BlurText,
  FadeInUp,
  AnimatedCard,
  GradientOrbs,
  AnimatedButton,
} from '../components/react-bits'

export default function Home() {
  return (
    <>
      <MetaBalls opacity={0.25} />
      <GradientOrbs />
      <PageContainer>
        <header className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            <BlurText text="Secure Notes & File Vault" wordByWord delay={0.1} />
          </h1>
          <FadeInUp delay={0.4} duration={0.6}>
            <p className="text-slate-400 text-base sm:text-lg">
              Privacy-first note sharing and secure file storage.
            </p>
          </FadeInUp>
        </header>

        <main className="space-y-6 sm:space-y-8">
          <FadeInUp delay={0.2}>
            <AnimatedCard className="p-4 sm:p-8" delay={0}>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                Anonymous Secure Notes
              </h2>
              <p className="text-slate-400 text-sm sm:text-base mb-4 sm:mb-6">
                Create and share notes instantly without login. Optional password and expiry supported.
              </p>
              <Link to="/create">
                <AnimatedButton className="w-full sm:w-auto">Create Anonymous Note</AnimatedButton>
              </Link>
            </AnimatedCard>
          </FadeInUp>

          <FadeInUp delay={0.35}>
            <AnimatedCard className="p-4 sm:p-8" delay={0}>
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">File Vault</h2>
              <p className="text-slate-400 text-sm sm:text-base mb-4 sm:mb-6">
                Upload and manage your files securely. Access only with your account.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link to="/login">
                  <AnimatedButton variant="secondary">Login</AnimatedButton>
                </Link>
                <Link to="/register">
                  <AnimatedButton>Register</AnimatedButton>
                </Link>
              </div>
            </AnimatedCard>
          </FadeInUp>
        </main>
      </PageContainer>
    </>
  )
}
