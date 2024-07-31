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

  it('should rewrite a collection of backreferences as needed', () => {
    // Testing output is not ideal because output could change without a change in meaning, but
    // this allows ensuring that each adjustment is precise and works correctly even in cases where
    // there are discrete backreferences that each match empty strings (which is necessarily true
    // when backreferencing a parent, nonparticipating, or not-yet-participating group).
    // The following list is tested with implicit flag n disabled, so we can test both named and
    // numbered captures and backreferences
    const cases = [
      // Non-nested subroutine, with backref that references within its parent group
      //   └ With the subroutine coming after its referenced group:
      [String.raw`(?<a>\k<a>)\g<a>`, String.raw`(?<a>\k<a>)(\2)`],
      [String.raw`(?<a>\1)\g<a>`, String.raw`(?<a>\1)(\2)`],
      [String.raw`(?<a>(?<b>\k<a>))\g<a>`, String.raw`(?<a>(?<b>\k<a>))((\3))`],
      [String.raw`(?<a>(\k<a>))\g<a>`, String.raw`(?<a>(\k<a>))((\3))`],
      [String.raw`(?<a>(?<b>\1))\g<a>`, String.raw`(?<a>(?<b>\1))((\3))`],
      [String.raw`(?<a>(\1))\g<a>`, String.raw`(?<a>(\1))((\3))`],
      [String.raw`(?<a>(?<b>)\k<a>)\g<a>`, String.raw`(?<a>(?<b>)\k<a>)(()\3)`],
      [String.raw`(?<a>()\k<a>)\g<a>`, String.raw`(?<a>()\k<a>)(()\3)`],
      [String.raw`(?<a>(?<b>)\1)\g<a>`, String.raw`(?<a>(?<b>)\1)(()\3)`],
      [String.raw`(?<a>()\1)\g<a>`, String.raw`(?<a>()\1)(()\3)`],
      [String.raw`(?<a>(?<b>)\k<b>)\g<a>`, String.raw`(?<a>(?<b>)\k<b>)(()\4)`],
      [String.raw`(?<a>(?<b>)\2)\g<a>`, String.raw`(?<a>(?<b>)\2)(()\4)`],
      [String.raw`(?<a>()\2)\g<a>`, String.raw`(?<a>()\2)(()\4)`],
      [String.raw`(?<a>(?<b>\k<b>))\g<a>`, String.raw`(?<a>(?<b>\k<b>))((\4))`],
      [String.raw`(?<a>(?<b>\2))\g<a>`, String.raw`(?<a>(?<b>\2))((\4))`],
      [String.raw`(?<a>(\2))\g<a>`, String.raw`(?<a>(\2))((\4))`],
      //   └ With the self-referencing group coming after other captures:
      [String.raw`()(?<a>()\2)\g<a>`, String.raw`()(?<a>()\2)(()\4)`],
      [String.raw`()(?<a>()\2)()\g<a>`, String.raw`()(?<a>()\2)()(()\5)`],
      //   └ With the subroutine coming before its referenced group:
      [String.raw`\g<a>(?<a>\k<a>)`, String.raw`(\1)(?<a>\k<a>)`],
      [String.raw`\g<a>(?<a>\1)`, String.raw`(\1)(?<a>\2)`],
      [String.raw`\g<a>()(?<a>\2)`, String.raw`(\1)()(?<a>\3)`],
      [String.raw`\g<a>\g<a>()(?<a>\2)`, String.raw`(\1)(\2)()(?<a>\4)`],
      [String.raw`\g<a>(?<a>()\2)`, String.raw`(()\2)(?<a>()\4)`],
      // Non-nested subroutine, with backref that references outside its parent group
      //   └ With the subroutine coming after its referenced group:
      [String.raw`()(?<a>\1)\g<a>`, String.raw`()(?<a>\1)(\1)`],
      [String.raw`()(?<a>()\1)()\g<a>`, String.raw`()(?<a>()\1)()(()\1)`],
      [String.raw`(?<a>()\3)()\g<a>`, String.raw`(?<a>()\3)()(()\3)`],
      [String.raw`(?<a>()\3)\g<a>()`, String.raw`(?<a>()\5)(()\5)()`],
      //   └ With the subroutine coming before its referenced group:
      [String.raw`\g<a>()(?<a>\1)`, String.raw`(\2)()(?<a>\2)`],
      [String.raw`\g<a>(?<a>\2)()`, String.raw`(\3)(?<a>\3)()`],
      // Non-nested subroutine, with mixed references to inside and outside its parent group
      [String.raw`()(?<a>\1\2)\g<a>`, String.raw`()(?<a>\1\2)(\1\3)`],
      [String.raw`()()(?<a>\1\2\3)\g<a>`, String.raw`()()(?<a>\1\2\3)(\1\2\4)`],
      [String.raw`(?<a>\1\2\3())\g<a>()`, String.raw`(?<a>\1\2\5())(\3\4\5())()`],
      [String.raw`\1\2\3(?<a>\1\2\3()\1\2\3)\1\2\3\g<a>\1\2\3()\1\2\3\g<a>\1\2\3()\1\2\3`, String.raw`\1\2\5(?<a>\1\2\5()\1\2\5)\1\2\5(\3\4\5()\3\4\5)\1\2\5()\1\2\5(\6\7\5()\6\7\5)\1\2\5()\1\2\5`],
      // Nested subroutine, with backref that references within its parent group
      //   └ With the subroutine coming after its referenced group:
      [String.raw`(?<a>(?<b>)\k<b>)\g<a>`, String.raw`(?<a>(?<b>)\k<b>)(()\4)`],
      [String.raw`(?<a>\1)(?<b>\g<a>)\g<b>`, String.raw`(?<a>\1)(?<b>(\3))((\5))`],
      [String.raw`(?<a>()\2)(?<b>\g<a>)\g<b>`, String.raw`(?<a>()\2)(?<b>(()\5))((()\8))`],
      [String.raw`(?<a>\g<b>)(?<b>\2)\g<a>`, String.raw`(?<a>(\2))(?<b>\3)((\5))`],
      //   └ With the subroutine coming before its referenced group:
      [String.raw`\g<a>(?<a>(?<b>)\k<b>)`, String.raw`(()\2)(?<a>(?<b>)\k<b>)`],
      // Nested subroutine, with backref that references outside its parent group
      [String.raw`()(?<a>\1)(?<b>\g<a>)\g<b>`, String.raw`()(?<a>\1)(?<b>(\1))((\1))`],
      [String.raw`(?<a>\3)(?<b>\g<a>)\g<b>()`, String.raw`(?<a>\6)(?<b>(\6))((\6))()`],
      // Nested subroutine, with mixed references to inside and outside its parent group
      [String.raw`(?<a>(?<b>\k<a>\k<b>))\g<a>\g<b>`, String.raw`(?<a>(?<b>\k<a>\k<b>))((\3\4))(\k<a>\5)`],
      [String.raw`(?<a>(?<b>(?<c>\k<a>\k<b>\k<c>)))\g<a>\g<b>\g<c>`, String.raw`(?<a>(?<b>(?<c>\k<a>\k<b>\k<c>)))(((\4\5\6)))((\k<a>\7\8))(\k<a>\k<b>\9)`],
      [String.raw`(?<a>(?<b>\k<a>\k<b>\k<c>))\g<a>\g<b>\g<c>(?<c>)`, String.raw`(?<a>(?<b>\k<a>\k<b>\k<c>))((\3\4\k<c>))(\k<a>\5\k<c>)()(?<c>)`],
      // Standalone backref, not used within a subroutine-referenced group
      [String.raw`(?<a>)\g<a>\1`, String.raw`(?<a>)()\1`],
      [String.raw`(?<a>)\g<a>()\2`, String.raw`(?<a>)()()\3`],
      [String.raw`(?<a>)\g<a>\1\g<a>\1`, String.raw`(?<a>)()\1()\1`],
      [String.raw`(?<a>)\g<a>()\1\g<a>()\1`, String.raw`(?<a>)()()\1()()\1`],
      [String.raw`(?<a>)\g<a>()\2\g<a>()\3`, String.raw`(?<a>)()()\3()()\5`],
    ];
    cases.forEach(([input, output]) => {
      expect(regex({__flagN: false, __extendSyntax: true})({raw: [input]}).source).toBe(output);
    });
  });

  it('should throw with out-of-bounds numbered backreferences', () => {
    const cases = [
      String.raw`(?<a>)\g<a>\2`,
      String.raw`(?<a>)\g<a>\2\g<a>`,
      String.raw`(?<a>()\3)\g<a>`,
    ];
    cases.forEach(input => {
      expect(() => regex({__flagN: false, __extendSyntax: true})({raw: [input]})).toThrow();
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

  it('should handle subroutines added by plugins', () => {
    const plugin = str => str.replace(/\$$/, '\\g<n>$');
    expect('aa').toMatch(regex({plugins: [plugin]})`^(?<n>a)$`);
  });
});

describe('definition groups', () => {
  it('should not have its groups appear on the groups object of matches', () => {
    expect(regex`\g<a>(?(DEFINE)(?<a>.))`.exec('a').groups).toBeUndefined();
    expect('b' in regex`(?<a>\g<b>)(?(DEFINE)(?<b>.))`.exec('a').groups).toBeFalse();
  });

  // Follows PCRE
  it('should not have its nested groups appear on the groups object of matches', () => {
    expect(regex`\g<a>(?(DEFINE)(?<a>(?<b>.)))`.exec('a').groups).toBeUndefined();
    expect('c' in regex`(?<a>\g<b>)(?(DEFINE)(?<b>(?<c>.)))`.exec('a').groups).toBeFalse();
  });

  it('should not prevent groups outside of definition groups from appearing on the groups object', () => {
    expect(regex`(?<a>\g<b>)(?(DEFINE)(?<b>.))`.exec('a').groups.a).toBe('a');
    // Property `a` is present, but its value is `undefined`
    expect('a' in regex`|(?<a>)(?(DEFINE))`.exec('a').groups).toBeTrue();
  });

  it('should not allow at positions other than the end of the regex', () => {
    expect(() => regex`(?(DEFINE)).`).toThrow();
    expect(() => regex`(?(DEFINE))$`).toThrow();
  });

  it('should allow trailing whitespace and comments', () => {
    expect('').toMatch(regex`(?(DEFINE)) `);
    expect('a').toMatch(regex`
      ^\g<a>$
      (?(DEFINE)(?<a>a))
      # comment
    `);
  });

  it('should not allow trailing whitespace or comments with flag x disabled', () => {
    expect(() => regex({__flagX: false})`(?(DEFINE)) `).toThrow();
    expect(() => regex({__flagX: false})`
      ^\g<a>$
      (?(DEFINE)(?<a>a))
      # comment
    `).toThrow();
  });

  it('should not allow multiple definition groups', () => {
    expect(() => regex`(?(DEFINE))(?(DEFINE))`).toThrow();
    expect(() => regex`(?(DEFINE)) . (?(DEFINE))`).toThrow();
  });

  it('should require DEFINE to use uppercase', () => {
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

  // In PCRE, this is valid but can never match (due to different rules than JS for backrefs to
  // nonparticipating capturing groups)
  it('should not allow backreferences to groups within definition groups', () => {
    expect(() => regex`\k<a>(?(DEFINE)(?<a>))`).toThrow();
  });

  // In PCRE, this is valid but can never match (due to different rules than JS for backrefs to
  // nonparticipating capturing groups)
  it('should not allow referencing groups with backreferences to independent top-level groups within definition groups', () => {
    expect(() => regex`\g<a>(?(DEFINE)(?<a>\k<b>)(?<b>))`).toThrow();
    expect(() => regex`\g<a>(?(DEFINE)(?<a>\k<c>)(?<b>(?<c>)))`).toThrow();
  });

  it('should allow referencing groups with backreferences to non-independent groups within definition groups', () => {
    expect('bba').toMatch(regex`^\g<a>$(?(DEFINE)(?<a>(?<b>\k<a>b)\k<b>a))`);
    expect('ba').toMatch(regex`^\g<b>\g<a>$(?(DEFINE)(?<a>\k<a>a)(?<b>b))`);
    expect('ba').toMatch(regex({__flagN: false, __extendSyntax: true})`^\g<b>\g<a>$(?(DEFINE)(?<a>\1a)(?<b>b))`);
  });

  it('should not be interpreted as a capturing group when flag n is disabled', () => {
    expect('a').toMatch(regex({__flagN: false, __extendSyntax: true})`^a$(?(DEFINE))`);
  });

  describe('contents', () => {
    it('should allow an empty value', () => {
      expect('a').toMatch(regex`^.$(?(DEFINE))`);
      // `(?:)` separators are allowed since they can be added by the flag x preprocessor
      expect('a').toMatch(regex`^.$(?(DEFINE)(?:))`);
    });

    it('should not allow anything other than named groups at the top level', () => {
      expect(() => regex`(?(DEFINE)(?<a>)?)`).toThrow();
      expect(() => regex`(?(DEFINE)(?<a>).)`).toThrow();
      expect(() => regex`(?(DEFINE).(?<a>))`).toThrow();
      expect(() => regex`(?(DEFINE)[])`).toThrow();
      expect(() => regex`(?(DEFINE)\0)`).toThrow();
    });

    it('should allow whitespace and comments with flag x', () => {
      expect('a').toMatch(regex`^.$(?(DEFINE) )`);
      expect('a').toMatch(
        regex`^.$(?(DEFINE) # comment
        )`
      );
      // Flag x off
      expect(() => regex({__flagX: false})`^.$(?(DEFINE) )`).toThrow();
      expect(() => {
        regex({__flagX: false})`^.$(?(DEFINE) # comment
        )`
      }).toThrow();
    });

    it('should allow whitespace and comments to separate groups with flag x', () => {
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

    // Just documenting current behavior; this shouldn't be relied on
    it('should allow unreferenced groups', () => {
      expect('a').toMatch(regex`^.$(?(DEFINE)(?<a>))`);
      expect('a').toMatch(regex`^.$(?(DEFINE)(?<a>x))`);
      expect('a').toMatch(regex`^\g<a>$(?(DEFINE)(?<a>.)(?<b>x))`);
    });

    it('should not allow top-level groups to use duplicate names', () => {
      expect(() => regex`(?(DEFINE)(?<a>)(?<a>))`).toThrow();
      expect(() => regex`(?(DEFINE)(?<a>)(?<b>(?<a>)))`).toThrow();
      expect(() => regex`(?<a>)(?(DEFINE)(?<a>))`).toThrow();
    });

    it('should not allow nested groups to use duplicate names', () => {
      expect(() => regex`(?(DEFINE)(?<a>(?<b>))(?<c>(?<b>)))`).toThrow();
      expect(() => regex`(?<a>)(?(DEFINE)(?<b>(?<a>)))`).toThrow();
    });
  });
});
