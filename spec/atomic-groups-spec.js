describe('atomic groups', () => {
  it('should not remember backtracking positions within atomic groups', () => {
    expect('abcc').toMatch(Regex.make`a(?>bc|b)c`);
    expect('abc').not.toMatch(Regex.make`a(?>bc|b)c`);
  });

  it('should allow nested atomic groups', () => {
    expect('integerrr+').toMatch(Regex.make`\b(?>int(?>eger+)?|insert)\b(?>.)`);
    expect('integerrr+').not.toMatch(Regex.make`\b(?>int(?>eger+)??|insert)\b(?>.)`);
  });

  it('should allow quantifying atomic groups', () => {
    expect('one two').toMatch(Regex.make`^(?>\w+\s?)+$`);
  });

  it('should not allow numbered backreferences in interpolated regexes when using atomic groups', () => {
    expect(() => Regex.make`(?>)${/()\1/}`).toThrow();
    expect(() => Regex.make`${/()\1/}(?>)`).toThrow();
    expect(() => Regex.make`(?>${/()\1/})`).toThrow();
    expect(() => Regex.make`(?>${/()/})`).not.toThrow();
    expect(() => Regex.make`(?>${/(?<n>)\k<n>/})`).not.toThrow();
  });
});
