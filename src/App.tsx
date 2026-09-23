import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { OnboardingView } from './components/OnboardingView';
import { DashboardView } from './components/DashboardView';
import { PactoDetailView } from './components/PactoDetailView';
import { PactoWizardView } from './components/PactoWizardView';
import { CameraCaptureView } from './components/CameraCaptureView';
import { GroupView } from './components/GroupView';
import { JudgementCeremonyView } from './components/JudgementCeremonyView';
import { ProfileView } from './components/ProfileView';
import { BottomNavBar } from './components/BottomNavBar';
import { useSession } from './lib/session';
import { useToast } from './lib/toast';
import { api } from './lib/api';
import { useActiveGroup, usePacto, usePactos } from './lib/hooks';

const PENDING_CODE = 'pacto_pending_code';
const Splash = ({ text = 'Cargando…' }: { text?: string }) => (
  <div className="min-h-screen flex items-center justify-center text-gray-300 text-sm">{text}</div>
);

/** Con enlace de invitacion: guarda el codigo (sobrevive al login) y se une en cuanto hay sesion. */
function JoinRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { setActive } = useActiveGroup();

  useEffect(() => {
    const code = params.get('code');
    if (code) { try { localStorage.setItem(PENDING_CODE, code); } catch { /* sin storage */ } }
  }, [params]);

  useEffect(() => {
    let code: string | null = null;
    try { code = localStorage.getItem(PENDING_CODE); } catch { /* sin storage */ }
    if (!user || !code) { if (user) navigate('/grupo', { replace: true }); return; }
    api.joinGroup(code)
      .then(async (g) => { setActive(g.id); await qc.invalidateQueries({ queryKey: ['groups'] }); toast(`Te uniste a ${g.name}`); navigate(`/grupo/${g.id}`, { replace: true }); })
      .catch((e) => { toast(e.message, 'error'); navigate('/grupo', { replace: true }); })
      .finally(() => { try { localStorage.removeItem(PENDING_CODE); } catch { /* sin storage */ } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return <Splash text="Uniéndote al grupo…" />;
}

function DashboardWrapper() {
  const navigate = useNavigate();
  return (
    <>
      <DashboardView
        onCreatePactoClick={() => navigate('/pacto/nuevo')}
        onPactoSelect={(id) => navigate(`/pacto/${id}`)}
        onGroupSelect={(id) => navigate(id === 'nuevo' ? '/grupo/nuevo' : `/grupo/${id}`)}
        onProfileClick={() => navigate('/perfil')}
      />
      <BottomNavBar />
    </>
  );
}

/** Carga el pacto de la URL y muestra la vista; maneja carga y "no existe". */
function WithPacto({ children }: { children: (p: NonNullable<ReturnType<typeof usePacto>['data']>) => React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePacto(id);
  const navigate = useNavigate();
  if (isLoading) return <Splash />;
  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-3 text-sm text-gray-300">
      <p>Este pacto no existe o no eres parte de él.</p>
      <button onClick={() => navigate('/home')} className="bg-[#FF5A1F] text-white font-bold px-4 py-2.5 rounded-xl min-h-[44px]">Volver al inicio</button>
    </div>
  );
  return <>{children(data)}</>;
}

function PactoDetailWrapper() {
  const navigate = useNavigate();
  return (
    <WithPacto>
      {(pacto) => (
        <>
          <PactoDetailView pacto={pacto} onBack={() => navigate('/home')} onUploadEvidence={() => navigate(`/pacto/${pacto.id}/evidencia`)} onOpenJudgement={() => navigate(`/juicio/${pacto.id}`)} />
          <BottomNavBar />
        </>
      )}
    </WithPacto>
  );
}

function PactoWizardWrapper() {
  const navigate = useNavigate();
  const { active, isLoading } = useActiveGroup();
  if (isLoading) return <Splash />;
  if (!active) return <Navigate to="/grupo/nuevo" replace />;
  return <PactoWizardView groupId={active.id} onClose={() => navigate('/home')} onPactoCreated={(p) => navigate(`/pacto/${p.id}`)} />;
}

function CameraWrapper() {
  const navigate = useNavigate();
  const { sid } = useParams<{ sid?: string }>();
  return (
    <WithPacto>
      {(pacto) => <CameraCaptureView pacto={pacto} sentenceId={sid} onBack={() => navigate(-1)} onDone={() => navigate(sid ? `/juicio/${pacto.id}` : `/pacto/${pacto.id}`, { replace: true })} />}
    </WithPacto>
  );
}

/** Atajo de la PWA: lleva al primer pacto activo. */
function QuickEvidence() {
  const { data: pactos = [], isLoading } = usePactos();
  if (isLoading) return <Splash />;
  const first = pactos.find((p) => p.status === 'active');
  return <Navigate to={first ? `/pacto/${first.id}/evidencia` : '/home'} replace />;
}

function JudgementWrapper() {
  const navigate = useNavigate();
  return (
    <WithPacto>
      {(pacto) => <JudgementCeremonyView pacto={pacto} onBack={() => navigate(`/pacto/${pacto.id}`)} onSubmitSentenceEvidence={(sid) => navigate(`/pacto/${pacto.id}/sentencia/${sid}`)} />}
    </WithPacto>
  );
}

function GroupWrapper() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  return (
    <>
      <GroupView groupId={id} onBack={() => navigate('/home')} onGroupChosen={() => navigate('/home')} />
      <BottomNavBar />
    </>
  );
}

function ProfileWrapper() {
  const navigate = useNavigate();
  return (
    <>
      <ProfileView onBack={() => navigate('/home')} />
      <BottomNavBar />
    </>
  );
}

function AuthedRoutes() {
  return (
    <Routes>
      <Route path="/home" element={<DashboardWrapper />} />
      <Route path="/pacto/nuevo" element={<PactoWizardWrapper />} />
      <Route path="/pacto/:id" element={<PactoDetailWrapper />} />
      <Route path="/pacto/:id/evidencia" element={<CameraWrapper />} />
      <Route path="/pacto/:id/sentencia/:sid" element={<CameraWrapper />} />
      <Route path="/evidencia/nueva" element={<QuickEvidence />} />
      <Route path="/grupo" element={<GroupWrapper />} />
      <Route path="/grupo/unirse" element={<JoinRoute />} />
      <Route path="/grupo/:id" element={<GroupWrapper />} />
      <Route path="/juicio/:id" element={<JudgementWrapper />} />
      <Route path="/perfil" element={<ProfileWrapper />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

function Gate() {
  const { user, profile, loading } = useSession();
  // un enlace de invitacion abierto sin sesion: recordar el codigo antes de pedir login
  if (!user && window.location.pathname === '/grupo/unirse') {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) { try { localStorage.setItem(PENDING_CODE, code); } catch { /* sin storage */ } }
  }
  if (loading) return <Splash />;
  if (!user) return <OnboardingView />;
  if (!profile) return <Splash text="Preparando tu perfil…" />;
  return <AuthedRoutes />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6]">
        <Gate />
      </div>
    </BrowserRouter>
  );
}
