import React, { useState } from 'react';
import { OnboardingView } from './components/OnboardingView';
import { DashboardView } from './components/DashboardView';
import { PactoDetailView } from './components/PactoDetailView';
import { PactoWizardView } from './components/PactoWizardView';
import { CameraCaptureView } from './components/CameraCaptureView';
import { GroupView } from './components/GroupView';
import { JudgementCeremonyView } from './components/JudgementCeremonyView';
import { ProfileView } from './components/ProfileView';
import { Profile, Pacto } from './types/pacto';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>({
    id: 'user-demo-id',
    username: 'carlos_fit',
    honor_points: 120,
    shame_count: 1,
    installed_pwa: true
  });

  const [currentRoute, setCurrentRoute] = useState<string>('home'); // onboarding, home, pacto_detail, pacto_nuevo, evidencia_nueva, grupo_detail, juicio, perfil
  const [activePactoId, setActivePactoId] = useState<string>('p1');

  const [pactos, setPactos] = useState<Pacto[]>([
    {
      id: 'p1',
      group_id: 'g1',
      name: 'Ejercicio Matutino',
      emoji: '🏋️‍♂️',
      goal_type: 'habit',
      target_value: 5,
      frequency: 'daily',
      verification_type: 'strict_photo',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 86400000).toISOString()
    }
  ]);

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
          pactos={pactos}
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
            setPactos([newPacto, ...pactos]);
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
