import React, { useState } from 'react';
import { OnboardingView } from './components/OnboardingView';
import { DashboardView } from './components/DashboardView';
import { PactoDetailView } from './components/PactoDetailView';
import { PactoWizardView } from './components/PactoWizardView';
import { CameraCaptureView } from './components/CameraCaptureView';
import { GroupView } from './components/GroupView';
import { JudgementCeremonyView } from './components/JudgementCeremonyView';
import { ProfileView } from './components/ProfileView';
import { usePactoStore } from './usePactoStore';

export default function App() {
  const { currentUser, setCurrentUser, pactos, addPacto } = usePactoStore();
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [activePactoId, setActivePactoId] = useState<string>('p1');

  if (!currentUser) {
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
          setCurrentRoute('home');
        }}
      />
    );
  }

  const selectedPacto = pactos.find((p) => p.id === activePactoId) || pactos[0];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F5F7]">
      {currentRoute === 'home' && (
        <DashboardView
          onCreatePactoClick={() => setCurrentRoute('pacto_nuevo')}
          onPactoSelect={(id) => {
            setActivePactoId(id);
            setCurrentRoute('pacto_detail');
          }}
          onGroupSelect={() => setCurrentRoute('grupo_detail')}
          onProfileClick={() => setCurrentRoute('perfil')}
        />
      )}

      {currentRoute === 'pacto_detail' && selectedPacto && (
        <PactoDetailView
          pacto={selectedPacto}
          onBack={() => setCurrentRoute('home')}
          onUploadEvidence={() => setCurrentRoute('evidencia_nueva')}
          onOpenJudgement={() => setCurrentRoute('juicio')}
        />
      )}

      {currentRoute === 'pacto_nuevo' && (
        <PactoWizardView
          groupId="g1"
          onClose={() => setCurrentRoute('home')}
          onPactoCreated={(newPacto) => {
            addPacto(newPacto);
            setActivePactoId(newPacto.id);
            setCurrentRoute('pacto_detail');
          }}
        />
      )}

      {currentRoute === 'evidencia_nueva' && (
        <CameraCaptureView
          onBack={() => setCurrentRoute('pacto_detail')}
          onCaptured={() => {
            setCurrentRoute('pacto_detail');
          }}
        />
      )}

      {currentRoute === 'grupo_detail' && (
        <GroupView groupId="g1" onBack={() => setCurrentRoute('home')} />
      )}

      {currentRoute === 'juicio' && selectedPacto && (
        <JudgementCeremonyView pacto={selectedPacto} onBack={() => setCurrentRoute('pacto_detail')} />
      )}

      {currentRoute === 'perfil' && (
        <ProfileView profile={currentUser} onBack={() => setCurrentRoute('home')} />
      )}
    </div>
  );
}
