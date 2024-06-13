describe('interpolation: regexes', () => {
  describe('in default context', () => {
    it('should be quantified as an atomic unit', () => {
      expect('_abc_abc').toMatch(regex`^${/.abc/}+$`);
    });

    it('should sandbox top-level alternation', () => {
      expect('abd').toMatch(regex`^a${/b|c/}d$`);
    });

    it('should preserve local flag i or its absense, or throw if support is unavailable', () => {
      if (patternModsSupported) {
        expect('foo-BAR').    toMatch(regex     `foo-${/bar/i}`);
        expect('FOO-BAR').not.toMatch(regex     `foo-${/bar/i}`);
        expect('FOO-bar').    toMatch(regex('i')`foo-${/bar/}`);
        expect('FOO-BAR').not.toMatch(regex('i')`foo-${/bar/}`);
      } else {
        expect(() => regex`${/./i}`).toThrow();
        expect(() => regex('i')`${/./}`).toThrow();
      }
    });

    it('should preserve local flag m or its absense', () => {
      expect('a\nb').      toMatch(regex     `^a\n${/^b/m}`);
      expect('\na\nb').not.toMatch(regex     `^a\n${/^b/m}`);
      expect('\na\nb').not.toMatch(regex('m')`^a\n${/^b/}`);
      expect('b\na').      toMatch(regex('m')`${/^b/}\n^a`);
    });

    it('should preserve local flag s or its absense', () => {
      expect('a\n').     toMatch(regex     `.${/./s}`);
      expect('\n\n').not.toMatch(regex     `.${/./s}`);
      expect('\na').     toMatch(regex('s')`.${/./}`);
      expect('\n\n').not.toMatch(regex('s')`.${/./}`);
    });

    it('should preserve multiple flag differences on outer/inner regex', () => {
      if (patternModsSupported) {
        expect('AAa\n').     toMatch(regex('i')`a.${/a./s}`);
        expect('AAA\n'). not.toMatch(regex('i')`a.${/a./s}`);
        expect('A\na\n').not.toMatch(regex('i')`a.${/a./s}`);
      }

      expect('\nxa\n').      toMatch(regex('m')`^.${/a.$/s}`);
      expect('\n\na\n'). not.toMatch(regex('m')`^.${/a.$/s}`);
      expect('\nxa\n\n').not.toMatch(regex('m')`^.${/a.$/s}`);
    });

    it('should adjust the backreferences of interpolated regexes based on preceding captures in the outer regex', function() {
      expect('aabb').toMatch(regex`^(?<n1>)(?<n2>${/(.)\1/}${/(.)\1/})$`);
      expect('aa').toMatch(regex`^(?<outer>)${/(?<inner>.)\1/}$`);
      // These rely on the backref adjustments to make them into errors
      expect(() => regex`(?<n>)${/\1/}`).toThrow();
      expect(() => regex`(?<n>)${/()\2/}`).toThrow();
    });

    it('should adjust the backreferences of interpolated regexes based on preceding captures in an interpolated regex', function() {
      expect('aaba').not.toMatch(regex`^${/(.)\1/}${/(.)\1/}$`);
      expect('aabb').toMatch(regex`^${/(.)\1/}${/(.)\1/}$`);
    });

    it('should adjust the backreferences of interpolated regexes based on preceding captures in a partial', function() {
      expect('aa').toMatch(regex`^${partial`(?<n>)`}${/(.)\1/}$`);
    });

    it('should treat pattern modifiers as noncapturing', () => {
      if (patternModsSupported) {
        expect('abb').toMatch(regex`^(?i:a)${/(b)\1/}$`);
      } else {
        // Will throw a SyntaxError either way in environments that don't support pattern modifiers
      }
    });
  });

  describe('in character class context', () => {
    it('should throw since the syntax context does not match', () => {
      expect(() => regex`[${/./}]`).toThrow();
    });
  });
});
