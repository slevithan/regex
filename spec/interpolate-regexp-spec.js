describe('interpolation: regexes', () => {
  describe('in default context', () => {
    it('should be quantified as an atomic unit', () => {
      expect('_abc_abc').toMatch(Regex.make`^${/.abc/}+$`);
    });

    it('should sandbox top-level alternation', () => {
      expect('abd').toMatch(Regex.make`^a${/b|c/}d$`);
    });

    const patternModsOn = (() => {
      let supported = true;
      try {
        new RegExp('(?i-ms:)');
      } catch (e) {
        supported = false;
      }
      return supported;
    })();

    it('should preserve local flag i or its absense, or throw if support is unavailable', () => {
      if (patternModsOn) {
        expect('foo-BAR').    toMatch(Regex.make     `foo-${/bar/i}`);
        expect('FOO-BAR').not.toMatch(Regex.make     `foo-${/bar/i}`);
        expect('FOO-bar').    toMatch(Regex.make('i')`foo-${/bar/}`);
        expect('FOO-BAR').not.toMatch(Regex.make('i')`foo-${/bar/}`);
      } else {
        expect(() => Regex.make`${/./i}`).toThrow();
        expect(() => Regex.make('i')`${/./}`).toThrow();
      }
    });

    it('should preserve local flag m or its absense', () => {
      expect('a\nb').      toMatch(Regex.make     `^a\n${/^b/m}`);
      expect('\na\nb').not.toMatch(Regex.make     `^a\n${/^b/m}`);
      expect('\na\nb').not.toMatch(Regex.make('m')`^a\n${/^b/}`);
      expect('b\na').      toMatch(Regex.make('m')`${/^b/}\n^a`);
    });

    it('should preserve local flag s or its absense', () => {
      expect('a\n').     toMatch(Regex.make     `.${/./s}`);
      expect('\n\n').not.toMatch(Regex.make     `.${/./s}`);
      expect('\na').     toMatch(Regex.make('s')`.${/./}`);
      expect('\n\n').not.toMatch(Regex.make('s')`.${/./}`);
    });

    it('should preserve multiple flag differences on outer/inner regex', () => {
      if (patternModsOn) {
        expect('AAa\n').     toMatch(Regex.make('i')`a.${/a./s}`);
        expect('AAA\n'). not.toMatch(Regex.make('i')`a.${/a./s}`);
        expect('A\na\n').not.toMatch(Regex.make('i')`a.${/a./s}`);
      }

      expect('\nxa\n').      toMatch(Regex.make('m')`^.${/a.$/s}`);
      expect('\n\na\n'). not.toMatch(Regex.make('m')`^.${/a.$/s}`);
      expect('\nxa\n\n').not.toMatch(Regex.make('m')`^.${/a.$/s}`);
    });

    it('should adjust the backreferences of interpolated regexes', function() {
      const regex = /(.)\1/;
      expect('aaba').not.toMatch(Regex.make`^${regex}${regex}$`);
      expect('aabb').toMatch(Regex.make`^${regex}${regex}$`);
      expect('aabb').toMatch(Regex.make`^(?<n1>)(?<n2>${regex}${regex})$`);
      expect('aa').toMatch(Regex.make`^(?<outer>)${/(?<inner>.)\1/}$`);
      // These rely on the backref adjustments to make them into errors
      expect(() => Regex.make`(?<n>)${/\1/}`).toThrow();
      expect(() => Regex.make`(?<n>)${/()\2/}`).toThrow();
    });
  });

  describe('in character class context', () => {
    it('should throw since the syntax context does not match', () => {
      expect(() => Regex.make`[${/./}]`).toThrow();
    });
  });
});
