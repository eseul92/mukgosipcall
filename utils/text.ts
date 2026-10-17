// 이모지처럼 두 칸을 차지하는 글자도 한 글자로 센다. 서버도 같은 방식으로 센다.
export const charCount = (text: string) => Array.from(text).length;

export const limitChars = (text: string, max: number) => Array.from(text).slice(0, max).join('');
