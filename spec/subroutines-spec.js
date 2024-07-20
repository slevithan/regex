describe('subroutines', () => {
  it('should match the expression within the referenced group', () => {
    expect('aa').toMatch(regex`^(?<n>a)\g<n>$`);
    expect('babab').toMatch(regex`^b(?<n>a)b\g<n>b$`);
  });

  it('should be quantified as an atomic unit', () => {
    expect('ababab').toMatch(regex`^(?<n>ab)\g<n>+$`);
    expect('ababb').not.toMatch(regex`^(?<n>ab)\g<n>+$`);
  });

  it('should allow a subroutine to come before the referenced group', () => {
    expect('aa').toMatch(regex`^\g<n>(?<n>a)$`);
  });

  it('should not allow referencing missing groups', () => {
    expect(() => regex`\g<n>`).toThrow();
  });

  it('should allow referencing groups that contain subroutines', () => {
    expect('ababa').toMatch(regex`^(?<a>a)(?<b>b\g<a>)\g<b>$`);
    expect('abcbcc').toMatch(regex`^(?<a>a\g<b>)(?<b>b\g<c>)(?<c>c)$`);
  });

  it('should not allow referencing groups recursively', () => {
    expect(() => regex`(?<a>\g<a>)`).toThrow();
    expect(() => regex`(?<a>\g<b>)(?<b>\g<a>)`).toThrow();
    expect(() => regex`(?<a>\g<b>)(?<b>\g<c>)(?<c>\g<a>)`).toThrow();
  });

  it('should allow referencing groups that contain named capture', () => {
    expect('abab').toMatch(regex`^(?<a>a(?<b>b))\g<a>$`);
  });

  it('should track independent captures when referencing groups that contain backreferences', () => {
    expect('aabb').toMatch(regex`^(?<n>(?<char>.)\k<char>)\g<n>$`);
  });

  it('should revert backreferences to their previous values after a subroutine call', () => {
    expect('abbaccb').toMatch(regex`^(?<a>a(?<b>.)\k<b>)\g<a>\k<b>$`);
    expect('abbaccc').not.toMatch(regex`^(?<a>a(?<b>.)\k<b>)\g<a>\k<b>$`);
  });

  it('should rewrite named and numbered backreferences as needed', () => {
    // Test the *output* to make sure each adjustment is precise and works correctly even in cases
    // where there are discrete backreferences that each match empty strings
    const cases = [
      [String.raw`()(?<a>\1)\g<a>`, String.raw`()(?<a>\1)(\1)`],
      [String.raw`()()()(?<a>\1\2)\g<a>\1\2\3\4\5\g<a>`, String.raw`()()()(?<a>\1\2)(\1\2)\1\2\3\4\6(\1\2)`],
      [String.raw`()(?<a>\1\2)\g<a>`, String.raw`()(?<a>\1\2)(\1\3)`],
      [String.raw`()()(?<a>\1\2\3)\g<a>`, String.raw`()()(?<a>\1\2\3)(\1\2\4)`],
      [String.raw`(?<a>\1)\g<a>`, String.raw`(?<a>\1)(\2)`],
      [String.raw`(?<a>()\1)\g<a>`, String.raw`(?<a>()\1)(()\3)`],
      [String.raw`(?<a>()\2)\g<a>`, String.raw`(?<a>()\2)(()\4)`],
      [String.raw`(?<a>)\g<a>\1`, String.raw`(?<a>)()\1`],
      [String.raw`(?<a>)\g<a>()\2`, String.raw`(?<a>)()()\3`],
      [String.raw`(?<a>)\g<a>\1\g<a>\1`, String.raw`(?<a>)()\1()\1`],
      [String.raw`(?<a>)\g<a>()\1\g<a>()\1`, String.raw`(?<a>)()()\1()()\1`],
      [String.raw`(?<a>)\g<a>()\2\g<a>()\3`, String.raw`(?<a>)()()\3()()\5`],
      [String.raw`\1\2\3(?<a>\1\2\3()\1\2\3)\1\2\3\g<a>\1\2\3()\1\2\3\g<a>\1\2\3()\1\2\3`, String.raw`\1\2\3(?<a>\1\2\3()\1\2\3)\1\2\3(\3\4\5()\3\4\5)\1\2\5()\1\2\5(\6\7\8()\6\7\8)\1\2\5()\1\2\5`],
      [String.raw`\g<a>(?<a>\1)`, String.raw`(\1)(?<a>\2)`],
      [String.raw`(?<a>\k<a>)\g<a>`, String.raw`(?<a>\k<a>)(\k<a>)`],
      [String.raw`\g<a>(?<a>\k<a>)`, String.raw`(\k<a>)(?<a>\k<a>)`],
      [String.raw`(?<a>(?<b>)\k<b>)\g<a>`, String.raw`(?<a>(?<b>)\k<b>)(()\4)`],
      [String.raw`\g<a>(?<a>(?<b>)\k<b>)`, String.raw`(()\2)(?<a>(?<b>)\k<b>)`],
    ];
    cases.forEach(([input, output]) => {
      expect(regex({__flagN: false})({raw: [input]}).source).toBe(output);
    });
  });

  it('should refer to the first group with name when duplicate capture names exist', () => {
    if (duplicateCaptureNamesSupported) {
      expect('aa ba bb'.match(regex('g')`(?<n>a)|(?<n>b)\g<n>`)).toEqual(['a', 'a', 'ba']);
      expect('aa ba bb'.match(regex('g')`(?<n>a)\g<n>|(?<n>b)`)).toEqual(['aa', 'b', 'b', 'b']);
      expect('aa ba bb'.match(regex('g')`(?<n>a)\g<n>|(?<n>b)\g<n>`)).toEqual(['aa', 'ba']);
      expect('b1 ab2ab1 ab2ab2'.match(regex('g')`(?<b>b1)|(?<n>a(?<b>b2))\g<n>`)).toEqual(['b1', 'b1', 'ab2ab2']);
      expect('b1 ab2b2ab2b2 ab2b1ab2b1'.match(regex('g')`(?<b>b1)|(?<n>a(?<b>b2)\g<b>)\g<n>`)).toEqual(['b1', 'ab2b1ab2b1']);
    }
  });

  it('should support specifying the group to match via interpolation', () => {
    expect('aa').toMatch(regex`^(?<n>a)\g<${'n'}>$`);
  });

  it('should not let interpolated > end the referenced group name', () => {
    expect(() => regex`^(?<n>a)\g<${'n>'}>$`).toThrow();
  });

  it('should not reference lookbehind', () => {
    expect(() => regex`(?<=n>)\g<=n>`).toThrow();
    expect(() => regex`(?<!n>)\g<!n>`).toThrow();
  });

  it('should support referencing a named capture added via interpolating a regex', () => {
    expect('aa').toMatch(regex`^${/(?<n>a)/}\g<n>$`);
    expect('abbb').toMatch(regex`^(?<a>a)${/(b)(?<n>\1)/}\g<n>$`);
  });

  it('should support atomic groups within the referenced group', () => {
    expect('aabaab').toMatch(regex`^(?<n>(?>a)+b)\g<n>$`);
  });

  it('should be an invalid escape within character classes', () => {
    expect(() => regex`(?<n>)[\g<n>]`).toThrow();
  });

  it('should handle subroutines added by postprocessors', () => {
    expect('aa').toMatch(regex({postprocessors: [p => p.replace(/\$$/, String.raw`\g<n>$`)]})`^(?<n>a)$`);
  });

  describe('DEFINE group', () => {
    it('should not have its groups appear on the groups object of matches', () => {
      expect(regex`\g<n>(?(DEFINE)(?<n>.))`.exec('a').groups).toBeUndefined();
      expect('n' in regex`(?<a>\g<n>)(?(DEFINE)(?<n>.))`.exec('a').groups).toBeFalse();
    });

    it('should not prevent groups outside of DEFINE from appearing on the groups object', () => {
      expect(regex`(?<a>\g<n>)(?(DEFINE)(?<n>.))`.exec('a').groups.a).toBe('a');
      // Property `a` is present, but its value is undefined
      expect('a' in regex`|(?<a>)(?(DEFINE))`.exec('a').groups).toBeTrue();
    });

    // Just documenting current behavior
    it('should not allow at positions other than the end of the regex', () => {
      expect(() => regex`(?(DEFINE)).`).toThrow();
      expect(() => regex`(?(DEFINE))$`).toThrow();
    });

    it('should allow trailing whitespace', () => {
      expect('').toMatch(regex`  (?(DEFINE))  `);
      expect('a').toMatch(regex` ^ \g<a> $ (?(DEFINE) (?<a> a ) ) `);
    });

    // Just documenting current behavior
    it('should not allow multiple DEFINE groups', () => {
      expect(() => regex`(?(DEFINE))(?(DEFINE))`).toThrow();
      expect(() => regex`(?(DEFINE)) . (?(DEFINE))`).toThrow();
    });

    it('should treat DEFINE as case sensitive', () => {
      expect(() => regex('i')`(?(define))`).toThrow();
      expect(() => regex('i')`(?(Define))`).toThrow();
    });

    it('should throw if unclosed', () => {
      expect(() => regex`(?(DEFINE)`).toThrow();
      expect(() => regex`(?(DEFINE)\)`).toThrow();
      expect(() => regex`(?(DEFINE)[)`).toThrow();
      expect(() => regex`(?(DEFINE)(?<a>)`).toThrow();
      expect(() => regex`(?(DEFINE)()`).toThrow();
    });

    describe('contents', () => {
      it('should allow an empty value', () => {
        expect('a').toMatch(regex`^.$(?(DEFINE))`);
        expect('a').toMatch(regex`^.$(?(DEFINE) )`);
        expect('a').toMatch(regex`^.$(?(DEFINE)
          # comment
        )`);
        expect('a').toMatch(regex`^.$(?(DEFINE)(?:))`);
      });

      // Just documenting current behavior; this probably shouldn't be relied on
      it('should allow unreferenced groups', () => {
        expect('a').toMatch(regex`^.$(?(DEFINE)(?<n>))`);
        expect('a').toMatch(regex`^.$(?(DEFINE)(?<n>x))`);
        expect('a').toMatch(regex`^\g<n>$(?(DEFINE)(?<n>.)(?<x>x))`);
      });

      it('should not allow duplicate group names', () => {
        expect(() => regex`(?(DEFINE)(?<a>)(?<a>))`).toThrow();
        expect(() => regex`(?(DEFINE)(?<a>)(?<b>(?<a>)))`).toThrow();
        expect(() => regex`(?<a>)(?(DEFINE)(?<a>))`).toThrow();
      });

      // `(?:)` separators can be added by the flag x preprocessor
      it('should not allow anything other than named groups, (?:), and whitespace', () => {
        expect(() => regex`(?(DEFINE)(?<a>)?)`).toThrow();
        expect(() => regex`(?(DEFINE)(?<a>).)`).toThrow();
        expect(() => regex`(?(DEFINE).(?<a>))`).toThrow();
        expect(() => regex`(?(DEFINE)[])`).toThrow();
        expect(() => regex`(?(DEFINE)\0)`).toThrow();
      });

      it('should allow whitespace and comments to separate groups', () => {
        expect('ab').toMatch(
          regex`
            ^ \g<a> \g<b> $

            (?(DEFINE)
              (?<a>a)
              # comment
              (?<b>b)
            )
          `
        );
      });
    });
  });
});
