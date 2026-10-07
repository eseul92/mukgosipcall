import type {
  Call,
  Family,
  Ingredient,
  Member,
  Reply,
  User,
} from '../types/models';
import type { FamilyRepository, SendCallInput } from './FamilyRepository';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ME: User = { id: 'u-me', name: '나' };

const SEED_FAMILY: Family = {
  id: 'f-1',
  name: '우리 가족',
  inviteCode: '482916',
  ownerId: 'u-mom',
};

function seedMembers(): Member[] {
  return [
    { userId: 'u-mom', familyId: SEED_FAMILY.id, name: '엄마', role: 'owner' },
    { userId: 'u-dad', familyId: SEED_FAMILY.id, name: '아빠', role: 'member' },
    { userId: ME.id, familyId: SEED_FAMILY.id, name: ME.name, role: 'member' },
  ];
}

function seedIngredients(now: number): Ingredient[] {
  return ['계란', '김치', '대파', '밥', '두부'].map((name, i) => ({
    id: `i-seed-${i}`,
    name,
    addedBy: ME.id,
    createdAt: now - (i + 1) * DAY,
  }));
}

function seedCalls(now: number): Call[] {
  const familyId = SEED_FAMILY.id;
  return [
    {
      id: 'c-1',
      familyId,
      senderId: 'u-mom',
      menu: '김치찌개',
      mealType: '만들어줘',
      memo: '오늘 저녁',
      source: 'frequent',
      createdAt: now - 10 * MINUTE,
      responses: [],
    },
    {
      id: 'c-2',
      familyId,
      senderId: 'u-dad',
      menu: '라면',
      mealType: '시켜먹자',
      memo: '매운 걸로',
      source: 'frequent',
      createdAt: now - HOUR,
      responses: [],
    },
    {
      id: 'c-3',
      familyId,
      senderId: 'u-mom',
      menu: '계란말이',
      mealType: '만들어줘',
      source: 'custom',
      createdAt: now - 26 * HOUR,
      responses: [{ userId: 'u-dad', value: 'cook', createdAt: now - 25 * HOUR }],
    },
    {
      id: 'c-4',
      familyId,
      senderId: ME.id,
      menu: '떡볶이',
      mealType: '시켜먹자',
      source: 'frequent',
      createdAt: now - 2 * DAY - HOUR,
      responses: [
        { userId: 'u-mom', value: 'eatout', createdAt: now - 2 * DAY },
        { userId: 'u-dad', value: 'later', createdAt: now - 2 * DAY },
      ],
    },
    {
      id: 'c-5',
      familyId,
      senderId: 'u-dad',
      menu: '삼겹살',
      mealType: '사먹자',
      source: 'custom',
      createdAt: now - 3 * DAY - HOUR,
      responses: [{ userId: ME.id, value: 'eatout', createdAt: now - 3 * DAY }],
    },
  ];
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

const randomInviteCode = () => String(Math.floor(100000 + Math.random() * 900000));

// 메모리에만 저장하는 더미 구현. 앱을 다시 켜면 시드 데이터로 돌아간다.
export class DummyFamilyRepository implements FamilyRepository {
  private user = ME;
  private family: Family | null = SEED_FAMILY;
  private members = seedMembers();
  private ingredients = seedIngredients(Date.now());
  private calls = seedCalls(Date.now());

  async getCurrentUser() {
    return this.user;
  }

  async getFamily() {
    return this.family;
  }

  async listMembers() {
    const family = this.family;
    return family ? this.members.filter((m) => m.familyId === family.id) : [];
  }

  async listIngredients() {
    return [...this.ingredients];
  }

  async listCalls() {
    const family = this.family;
    if (!family) return [];
    return this.calls.filter((c) => c.familyId === family.id).sort((a, b) => b.createdAt - a.createdAt);
  }

  async createFamily(name: string) {
    const family: Family = {
      id: newId('f'),
      name: name.trim() || '우리 가족',
      inviteCode: randomInviteCode(),
      ownerId: this.user.id,
    };
    this.members = [
      ...this.members,
      { userId: this.user.id, familyId: family.id, name: this.user.name, role: 'owner' },
    ];
    this.family = family;
    return family;
  }

  async joinFamily(inviteCode: string) {
    if (!/^\d{6}$/.test(inviteCode)) {
      throw new Error('올바르지 않은 초대 코드예요');
    }
    // 더미: 6자리 코드면 어떤 값이든 시드 가족에 들어간다.
    const family = SEED_FAMILY;
    const joined = this.members.some((m) => m.familyId === family.id && m.userId === this.user.id);
    if (!joined) {
      this.members = [
        ...this.members,
        { userId: this.user.id, familyId: family.id, name: this.user.name, role: 'member' },
      ];
    }
    this.family = family;
    return family;
  }

  async leaveFamily() {
    const family = this.family;
    if (!family) return;
    this.members = this.members.filter(
      (m) => !(m.familyId === family.id && m.userId === this.user.id),
    );
    this.family = null;
  }

  async addIngredient(name: string) {
    const trimmed = name.trim();
    const existing = this.ingredients.find((i) => i.name === trimmed);
    if (existing) return existing;

    const ingredient: Ingredient = {
      id: newId('i'),
      name: trimmed,
      addedBy: this.user.id,
      createdAt: Date.now(),
    };
    this.ingredients = [...this.ingredients, ingredient];
    return ingredient;
  }

  async removeIngredient(ingredientId: string) {
    this.ingredients = this.ingredients.filter((i) => i.id !== ingredientId);
  }

  async sendCall(input: SendCallInput) {
    if (!this.family) throw new Error('가족과 연결해야 콜을 보낼 수 있어요');

    const call: Call = {
      id: newId('c'),
      familyId: this.family.id,
      senderId: this.user.id,
      menu: input.menu,
      mealType: input.mealType,
      memo: input.memo,
      source: input.source,
      createdAt: Date.now(),
      responses: [],
    };
    this.calls = [call, ...this.calls];
    return call;
  }

  async respondToCall(callId: string, value: Reply) {
    const target = this.calls.find((c) => c.id === callId && c.familyId === this.family?.id);
    if (!target) throw new Error('콜을 찾을 수 없어요');

    const updated: Call = {
      ...target,
      responses: [
        ...target.responses.filter((r) => r.userId !== this.user.id),
        { userId: this.user.id, value, createdAt: Date.now() },
      ],
    };
    this.calls = this.calls.map((c) => (c.id === callId ? updated : c));
    return updated;
  }
}
