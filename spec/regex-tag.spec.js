describe('regex', () => {
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
    expect(regex('i')``.ignoreCase).toBeTrue();
    expect(regex('m')``.multiline).toBeTrue();
    expect(regex('s')``.dotAll).toBeTrue();
    expect(regex('y')``.sticky).toBeTrue();
    if (flagDSupported) {
      expect(regex('d')``.hasIndices).toBeTrue();
    }
  });

  it('should accept empty arguments', () => {
    expect(regex()``).toBeInstanceOf(RegExp);
    expect(regex(undefined)``).toBeInstanceOf(RegExp);
  });

  it('should implicitly add flag v', () => {
    // See also `backcompat-spec.js`
    if (flagVSupported) {
      expect(regex``.flags).toContain('v');
      expect(regex``.unicodeSets).toBeTrue();
      expect(regex('g')``.unicodeSets).toBeTrue();
    } else {
      expect(regex``.flags).not.toContain('v');
    }
  });

  it('should not allow explicitly adding implicit flags', () => {
    const flags = ['v', 'x', 'n', 'u'];
    flags.forEach(f => {
      expect(() => regex(f)``).toThrow();
      expect(() => regex(`i${f}m`)``).toThrow();
      expect(() => regex({flags: f})``).toThrow();
    });
  });

  it('should coerce non-string values in raw array', () => {
    expect('1aNaN').toMatch(regex({raw: ['^', 1, NaN, '$']}, '', 'a', ''));
  });

  it('should allow binding to a RegExp subclass', () => {
    class SubRegExp extends RegExp {}
    expect(regex.bind(SubRegExp)`a`).toBeInstanceOf(SubRegExp);
    expect('a').toMatch(regex.bind(SubRegExp)`a`);
  });

  it('should allow binding to any constructor', () => {
    function fn(expression, flags) {
      return new RegExp(expression, flags);
    }
    expect(regex.bind(fn)`a`).toBeInstanceOf(RegExp);
    expect('a').toMatch(regex.bind(fn)`a`);
  });

  it('should not allow unexpected arguments', () => {
    expect(() => regex([''])).toThrow();
    expect(() => regex({}, {raw: ['']})).toThrow();
  });

  describe('options', () => {
    it('should allow setting flags via an option', () => {
      expect(regex({flags: ''})``.global).toBeFalse();
      expect(regex({flags: 'g'})``.global).toBeTrue();
      expect(regex({flags: 'imgs'})``.global).toBeTrue();
    });

    it('should allow adding plugins', () => {
      const wiggle = str => str.replace(/~/g, 'wiggle');
      const removeRepeatedChars = str => str.replace(/(\w)\1+/g, '$1');
      expect('wigle').toMatch(regex({plugins: [wiggle, removeRepeatedChars]})`^~$`);
    });

    it('should allow swapping the unicodeSetsPlugin', () => {
      const plugin = str => str.replace(/v/g, 'u');
      expect('u').toMatch(regex({unicodeSetsPlugin: plugin, disable: {v: true}})`^v$`);
      if (!flagVSupported) {
        expect('u').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      }
    });

    it('should not use the unicodeSetsPlugin when flag v is used', () => {
      const plugin = str => str.replace(/v/g, 'u');
      if (flagVSupported) {
        expect('v').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      } else {
        expect(() => regex({unicodeSetsPlugin: plugin, force: {v: true}})`^v$`).toThrow();
      }
    });

    it('should allow controlling the cleanup routine via disable.clean', () => {
      expect(regex({disable: {clean: true}})`(?:)(?:)(?:)`.source).toBe('(?:)(?:)(?:)');
      // JS returns '(?:)' for `new RegExp('').source`, but '' would also be a fine result
      const validResults = ['(?:)', ''];
      expect(validResults).toContain(regex({disable: {clean: false}})`(?:)(?:)(?:)`.source);
      expect(validResults).toContain(regex`(?:)(?:)(?:)`.source);
    });
  });
});
