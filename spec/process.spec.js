describe('processRegex', () => {
  function toRegExp(expression, options) {
    const result = processRegex(expression, options);
    return new RegExp(result.expression, result.flags);
  }

  it('should accept empty arguments', () => {
    expect(processRegex().expression).toBe('');
    expect(processRegex(undefined).expression).toBe('');
  });

  it('should coerce first argument to string', () => {
    expect(processRegex(null).expression).toBe('null');
    expect(processRegex(false).expression).toBe('false');
    expect(processRegex(10).expression).toBe('10');
  });

  it('should accept a string without options', () => {
    expect(processRegex('').expression).toBe('');
    expect(processRegex('.').expression).toBe('.');
  });

  describe('implicit flags', () => {
    it('should implicitly add flag v or u', () => {
      if (flagVSupported) {
        expect(processRegex('').flags).toContain('v');
        expect(processRegex('').flags).not.toContain('u');
      } else {
        expect(processRegex('').flags).toContain('u');
        expect(processRegex('').flags).not.toContain('v');
      }
    });

    it('should not allow explicitly adding implicit flags', () => {
      const flags = ['n', 'u', 'v', 'x'];
      flags.forEach(f => {
        expect(() => processRegex('', {flags: f})).toThrow();
      });
    });

    it('should process emulated flag x', () => {
      expect('aa').toMatch(toRegExp('^ a a $'));
    });

    it('should process emulated flag n', () => {
      expect(toRegExp('^(a)$').exec('a')).toHaveSize(1);
      expect(() => processRegex('^(a)\\1$')).toThrow();
    });
  });

  describe('extended syntax', () => {
    it('should process atomic groups', () => {
      expect('abc').not.toMatch(toRegExp('^a(?>bc|b)c$'));
      expect('abcc').toMatch(toRegExp('^a(?>bc|b)c$'));
    });

    it('should process possessive quantifiers', () => {
      expect('aaa').not.toMatch(toRegExp('^a++.$'));
      expect('aa1').toMatch(toRegExp('^a++1$'));
    });

    it('should process subroutines', () => {
      expect('aa').toMatch(toRegExp('^(?<n>a)\\g<n>$'));
    });

    it('should process subroutine definition groups', () => {
      expect(toRegExp('\\g<a>(?(DEFINE)(?<a>.))').exec('a').groups).toBeUndefined();
    });
  });

  describe('options', () => {
    it('should not allow enabling option subclass', () => {
      expect(() => processRegex('', {subclass: true})).toThrow();
    });

    it('should allow diabling implicit flags', () => {
      expect(' a a ').toMatch(toRegExp('^ a a $', {disable: {x: true}}));
      expect('aa').toMatch(toRegExp('^(a)\\1$', {disable: {n: true}}));
    });

    // More options: See `regex-tag.spec.js`
  });
});
