describe('make', () => {
  it('should accept a template', () => {
    expect(regex``).toBeInstanceOf(RegExp);
    expect(regex`.`).toBeInstanceOf(RegExp);
    expect(regex`.`.source).toBe('.');
    expect('a').toMatch(regex`.`);
  });

  it('should process templates as raw strings', () => {
    expect(regex`\\`.source).toBe('\\\\');
    expect('a').toMatch(regex`\w`);
  });

  it('should accept a flags string', () => {
    expect(regex('')``.global).toBeFalse();
    expect(regex('g')``.global).toBeTrue();
    expect(regex('imgs')``.global).toBeTrue();
  });

  it('should accept empty arguments', () => {
    expect(regex()``).toBeInstanceOf(RegExp);
    expect(regex(undefined)``).toBeInstanceOf(RegExp);
  });

  it('should implicitly add flag v', () => {
    expect(regex``.flags).toContain('v');
    expect(regex``.unicodeSets).toBeTrue();
    expect(regex('g')``.unicodeSets).toBeTrue();
  });

  it('should not allow explicitly adding implicit flags', () => {
    // Flag `u` is not allowed due to `v`
    const flags = ['v', 'x', 'n', 'u'];
    flags.forEach(f => {
      expect(() => regex(f)``).toThrow();
      expect(() => regex(`i${f}m`)``).toThrow();
      expect(() => regex({flags: f})``).toThrow();
    });
  });

  it('should allow binding to a RegExp subclass', () => {
    class SubRegExp extends RegExp {}
    expect(regex.bind(SubRegExp)`a`).toBeInstanceOf(SubRegExp);
    expect('a').toMatch(regex.bind(SubRegExp)`a`);
  });

  it('should allow binding to any constructor', () => {
    function fn(pattern, flags) {
      return new RegExp(pattern, flags);
    }
    expect(regex.bind(fn)`a`).toBeInstanceOf(RegExp);
    expect('a').toMatch(regex.bind(fn)`a`);
  });

  it('should clean up superfluous token separators in output', () => {
    // JS returns '(?:)' for `RegExp('').source`, but '' would also be a fine result
    expect(['(?:)', '']).toContain(regex`(?:)(?:)(?:)(?:)(?:)`.source);
  });
});
