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

  it('should not allow explicitly adding implicit flags', () => {
    // Flag `u` is not allowed due to `v`
    const flags = ['v', 'x', 'n', 'u'];
    flags.forEach(f => {
      expect(() => Regex.make(f)``).toThrow();
      expect(() => Regex.make(`i${f}m`)``).toThrow();
      expect(() => Regex.make({flags: f})``).toThrow();
    });
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

  it('should clean up superfluous token separators in output', () => {
    // JS returns '(?:)' for `RegExp('').source`, but '' would also be a fine result
    expect(['(?:)', '']).toContain(Regex.make`(?:)(?:)(?:)(?:)(?:)`.source);
  });
});
