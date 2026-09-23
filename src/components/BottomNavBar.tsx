import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, PlusCircle, User } from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/home', label: 'Inicio', icon: Home },
    { path: '/grupo/g1', label: 'Grupo', icon: Users },
    { path: '/pacto/nuevo', label: 'Nuevo Pacto', icon: PlusCircle, highlight: true },
    { path: '/perfil', label: 'Perfil', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#12141D]/95 backdrop-blur-md border-t border-white/10 z-40 max-w-md mx-auto">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          if (item.highlight) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className="flex flex-col items-center justify-center p-2 text-[#FF5A1F] hover:text-[#FF5A1F]/80 focus-visible:ring-2 focus-visible:ring-[#FF5A1F] rounded-xl"
              >
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-extrabold mt-0.5">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition focus-visible:ring-2 focus-visible:ring-[#FF5A1F] ${
                isActive ? 'text-[#FF5A1F] font-extrabold' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
