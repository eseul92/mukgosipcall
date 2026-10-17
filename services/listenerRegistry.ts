// Firestore 실시간 구독을 한곳에서 일괄 해제할 수 있게 모아 둔다.
// 로그아웃은 Auth를 끊기 전에 구독부터 끊어야 permission-denied 오류가 나지 않는다.
// 로그아웃이 실패하면 구독을 되살릴 수 있도록 시작 함수를 같이 들고 있다.

type Unsubscribe = () => void;

type Entry = {
  start: () => Unsubscribe;
  stop: Unsubscribe | null;
};

const entries = new Set<Entry>();

/** 구독을 시작하고 등록한다. 반환값은 영구히 해제하면서 등록도 지운다. */
export function startTracked(start: () => Unsubscribe): Unsubscribe {
  const entry: Entry = { start, stop: start() };
  entries.add(entry);

  return () => {
    entries.delete(entry);
    entry.stop?.();
    entry.stop = null;
  };
}

/** 등록된 모든 구독을 멈춘다. 반환값을 부르면 멈춘 구독을 다시 시작한다. */
export function pauseAllListeners(): () => void {
  const paused = [...entries].filter((entry) => entry.stop !== null);
  for (const entry of paused) {
    entry.stop?.();
    entry.stop = null;
  }

  return () => {
    for (const entry of paused) {
      // 그 사이 영구히 해제된 구독은 되살리지 않는다.
      if (entries.has(entry) && entry.stop === null) entry.stop = entry.start();
    }
  };
}
