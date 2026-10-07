import { DummyFamilyRepository } from './DummyFamilyRepository';
import type { FamilyRepository } from './FamilyRepository';

export type { FamilyRepository, SendCallInput } from './FamilyRepository';

// Firebase 구현체가 생기면 이 한 줄만 바꾼다.
export const familyRepository: FamilyRepository = new DummyFamilyRepository();
