describe('rewrite', () => {
  function toRegExp(expression, options) {
    const result = rewrite(expression, options);
    return new RegExp(result.expression, result.flags);
  }

  it('should accept empty arguments', () => {
    expect(rewrite().expression).toBe('');
    expect(rewrite(undefined).expression).toBe('');
    expect(rewrite(undefined, undefined).expression).toBe('');
  });

  it('should coerce first argument to string', () => {
    expect(rewrite(null).expression).toBe('null');
    expect(rewrite(0).expression).toBe('0');
    expect(rewrite(99).expression).toBe('99');
    expect(rewrite(NaN).expression).toBe('NaN');
    expect(rewrite(true).expression).toBe('true');
    expect(rewrite(false).expression).toBe('false');
    expect(rewrite(/\./).expression).toBe('/\\./');
    expect(rewrite([]).expression).toBe('');
    expect(rewrite(['^']).expression).toBe('^');
    expect(rewrite({}, {disable: {x: true}}).expression).toBe('[object Object]');
  });

  it('should accept a string without options', () => {
    expect(rewrite('').expression).toBe('');
    expect(rewrite('.').expression).toBe('.');
  });

  describe('implicit flags', () => {
    it('should implicitly add flag v or u', () => {
      expect(rewrite('').flags).toContain(envSupportsFlagV ? 'v' : 'u');
      expect(rewrite('', {disable: {v: true}}).flags).toContain('u');
    });

    it('should not allow explicitly adding implicit flags', () => {
      const flags = ['n', 'u', 'v', 'x'];
      flags.forEach(f => {
        expect(() => rewrite('', {flags: f})).toThrow();
      });
    });

    it('should process emulated flag x', () => {
      expect('aa').toMatch(toRegExp('^ a a $'));
    });

    it('should process emulated flag n', () => {
      expect(toRegExp('^(a)$').exec('a')).toHaveSize(1);
      expect(() => rewrite('^(a)\\1$')).toThrow();
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
      expect(() => rewrite('', {subclass: true})).toThrow();
    });

    it('should allow diabling implicit flags', () => {
      expect(' a a ').toMatch(toRegExp('^ a a $', {disable: {x: true}}));
      expect('aa').toMatch(toRegExp('^(a)\\1$', {disable: {n: true}}));
    });

    // More options: See `regex-tag.spec.js`
  });
});
