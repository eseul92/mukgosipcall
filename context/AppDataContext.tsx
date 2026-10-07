import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { INITIAL_INGREDIENTS, RECENT_CALLS, RecentCall, Reply } from '../data/dummy';

type AppDataValue = {
  ingredients: string[];
  addIngredient: (name: string) => void;
  removeIngredient: (name: string) => void;
  calls: RecentCall[];
  addCall: (call: Omit<RecentCall, 'id' | 'time'>) => void;
  respondToCall: (callId: string, by: string, value: Reply) => void;
  hasFamily: boolean;
  joinFamily: () => void;
  leaveFamily: () => void;
};

const AppDataContext = createContext<AppDataValue | null>(null);

// Firebase 연결 전까지 메모리에만 저장한다.
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
  const [calls, setCalls] = useState(RECENT_CALLS);
  const [hasFamily, setHasFamily] = useState(true);
  const joinFamily = useCallback(() => setHasFamily(true), []);
  const leaveFamily = useCallback(() => setHasFamily(false), []);

  const addIngredient = useCallback(
    (name: string) => setIngredients((prev) => (prev.includes(name) ? prev : [...prev, name])),
    [],
  );
  const removeIngredient = useCallback(
    (name: string) => setIngredients((prev) => prev.filter((item) => item !== name)),
    [],
  );
  const addCall = useCallback(
    (call: Omit<RecentCall, 'id' | 'time'>) =>
      setCalls((prev) => [{ ...call, id: String(Date.now()), time: '방금 전' }, ...prev]),
    [],
  );

  // 같은 사람이 다시 응답하면 이전 응답을 바꾼다.
  const respondToCall = useCallback(
    (callId: string, by: string, value: Reply) =>
      setCalls((prev) =>
        prev.map((call) =>
          call.id === callId
            ? {
                ...call,
                responses: [...(call.responses ?? []).filter((r) => r.by !== by), { by, value }],
              }
            : call,
        ),
      ),
    [],
  );

  const value = useMemo(
    () => ({
      ingredients,
      addIngredient,
      removeIngredient,
      calls,
      addCall,
      respondToCall,
      hasFamily,
      joinFamily,
      leaveFamily,
    }),
    [
      ingredients,
      addIngredient,
      removeIngredient,
      calls,
      addCall,
      respondToCall,
      hasFamily,
      joinFamily,
      leaveFamily,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
