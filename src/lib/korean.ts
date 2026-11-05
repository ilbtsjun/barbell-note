/** 받침에 맞는 조사: '으로/로', '은/는', '이/가', '을/를' */
export function josa(word: string, kind: '으로' | '은' | '이' | '을') {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const final = code >= 0 && code < 11172 ? code % 28 : 0;
  switch (kind) {
    case '으로':
      return word + (final && final !== 8 ? '으로' : '로'); // ㄹ 받침은 '로'
    case '은':
      return word + (final ? '은' : '는');
    case '이':
      return word + (final ? '이' : '가');
    case '을':
      return word + (final ? '을' : '를');
  }
}
