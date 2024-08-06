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

    it('should allow swapping the built-in unicodeSetsPlugin', () => {
      const plugin = str => str.replace(/v/g, 'u');
      expect('u').toMatch(regex({unicodeSetsPlugin: plugin, disable: {v: true}})`^v$`);
      if (!flagVSupported) {
        expect('u').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      }
    });

    it('should allow removing the built-in unicodeSetsPlugin', () => {
      expect(() => regex({unicodeSetsPlugin: null, disable: {v: true}})`.`).not.toThrow();
      expect(() => regex({unicodeSetsPlugin: null, disable: {v: true}})`[[]]`).toThrow();
    });

    it('should not use the unicodeSetsPlugin when flag v is used', () => {
      const plugin = str => str.replace(/v/g, 'u');
      if (flagVSupported) {
        expect('v').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      } else {
        expect(() => regex({unicodeSetsPlugin: plugin, force: {v: true}})`^v$`).toThrow();
      }
    });

    it('should allow controlling implicit flag v via disable.v', () => {
      expect(regex({disable: {v: true}})``.unicodeSets).not.toBeTrue();
      if (flagVSupported) {
        expect(regex({disable: {v: false}})``.unicodeSets).toBeTrue();
      } else {
        expect(regex({disable: {v: false}})``.unicodeSets).not.toBeTrue();
      }
    });

    it('should allow controlling implicit flag v via force.v', () => {
      if (flagVSupported) {
        expect(regex({force: {v: true}, disable: {v: true}})``.unicodeSets).toBeTrue();
      } else {
        expect(() => regex({force: {v: true}})``).toThrow();
      }
    });

    // Option disable.x: See `flag-x.spec.js`
    // Option disable.n: See `flag-n.spec.js`
    // Option disable.atomic: See `atomic-groups.spec.js`
    // Option disable.subroutines: See `subroutines.spec.js`

    describe('subclass', () => {
      it('should adjust for emulation groups when referencing groups by number from outside the regex', () => {
        // RegExp#exec
        expect(regex({subclass: true})`(?>(?<a>.))(?<b>.)`.exec('ab')[2]).toBe('b');
        // String#replace: replacement string
        expect('ab'.replace(regex({subclass: true})`(?>(?<a>.))(?<b>.)`, '$2$1')).toBe('ba');
        // String#replace: replacement function
        expect('ab'.replace(regex({subclass: true})`(?>(?<a>.))(?<b>.)`, (_, $1, $2) => $2 + $1)).toBe('ba');

        // Documenting behavior when the option is not used
        expect(regex({subclass: false})`(?>(?<a>.))(?<b>.)`.exec('ab')[2]).not.toBe('b');
        expect('ab'.replace(regex({subclass: false})`(?>(?<a>.))(?<b>.)`, '$2$1')).not.toBe('ba');
        expect('ab'.replace(regex({subclass: false})`(?>(?<a>.))(?<b>.)`, (_, $1, $2) => $2 + $1)).not.toBe('ba');
      });

      it('should adjust for emulation groups with methods that use an internal copy of the regex', () => {
        // String#matchAll
        expect(Array.from('ab'.matchAll(regex({flags: 'g', subclass: true})`(?>(?<a>.))(?<b>.)`))[0][2]).toBe('b');
        // String#split
        expect('ab'.split(regex({subclass: true})`(?>(?<a>.))(?<b>.)`)).toEqual(['', 'a', 'b', '']);

        // Documenting behavior when the option is not used
        expect(Array.from('ab'.matchAll(regex({flags: 'g', subclass: false})`(?>(?<a>.))(?<b>.)`))[0][2]).not.toBe('b');
        expect('ab'.split(regex({subclass: false})`(?>(?<a>.))(?<b>.)`)).not.toEqual(['', 'a', 'b', '']);
      });
    });
  });
});
