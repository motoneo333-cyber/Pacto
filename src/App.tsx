import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { OnboardingView } from './components/OnboardingView';
import { DashboardView } from './components/DashboardView';
import { PactoDetailView } from './components/PactoDetailView';
import { PactoWizardView } from './components/PactoWizardView';
import { CameraCaptureView } from './components/CameraCaptureView';
import { GroupView } from './components/GroupView';
import { JudgementCeremonyView } from './components/JudgementCeremonyView';
import { ProfileView } from './components/ProfileView';
import { BottomNavBar } from './components/BottomNavBar';
import { usePactoStore } from './usePactoStore';

function DashboardWrapper() {
  const navigate = useNavigate();
  return (
    <>
      <DashboardView
        onCreatePactoClick={() => navigate('/pacto/nuevo')}
        onPactoSelect={(id) => navigate(`/pacto/${id}`)}
        onGroupSelect={(id) => navigate(`/grupo/${id}`)}
        onProfileClick={() => navigate('/perfil')}
      />
      <BottomNavBar />
    </>
  );
}

function PactoDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pactos } = usePactoStore();
  const pacto = pactos.find((p) => p.id === id) || pactos[0];

  return (
    <>
      <PactoDetailView
        pacto={pacto}
        onBack={() => navigate('/home')}
        onUploadEvidence={() => navigate('/evidencia/nueva')}
        onOpenJudgement={() => navigate(`/juicio/${pacto.id}`)}
      />
      <BottomNavBar />
    </>
  );
}

function PactoWizardWrapper() {
  const navigate = useNavigate();
  const { addPacto, groups } = usePactoStore();
  const groupId = groups[0]?.id || 'g1';

  return (
    <PactoWizardView
      groupId={groupId}
      onClose={() => navigate('/home')}
      onPactoCreated={(newPacto) => {
        addPacto(newPacto);
        navigate(`/pacto/${newPacto.id}`);
      }}
    />
  );
}

function CameraCaptureWrapper() {
  const navigate = useNavigate();
  return (
    <CameraCaptureView
      onBack={() => navigate(-1)}
      onCaptured={() => navigate(-1)}
    />
  );
}

function JudgementCeremonyWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pactos } = usePactoStore();
  const pacto = pactos.find((p) => p.id === id) || pactos[0];

  return <JudgementCeremonyView pacto={pacto} onBack={() => navigate(`/pacto/${pacto.id}`)} />;
}

function GroupViewWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <>
      <GroupView groupId={id || 'g1'} onBack={() => navigate('/home')} />
      <BottomNavBar />
    </>
  );
}

function ProfileWrapper() {
  const navigate = useNavigate();
  const { currentUser } = usePactoStore();
  return (
    <>
      <ProfileView
        profile={currentUser || { id: 'u', username: 'guest', honor_points: 0, shame_count: 0, installed_pwa: false }}
        onBack={() => navigate('/home')}
      />
      <BottomNavBar />
    </>
  );
}

function OnboardingWrapper() {
  const navigate = useNavigate();
  const { setCurrentUser } = usePactoStore();

  return (
    <OnboardingView
      onLoginSuccess={(user) => {
        setCurrentUser({
          id: user.id,
          username: user.username,
          honor_points: 100,
          shame_count: 0,
          installed_pwa: true
        });
        navigate('/home');
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6]">
        <Routes>
          <Route path="/onboarding" element={<OnboardingWrapper />} />
          <Route path="/home" element={<DashboardWrapper />} />
          <Route path="/pacto/nuevo" element={<PactoWizardWrapper />} />
          <Route path="/pacto/:id" element={<PactoDetailWrapper />} />
          <Route path="/evidencia/nueva" element={<CameraCaptureWrapper />} />
          <Route path="/grupo/:id" element={<GroupViewWrapper />} />
          <Route path="/juicio/:id" element={<JudgementCeremonyWrapper />} />
          <Route path="/perfil" element={<ProfileWrapper />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
