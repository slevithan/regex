describe('atomic groups', () => {
  it('should not remember backtracking positions within atomic groups', () => {
    expect('abc').not.toMatch(regex`^a(?>bc|b)c$`);
    expect('abcc').toMatch(regex`^a(?>bc|b)c$`);
    expect('aaaaaab').not.toMatch(regex`(?>a+)ab`);
    expect('aaaaaab').toMatch(regex`(?>a)+ab`);
  });

  it('should allow nested atomic groups', () => {
    expect('integerrr+').toMatch(regex`\b(?>int(?>eger+)?|insert)\b(?>.)`);
    expect('integerrr+').not.toMatch(regex`\b(?>int(?>eger+)??|insert)\b(?>.)`);
  });

  it('should allow quantifying atomic groups', () => {
    expect('one two').toMatch(regex`^(?>\w+\s?)+$`);
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
    const plugin = str => str.replace(/\$$/, '(?>b+)$');
    expect('aabb').toMatch(regex({plugins: [plugin]})`^(?>a+)$`);
  });

  it('should allow controlling support for atomic groups via disable.atomic', () => {
    expect(() => regex({disable: {atomic: true}})`(?>)`).toThrow();
    expect(() => regex({disable: {atomic: false}})`(?>)`).not.toThrow();
  });
});
