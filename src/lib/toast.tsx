import React, { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'ok' | 'error';
interface Toast { id: number; msg: string; kind: Kind }

const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed top-3 left-0 right-0 z-[60] px-4 max-w-md mx-auto space-y-2 pointer-events-none" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-xl text-xs font-bold border shadow-xl pointer-events-auto ${
              t.kind === 'ok'
                ? 'bg-[#0d2b21] border-[#34D399] text-[#34D399]'
                : 'bg-[#2b1010] border-[#F87171] text-[#F87171]'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};
