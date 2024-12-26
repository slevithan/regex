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
    if (envSupportsFlagD) {
      expect(regex('d')``.hasIndices).toBeTrue();
    }
  });

  it('should accept empty arguments', () => {
    expect(regex()``).toBeInstanceOf(RegExp);
    expect(regex(undefined)``).toBeInstanceOf(RegExp);
  });

  it('should implicitly add flag v or u', () => {
    // See also `backcompat-spec.js`
    if (envSupportsFlagV) {
      expect(regex``.flags).toContain('v');
      expect(regex``.unicodeSets).toBeTrue();
      expect(regex('g')``.unicodeSets).toBeTrue();
    } else {
      expect(regex``.flags).toContain('u');
      expect(regex``.unicode).toBeTrue();
      expect(regex('g')``.unicode).toBeTrue();
    }
  });

  it('should not allow explicitly adding implicit flags', () => {
    const flags = ['n', 'u', 'v', 'x'];
    flags.forEach(f => {
      expect(() => regex(f)``).toThrow();
      expect(() => regex(`i${f}m`)``).toThrow();
      expect(() => regex({flags: f})``).toThrow();
    });
  });

  it('should coerce non-string values in raw array', () => {
    expect('99aNaN').toMatch(regex({raw: ['^', 99, NaN, '$']}, '', 'a', ''));
  });

  it('should not allow unexpected arguments', () => {
    expect(() => regex([''])).toThrow();
    expect(() => regex({}, {raw: ['']})).toThrow();
  });

  it('should include the generated regex in the error if the RegExp constructor throws', () => {
    const values = [
      ['\\u', '\\u'],
      ['(?<a>.)\\g<a>|*', '(?<a>.)(?:.)|*'],
    ];
    values.forEach(([input, output]) => {
      expect(() => regex({raw: [input]})).toThrowMatching(err => err.message.includes(`/${output}/`));
      expect(() => regex({subclass: true})({raw: [input]})).toThrowMatching(err => err.message.includes(`/${output}/`));
    });
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
      if (!envSupportsFlagV) {
        expect('u').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      }
    });

    it('should allow removing the built-in unicodeSetsPlugin', () => {
      expect(() => regex({unicodeSetsPlugin: null, disable: {v: true}})`.`).not.toThrow();
      expect(() => regex({unicodeSetsPlugin: null, disable: {v: true}})`[[]]`).toThrow();
      // Don't escape lone double punctuators that aren't allowed to be escaped with flag u
      // See also `backcompat.spec.js`
      expect(() => regex({unicodeSetsPlugin: null, disable: {v: true}})`[>]`).not.toThrow();
    });

    it('should not use the unicodeSetsPlugin when flag v is used', () => {
      const plugin = str => str.replace(/v/g, 'u');
      if (envSupportsFlagV) {
        expect('v').toMatch(regex({unicodeSetsPlugin: plugin})`^v$`);
      } else {
        expect(() => regex({unicodeSetsPlugin: plugin, force: {v: true}})`^v$`).toThrow();
      }
    });

    it('should allow controlling implicit flag v via disable.v', () => {
      expect(regex({disable: {v: true}})``.unicodeSets).not.toBeTrue();
      if (envSupportsFlagV) {
        expect(regex({disable: {v: false}})``.unicodeSets).toBeTrue();
      } else {
        expect(regex({disable: {v: false}})``.unicodeSets).not.toBeTrue();
      }
    });

    it('should allow controlling implicit flag v via force.v', () => {
      if (envSupportsFlagV) {
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
        expect(regex({subclass: true})`(?<a>.)(?>(?<b>.))`.exec('ab')[1]).toBe('a');
        // String#replace: replacement string
        expect('ab'.replace(regex({subclass: true})`(?>(?<a>.))(?<b>.)`, '$2$1')).toBe('ba');
        // String#replace: replacement function
        expect('ab'.replace(regex({subclass: true})`(?>(?<a>.))(?<b>.)`, (_, $1, $2) => $2 + $1)).toBe('ba');
        // ## Documenting behavior when subclass is not used
        expect(regex({subclass: false})`(?>(?<a>.))(?<b>.)`.exec('ab')[2]).not.toBe('b');
        expect('ab'.replace(regex({subclass: false})`(?>(?<a>.))(?<b>.)`, '$2$1')).not.toBe('ba');
        expect('ab'.replace(regex({subclass: false})`(?>(?<a>.))(?<b>.)`, (_, $1, $2) => $2 + $1)).not.toBe('ba');
      });

      it('should adjust for emulation groups with methods that use an internal copy of the regex', () => {
        // String#matchAll
        expect([...'ab'.matchAll(regex({flags: 'g', subclass: true})`(?>(?<a>.))(?<b>.)`)][0][2]).toBe('b');
        // String#split
        expect('ab'.split(regex({subclass: true})`(?>(?<a>.))(?<b>.)`)).toEqual(['', 'a', 'b', '']);
        // ## Documenting behavior when subclass is not used
        expect([...'ab'.matchAll(regex({flags: 'g', subclass: false})`(?>(?<a>.))(?<b>.)`)][0][2]).not.toBe('b');
        expect('ab'.split(regex({subclass: false})`(?>(?<a>.))(?<b>.)`)).not.toEqual(['', 'a', 'b', '']);
      });

      it('should adjust indices with flag d for emulation groups', () => {
        if (!envSupportsFlagD) {
          pending('requires support for flag d (Node.js 16)');
        }
        expect(regex({flags: 'd', subclass: true})`(?>.)`.exec('a').indices).toHaveSize(1);
        // ## Documenting behavior when subclass is not used
        expect(regex({flags: 'd', subclass: false})`(?>.)`.exec('a').indices).toHaveSize(2);
      });

      it('should adjust for emulation groups with transfer', () => {
        const transferTo1 = `$1${emulationGroupMarker}`;
        expect(regex({subclass: true, disable: {n: true}})({raw: [
          `^(a)(${transferTo1}b)$`
        ]}).exec('ab')[1]).toBe('b');
        expect(regex({subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${transferTo1}b)$`
        ]}).exec('ab').groups.a).toBe('b');
        expect(regex({subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${transferTo1}b)(${transferTo1}c)$`
        ]}).exec('abc').groups.a).toBe('c');
        // ## Documenting behavior without transfer
        expect(regex({subclass: true, disable: {n: true}})({raw: [
          `^(a)(${emulationGroupMarker}b)$`
        ]}).exec('ab')[1]).toBe('a');
        expect(regex({subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${emulationGroupMarker}b)$`
        ]}).exec('ab').groups.a).toBe('a');
      });

      it('should adjust indices with flag d for emulation groups with transfer', () => {
        if (!envSupportsFlagD) {
          pending('requires support for flag d (Node.js 16)');
        }
        const transferTo1 = `$1${emulationGroupMarker}`;
        expect(regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(a)(${transferTo1}b)$`
        ]}).exec('ab').indices[1]).toEqual([1, 2]);
        expect(regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${transferTo1}b)$`
        ]}).exec('ab').indices.groups.a).toEqual([1, 2]);
        expect(regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${transferTo1}b)(${transferTo1}c)$`
        ]}).exec('abc').indices.groups.a).toEqual([2, 3]);
        // ## Documenting behavior without transfer
        expect(regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(a)(${emulationGroupMarker}b)$`
        ]}).exec('ab').indices[1]).toEqual([0, 1]);
        expect(regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(?<a>a)(${emulationGroupMarker}b)$`
        ]}).exec('ab').indices.groups.a).toEqual([0, 1]);
      });

      it('should adjust for emulation groups with transfer given emulation groups that adjust capture indices', () => {
        if (!envSupportsFlagD) {
          pending('requires support for flag d (Node.js 16)');
        }
        const egm = emulationGroupMarker;
        const transferTo1 = `$1${egm}`;
        const transferTo2 = `$2${egm}`;
        const match = regex({flags: 'd', subclass: true, disable: {n: true}})({raw: [
          `^(${egm}(${egm}.))(?<a>(${transferTo2}.))(${transferTo1}(${transferTo2}.))(?<b>.)$`
        ]}).exec('abcd');
        expect(match[1]).toBe('c');
        expect(match[2]).toBe('d');
        expect(match).toHaveSize(3);
        expect(match.indices[1]).toEqual([2, 3]);
        expect(match.indices[2]).toEqual([3, 4]);
        expect(match.indices).toHaveSize(3);
        expect(match.groups.a).toBe('c');
        expect(match.groups.b).toBe('d');
        expect(match.indices.groups.a).toEqual([2, 3]);
        expect(match.indices.groups.b).toEqual([3, 4]);
      });
    });
  });
});
