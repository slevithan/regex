describe('make', () => {
  it('should accept a template', () => {
    expect(Regex.make``).toBeInstanceOf(RegExp);
    expect(Regex.make`.`).toBeInstanceOf(RegExp);
    expect(Regex.make`.`.source).toBe('.');
    expect('a').toMatch(Regex.make`.`);
  });

  it('should process templates as raw strings', () => {
    expect(Regex.make`\\`.source).toBe('\\\\');
    expect('a').toMatch(Regex.make`\w`);
  });

  it('should accept a flags string', () => {
    expect(Regex.make('')``.global).toBeFalse();
    expect(Regex.make('g')``.global).toBeTrue();
    expect(Regex.make('imgs')``.global).toBeTrue();
  });

  it('should accept empty arguments', () => {
    expect(Regex.make()``).toBeInstanceOf(RegExp);
    expect(Regex.make(undefined)``).toBeInstanceOf(RegExp);
  });

  it('should implicitly add flag v', () => {
    expect(Regex.make``.flags).toContain('v');
    expect(Regex.make``.unicodeSets).toBeTrue();
    expect(Regex.make('g')``.unicodeSets).toBeTrue();
  });

  it('should not allow explicitly adding flag v', () => {
    expect(() => Regex.make('v')``).toThrow();
    expect(() => Regex.make('ivm')``).toThrow();
    expect(() => Regex.make({flags: 'v'})``).toThrow();
  });

  it('should not allow explicitly adding flag u', () => {
    expect(() => Regex.make('u')``).toThrow();
    expect(() => Regex.make('ium')``).toThrow();
    expect(() => Regex.make({flags: 'u'})``).toThrow();
  });

  it('should allow binding to a RegExp subclass', () => {
    class SubRegExp extends RegExp {}
    expect(Regex.make.bind(SubRegExp)`a`).toBeInstanceOf(SubRegExp);
    expect('a').toMatch(Regex.make.bind(SubRegExp)`a`);
  });

  it('should allow binding to any constructor', () => {
    function fn(pattern, flags) {
      return new RegExp(pattern, flags);
    }
    expect(Regex.make.bind(fn)`a`).toBeInstanceOf(RegExp);
    expect('a').toMatch(Regex.make.bind(fn)`a`);
  });
});
