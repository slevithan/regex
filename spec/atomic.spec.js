describe('atomic groups', () => {
  it('should not remember backtracking positions within atomic groups', () => {
    expect('abc').not.toMatch(regex`^a(?>bc|b)c$`);
    expect('abcc').toMatch(regex`^a(?>bc|b)c$`);
    expect('aaaaaab').not.toMatch(regex`(?>a+)ab`);
    expect('aaaaaab').toMatch(regex`(?>a)+ab`);
  });

  it('should allow quantifying atomic groups', () => {
    expect('one two').toMatch(regex`^(?>\w+\s?)+$`);
  });

  it('should work for multiple atomic groups', () => {
    expect('ab').toMatch(regex`^(?>a)(?>b)$`);
  });

  it('should work for nested atomic groups', () => {
    expect('integerrr+').toMatch(regex`\b(?>int(?>eger+)?|insert)\b(?>.)`);
    expect('integerrr+').not.toMatch(regex`\b(?>int(?>eger+)??|insert)\b(?>.)`);
  });

  it('should work when followed by a literal digit', () => {
    expect('a0').toMatch(regex`^(?>a)0$`);
  });

  it('should work when named capturing groups present', () => {
    expect('abcc').toMatch(regex`^(?<n>)a(?>bc|b)c$`);
    expect('abc').not.toMatch(regex`^(?<n>)a(?>bc|b)c$`);
    expect('abcc').toMatch(regex`^a(?>(?<n>)bc|b)c$`);
    expect('abc').not.toMatch(regex`^a(?>(?<n>)bc|b)c$`);
  });

  it('should work when unnamed capturing groups present', () => {
    expect('abcc').toMatch(regex({disable: {n: true}})`^()a(?>bc|b)c$`);
    expect('abc').not.toMatch(regex({disable: {n: true}})`^()a(?>bc|b)c$`);
    expect('abcc').toMatch(regex({disable: {n: true}})`^a(?>()bc|b)c$`);
    expect('abc').not.toMatch(regex({disable: {n: true}})`^a(?>()bc|b)c$`);
  });

  it('should work when capturing groups present via interpolation', () => {
    expect('abcc').toMatch(regex`^${/()/}a(?>bc|b)c$`);
    expect('abc').not.toMatch(regex`^${/()/}a(?>bc|b)c$`);
    expect('abcc').toMatch(regex`^a(?>${/()/}bc|b)c$`);
    expect('abc').not.toMatch(regex`^a(?>${/()/}bc|b)c$`);
  });

  it('should adjust numbered backreferences when using atomic groups', () => {
    expect('aax').toMatch(regex`^${/(a)\1/}(?>x)$`);
    expect('xaa').toMatch(regex`^(?>x${/(a)\1/})$`);
    expect('xaa').toMatch(regex`^(?>x)${/(a)\1/}$`);
    expect('aaabababcabc').toMatch(regex({disable: {n: true}})`^(a)\1(?>\1(b)\1\2(?>\1\2))(c)\1\2\3$`);
  });

  it('should be invalid within character classes', () => {
    // Contains invalid unescaped chars for character classes, given flag v
    expect(() => regex`[(?>)]`).toThrow();
  });

  it('should handle atomic groups added by plugins', () => {
    const plugin = str => ({pattern: str.replace(/\$$/, '(?>b+)$')});
    expect('aabb').toMatch(regex({plugins: [plugin]})`^(?>a+)$`);
  });

  it('should allow controlling support via disable.atomic', () => {
    expect(() => regex({disable: {atomic: true}})`(?>)`).toThrow();
    expect(() => regex({disable: {atomic: false}})`(?>)`).not.toThrow();
  });
});

describe('possessive quantifiers', () => {
  it('should not remember backtracking positions for repeated tokens', () => {
    expect('aaa').not.toMatch(regex`^a++.$`);
    expect('aa1').toMatch(regex`^a++1$`);
    expect('aaa').not.toMatch(regex`^\u0061++.$`);
    expect('aa1').toMatch(regex`^\u0061++1$`);
  });

  it('should work for all quantifier types', () => {
    expect('a').toMatch(regex`^a?+$`);
    expect('a').toMatch(regex`^a*+$`);
    expect('a').toMatch(regex`^a++$`);
    expect('a').toMatch(regex`^a{1}+$`);
    expect('a').toMatch(regex`^a{1,}+$`);
    expect('a').toMatch(regex`^a{1,2}+$`);
  });

  it('should work for character classes', () => {
    expect('aaa').not.toMatch(regex`^[a-z]++.$`);
    expect('aa1').toMatch(regex`^[a-z]++1$`);
    expect('abb').not.toMatch(regex`^[a][\x62]++.$`);
    expect('ab1').toMatch(regex`^[a][\x62]++1$`);
    if (envSupportsFlagV) {
      expect('aaa').not.toMatch(regex`^[[a-z]--y]++.$`);
      expect('aa1').toMatch(regex`^[[a-z]--y]++1$`);
    }
  });

  it('should throw for unbalanced character classes', () => {
    expect(() => regex`]++`).toThrow();
    expect(() => regex`[]]++`).toThrow();
    expect(() => regex`[[]]]++`).toThrow();
  });

  it('should work for groups', () => {
    expect('aaa').not.toMatch(regex({disable: {n: true}})`^([a-z])++.$`);
    expect('aa1').toMatch(regex({disable: {n: true}})`^([a-z])++1$`);
    expect('aaa').not.toMatch(regex`^(?:[a-z])++.$`);
    expect('aa1').toMatch(regex`^(?:[a-z])++1$`);
    expect('aaa').not.toMatch(regex`^(?<name>[a-z])++.$`);
    expect('aa1').toMatch(regex`^(?<name>[a-z])++1$`);
    expect('aaa').not.toMatch(regex`^((a))++.$`);
    expect('aa1').toMatch(regex`^((a))++1$`);
    expect('aaaa1').toMatch(regex`^(a(a))++1$`);
  });

  it('should throw for unbalanced groups', () => {
    expect(() => regex`)++`).toThrow();
    expect(() => regex`(++`).toThrow();
  });

  it('should work for multiple possessive quantifiers', () => {
    expect('ab').toMatch(regex`^a++b++$`);
    expect('ab').toMatch(regex`^[a]++[b]++$`);
    expect('ab').toMatch(regex`^(a)++(b)++$`);
  });

  it('should work for nested possessive quantifiers', () => {
    expect('ababb').toMatch(regex`^(ab++)++$`);
    expect('ababb').toMatch(regex`^(a(b)++)++$`);
  });

  it('should not allow quantifying unquantifiable tokens', () => {
    expect(() => regex`(?=a)++`).toThrow();
    expect(() => regex`(?!a)++`).toThrow();
    expect(() => regex`(?<=a)++`).toThrow();
    expect(() => regex`(?<!a)++`).toThrow();
    expect(() => regex`(++)`).toThrow();
    expect(() => regex`|++`).toThrow();
  });

  it('should not allow adding + to a lazy quantifier', () => {
    expect(() => regex`a??+`).toThrow();
    expect(() => regex`a*?+`).toThrow();
    expect(() => regex`a+?+`).toThrow();
    expect(() => regex`a{2}?+`).toThrow();
  });

  it('should not allow adding + to a possessive quantifier', () => {
    expect(() => regex`a?++`).toThrow();
    expect(() => regex`a*++`).toThrow();
    expect(() => regex`a+++`).toThrow();
    expect(() => regex`a{2}++`).toThrow();
  });

  // Whitespace between quantifier chars: See `flag-x.spec.js`

  it('should be literal within character classes', () => {
    expect('*').toMatch(regex`^[.*+]$`);
  });

  it('should handle possessive quantifiers added by plugins', () => {
    const plugin = str => ({pattern: str.replace(/\$$/, 'b++$')});
    expect('aabb').toMatch(regex({plugins: [plugin]})`^a+$`);
  });

  it('should allow controlling support via disable.atomic', () => {
    expect(() => regex({disable: {atomic: true}})`.++`).toThrow();
    expect(() => regex({disable: {atomic: false}})`.++`).not.toThrow();
  });
});
