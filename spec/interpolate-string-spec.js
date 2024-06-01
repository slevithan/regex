describe('interpolation: escaped strings', () => {
  describe('in default context', () => {
    it('should coerce non-string/regex values', () => {
      expect('9').toMatch(Regex.make`${9}`);
    });

    it('should match literal characters', () => {
      const str = '^.?*|$';
      expect(str).toMatch(Regex.make`${str}`);
    });

    it('should be quantified as an atomic unit', () => {
      const str = 'abc';
      expect(str.repeat(2)).toMatch(Regex.make`^${str}+$`);
      expect(str.repeat(2)).toMatch(Regex.make`${str}{2}`);
    });

    it('should not let preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `\${'w'}` since the raw \ escapes the $
      expect(() => Regex.make({raw: ['\\', '']}, 'w')).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => Regex.make`\x${'00'}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(Regex.make`\0${'0'}`);
    });
  });

  describe('in character class context', () => {
    it('should coerce non-string/regex values', () => {
      expect('5').toMatch(Regex.make`[1-${9}]`);
    });

    it('should allow at range boundary for escaped strings that do not contain union', () => {
      const values = [
        'a',
        '}',
        '^',
        '-',
        ']',
        '\\',
      ];
      values.forEach(v => {
        expect(v).toMatch(Regex.make`[\0-${v}]`);
        expect(v).toMatch(Regex.make`[${v}-\u{10FFFF}]`);
      })
    });

    it('should throw at range boundary for escaped strings that contain union', () => {
      const values = [
        'ab',
        '\\t',
        '\\\\',
      ];
      values.forEach(v => {
        expect(() => Regex.make`[\0-${v}]`).toThrow();
        expect(() => Regex.make`[${v}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should not let preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `[\${'w'}]` since the raw \ escapes the $
      expect(() => Regex.make({raw: ['[\\', ']']}, 'w')).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => Regex.make`[\x${'00'}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(Regex.make`[\0${'0'}]{2}`);
    });

    it('should escape double-punctuator characters', () => {
      expect('&').toMatch(Regex.make`[${'&'}&]`);
      expect('!').toMatch(Regex.make`[${'!'}!]`);
      expect('#').toMatch(Regex.make`[${'#'}#]`);
      expect('$').toMatch(Regex.make`[${'$'}$]`);
      expect('%').toMatch(Regex.make`[${'%'}%]`);
      expect('*').toMatch(Regex.make`[${'*'}*]`);
      expect('+').toMatch(Regex.make`[${'+'}+]`);
      expect(',').toMatch(Regex.make`[${','},]`);
      expect('.').toMatch(Regex.make`[${'.'}.]`);
      expect(':').toMatch(Regex.make`[${':'}:]`);
      expect(';').toMatch(Regex.make`[${';'};]`);
      expect('<').toMatch(Regex.make`[${'<'}<]`);
      expect('=').toMatch(Regex.make`[${'='}=]`);
      expect('>').toMatch(Regex.make`[${'>'}>]`);
      expect('?').toMatch(Regex.make`[${'?'}?]`);
      expect('@').toMatch(Regex.make`[${'@'}@]`);
      expect('^').toMatch(Regex.make`[${'^'}^]`);
      expect('`').toMatch(Regex.make`[${'`'}\`]`);
      expect('~').toMatch(Regex.make`[${'~'}~]`);
    });
  });
});
