import { FirebaseFamilyRepository } from './FirebaseFamilyRepository';
import type { RealtimeFamilyRepository } from './FamilyRepository';

export type {
  FamilyRepository,
  FamilyState,
  NewShoppingItem,
  RealtimeFamilyRepository,
  SendCallInput,
} from './FamilyRepository';

// 가족, 콜, 장보기, 재료는 Firebase. 가족이 없는 사용자의 재료만 더미(FirebaseFamilyRepository 안에서 위임).
export const familyRepository: RealtimeFamilyRepository = new FirebaseFamilyRepository();
