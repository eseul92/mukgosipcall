// 한국 가정식 레시피. 앱 안에서 재료와 비교해 요리를 추천할 때 쓴다.
// 추천이 잘 안 맞으면 여기서 요리를 더하거나 재료를 고친다.
//
// - description: 한 문장, 40자 이내
// - ingredients: 핵심 재료만. 소금, 간장, 설탕, 후추, 참기름, 식용유, 고춧가루,
//   다진 마늘, 된장, 고추장 같은 기본 양념은 항상 있다고 보고 넣지 않는다.
//   같은 재료의 다른 이름은 ingredientAliases.ts에서 한 묶음으로 처리한다.

export type Recipe = {
  name: string;
  description: string;
  ingredients: string[];
};

export const RECIPES: Recipe[] = [
  {
    name: '김치찌개',
    description: '잘 익은 김치와 돼지고기를 푹 끓인 얼큰한 찌개예요.',
    ingredients: ['김치', '돼지고기', '두부', '대파'],
  },
  {
    name: '된장찌개',
    description: '구수한 된장 국물에 두부와 채소를 넣고 끓여요.',
    ingredients: ['두부', '애호박', '양파', '감자'],
  },
  {
    name: '순두부찌개',
    description: '보들보들한 순두부에 계란을 풀어 얼큰하게 끓여요.',
    ingredients: ['순두부', '돼지고기', '계란', '대파'],
  },
  {
    name: '부대찌개',
    description: '햄과 소시지, 김치를 넣고 칼칼하게 끓여요.',
    ingredients: ['햄', '소시지', '김치', '두부'],
  },
  {
    name: '참치김치찌개',
    description: '참치캔을 넣어 감칠맛을 더한 김치찌개예요.',
    ingredients: ['김치', '참치', '두부', '양파'],
  },
  {
    name: '계란찜',
    description: '대파를 송송 썰어 넣고 부드럽게 쪄요.',
    ingredients: ['계란', '대파'],
  },
  {
    name: '계란말이',
    description: '당근과 대파를 다져 넣고 도톰하게 말아요.',
    ingredients: ['계란', '당근', '대파'],
  },
  {
    name: '김치볶음밥',
    description: '김치와 대파를 볶다가 밥을 넣고 계란을 올려요.',
    ingredients: ['김치', '밥', '대파', '계란'],
  },
  {
    name: '계란볶음밥',
    description: '파기름에 밥과 계란을 고슬고슬하게 볶아요.',
    ingredients: ['밥', '계란', '대파', '양파'],
  },
  {
    name: '두부김치',
    description: '볶은 김치를 따끈한 두부와 함께 곁들여요.',
    ingredients: ['두부', '김치', '돼지고기'],
  },
  {
    name: '제육볶음',
    description: '매콤달콤한 양념에 돼지고기와 양파를 볶아요.',
    ingredients: ['돼지고기', '양파', '대파'],
  },
  {
    name: '불고기',
    description: '달콤한 간장 양념에 소고기와 채소를 볶아요.',
    ingredients: ['소고기', '양파', '대파', '당근'],
  },
  {
    name: '소고기무국',
    description: '소고기와 무를 푹 끓인 맑고 시원한 국이에요.',
    ingredients: ['소고기', '무', '대파'],
  },
  {
    name: '미역국',
    description: '소고기와 미역을 참기름에 볶아 끓여요.',
    ingredients: ['미역', '소고기'],
  },
  {
    name: '콩나물국',
    description: '콩나물과 대파로 시원하게 끓여요.',
    ingredients: ['콩나물', '대파'],
  },
  {
    name: '북엇국',
    description: '북어와 무를 끓이고 계란을 풀어 속을 달래요.',
    ingredients: ['북어', '무', '계란', '대파'],
  },
  {
    name: '감자조림',
    description: '감자와 양파를 달짝지근한 간장 양념에 조려요.',
    ingredients: ['감자', '양파'],
  },
  {
    name: '감자채볶음',
    description: '채 썬 감자와 당근을 아삭하게 볶아요.',
    ingredients: ['감자', '당근', '양파'],
  },
  {
    name: '어묵볶음',
    description: '어묵과 채소를 간장 양념에 볶은 밑반찬이에요.',
    ingredients: ['어묵', '양파', '당근'],
  },
  {
    name: '멸치볶음',
    description: '멸치와 꽈리고추를 달콤짭짤하게 볶아요.',
    ingredients: ['멸치', '꽈리고추'],
  },
  {
    name: '오징어볶음',
    description: '오징어와 채소를 매콤한 양념에 센 불로 볶아요.',
    ingredients: ['오징어', '양파', '대파', '당근'],
  },
  {
    name: '닭볶음탕',
    description: '닭고기와 감자를 매콤하게 졸인 든든한 요리예요.',
    ingredients: ['닭고기', '감자', '당근', '양파', '대파'],
  },
  {
    name: '닭갈비',
    description: '닭고기와 양배추, 고구마를 매콤하게 볶아요.',
    ingredients: ['닭고기', '양배추', '고구마', '양파'],
  },
  {
    name: '잡채',
    description: '당면에 시금치와 채소를 넣고 고소하게 버무려요.',
    ingredients: ['당면', '시금치', '당근', '양파'],
  },
  {
    name: '시금치나물',
    description: '데친 시금치를 참기름에 조물조물 무쳐요.',
    ingredients: ['시금치', '대파'],
  },
  {
    name: '콩나물무침',
    description: '삶은 콩나물을 고소하게 무친 반찬이에요.',
    ingredients: ['콩나물', '대파'],
  },
  {
    name: '가지볶음',
    description: '부드러운 가지를 양파, 대파와 함께 볶아요.',
    ingredients: ['가지', '양파', '대파'],
  },
  {
    name: '애호박볶음',
    description: '애호박과 양파를 달달하게 볶은 반찬이에요.',
    ingredients: ['애호박', '양파'],
  },
  {
    name: '김치전',
    description: '김치를 송송 썰어 바삭하게 부쳐요.',
    ingredients: ['김치', '부침가루', '양파'],
  },
  {
    name: '파전',
    description: '대파를 듬뿍 넣고 계란을 둘러 바삭하게 부쳐요.',
    ingredients: ['대파', '부침가루', '계란'],
  },
  {
    name: '감자전',
    description: '간 감자를 노릇하게 부쳐 쫀득해요.',
    ingredients: ['감자', '양파'],
  },
  {
    name: '떡볶이',
    description: '쫀득한 떡과 어묵을 매콤달콤하게 끓여요.',
    ingredients: ['떡', '어묵', '대파'],
  },
  {
    name: '비빔밥',
    description: '나물과 계란을 밥 위에 올려 비벼 먹어요.',
    ingredients: ['밥', '시금치', '콩나물', '당근', '계란'],
  },
  {
    name: '김밥',
    description: '단무지와 계란, 당근을 넣고 돌돌 말아요.',
    ingredients: ['밥', '김', '단무지', '계란', '당근'],
  },
  {
    name: '오므라이스',
    description: '채소 볶음밥을 부드러운 계란으로 감싸요.',
    ingredients: ['밥', '계란', '양파', '당근', '햄'],
  },
  {
    name: '카레라이스',
    description: '감자와 당근, 고기를 카레와 끓여 밥에 얹어요.',
    ingredients: ['카레', '감자', '당근', '양파', '돼지고기'],
  },
  {
    name: '잔치국수',
    description: '따뜻한 멸치 국물에 소면과 고명을 올려요.',
    ingredients: ['소면', '애호박', '계란', '당근'],
  },
  {
    name: '떡국',
    description: '소고기 국물에 떡을 끓이고 계란을 얹어요.',
    ingredients: ['떡국떡', '소고기', '계란', '대파'],
  },
  {
    name: '삼겹살구이',
    description: '노릇하게 구운 삼겹살을 쌈채소에 싸 먹어요.',
    ingredients: ['삼겹살', '상추', '깻잎'],
  },
  {
    name: '고등어조림',
    description: '고등어와 무를 매콤한 양념에 푹 조려요.',
    ingredients: ['고등어', '무', '대파'],
  },
];
