import { FirebaseFamilyRepository } from './FirebaseFamilyRepository';
import type { RealtimeFamilyRepository } from './FamilyRepository';

export type {
  FamilyRepository,
  FamilyState,
  RealtimeFamilyRepository,
  SendCallInput,
} from './FamilyRepository';

// 가족은 Firebase, 재료와 콜은 아직 더미(FirebaseFamilyRepository 안에서 위임).
export const familyRepository: RealtimeFamilyRepository = new FirebaseFamilyRepository();
