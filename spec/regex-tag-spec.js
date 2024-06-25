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
    expect(regex('d')``.hasIndices).toBeTrue();
    expect(regex('i')``.ignoreCase).toBeTrue();
    expect(regex('m')``.multiline).toBeTrue();
    expect(regex('s')``.dotAll).toBeTrue();
    expect(regex('y')``.sticky).toBeTrue();
  });

  it('should accept empty arguments', () => {
    expect(regex()``).toBeInstanceOf(RegExp);
    expect(regex(undefined)``).toBeInstanceOf(RegExp);
  });

  it('should implicitly add flag v when supported natively, else flag u', () => {
    if (flagVSupported) {
      expect(regex``.flags).toContain('v');
      expect(regex``.unicodeSets).toBeTrue();
      expect(regex('g')``.unicodeSets).toBeTrue();
    } else {
      expect(regex``.flags).toContain('u');
      expect(regex``.unicode).toBeTrue();
      expect(regex('g')``.unicode).toBeTrue();
    }
  });

  it('should implicitly add flag u when flag v disabled by an experimental option', () => {
    expect(regex({__flagV: false})``.unicode).toBeTrue();
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

  it('should follow flag v escaping rules, even when flag v not supported', () => {
    expect(() => regex({__flagV: false})`[(]`).toThrow();
    expect(() => regex({__flagV: false})`[)]`).toThrow();
    expect(() => regex({__flagV: false})`[[]`).toThrow();
    expect(() => regex({__flagV: false})`[]]`).toThrow();
    expect(() => regex({__flagV: false})`[[]]`).toThrow();

    const incompatibleEscapeChars = '&!#%,:;<=>@`~'.split('');
    incompatibleEscapeChars.forEach(char => {
      expect(char).toMatch(regex({__flagV: false})({raw: ['^[\\' + char + ']$']}));
    });

    const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~'.split('');
    doublePunctuatorChars.forEach(dp => {
      expect(dp).toMatch(regex({__flagV: false})({raw: ['^[a' + dp + 'b]$']}));
      if (dp !== '&') {
        expect(() => regex({__flagV: false})({raw: ['[a' + dp + dp + 'b]']})).toThrow();
      }
    });
    expect(() => regex({__flagV: false})`[a--b]`).toThrow();
    expect(() => regex({__flagV: false})`[a&&b]`).toThrow();
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
    function fn(pattern, flags) {
      return new RegExp(pattern, flags);
    }
    expect(regex.bind(fn)`a`).toBeInstanceOf(RegExp);
    expect('a').toMatch(regex.bind(fn)`a`);
  });

  it('should clean up superfluous token separators in output', () => {
    // JS returns '(?:)' for `new RegExp('').source`, but '' would also be a fine result
    expect(['(?:)', '']).toContain(regex`(?:)(?:)(?:)`.source);
  });

  it('should not remove superfluous token separators in output with an experimental option', () => {
    expect(regex({__rake: false})`(?:)(?:)(?:)`.source).toBe('(?:)(?:)(?:)');
  });

  it('should allow adding postprocessors', () => {
    const wiggle = pattern => pattern.replace(/~/g, 'wiggle');
    const removeDoubleChars = pattern => pattern.replace(/(\w)\1/g, '$1');
    expect('wigle').toMatch(regex({postprocessors: [wiggle, removeDoubleChars]})`^~$`);
  });

  it('should not allow unexpected arguments', () => {
    expect(() => regex([''])).toThrow();
    expect(() => regex({}, {raw: ['']})).toThrow();
  });
});
