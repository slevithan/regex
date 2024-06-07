describe('atomic groups', () => {
  it('should not remember backtracking positions within atomic groups', () => {
    expect('abcc').toMatch(regex`a(?>bc|b)c`);
    expect('abc').not.toMatch(regex`a(?>bc|b)c`);
  });

  it('should work when named capturing groups present', () => {
    expect('abcc').toMatch(regex`(?<n>)a(?>bc|b)c`);
    expect('abc').not.toMatch(regex`(?<n>)a(?>bc|b)c`);
  });

  it('should work when unnamed capturing groups present', () => {
    expect('abcc').toMatch(regex({__flagN: false})`()a(?>bc|b)c`);
    expect('abc').not.toMatch(regex({__flagN: false})`()a(?>bc|b)c`);
  });

  it('should work when capturing groups present via interpolation', () => {
    expect('abcc').toMatch(regex`${/()/}a(?>bc|b)c`);
    expect('abc').not.toMatch(regex`${/()/}a(?>bc|b)c`);
  });

  it('should allow nested atomic groups', () => {
    expect('integerrr+').toMatch(regex`\b(?>int(?>eger+)?|insert)\b(?>.)`);
    expect('integerrr+').not.toMatch(regex`\b(?>int(?>eger+)??|insert)\b(?>.)`);
  });

  it('should allow quantifying atomic groups', () => {
    expect('one two').toMatch(regex`^(?>\w+\s?)+$`);
  });

  it('should not allow numbered backreferences in interpolated regexes when using atomic groups', () => {
    expect(() => regex`(?>)${/()\1/}`).toThrow();
    expect(() => regex`${/()\1/}(?>)`).toThrow();
    expect(() => regex`(?>${/()\1/})`).toThrow();
    expect(() => regex`(?>${/()/})`).not.toThrow();
    expect(() => regex`(?>${/(?<n>)\k<n>/})`).not.toThrow();
  });
});
