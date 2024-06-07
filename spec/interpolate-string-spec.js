describe('interpolation: escaped strings', () => {
  describe('in default context', () => {
    it('should coerce non-string/regex values', () => {
      expect('9').toMatch(regex`${9}`);
    });

    it('should match literal characters', () => {
      const str = '^.?*|$';
      expect(str).toMatch(regex`${str}`);
    });

    it('should be quantified as an atomic unit', () => {
      const str = 'abc';
      expect(str.repeat(2)).toMatch(regex`^${str}+$`);
      expect(str.repeat(2)).toMatch(regex`${str}{2}`);
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `\${'w'}` since the raw \ escapes the $
      expect(() => regex({raw: ['\\', '']}, 'w')).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`\x${'00'}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`\0${'0'}`);
    });
  });

  describe('in character class context', () => {
    it('should coerce non-string/regex values', () => {
      expect('5').toMatch(regex`[1-${9}]`);
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
        expect(v).toMatch(regex`[\0-${v}]`);
        expect(v).toMatch(regex`[${v}-\u{10FFFF}]`);
      })
    });

    it('should throw at range boundary for escaped strings that contain union', () => {
      const values = [
        'ab',
        '\\t',
        '\\\\',
      ];
      values.forEach(v => {
        expect(() => regex`[\0-${v}]`).toThrow();
        expect(() => regex`[${v}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `[\${'w'}]` since the raw \ escapes the $
      expect(() => regex({raw: ['[\\', ']']}, 'w')).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`[\x${'00'}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`[\0${'0'}]{2}`);
    });

    it('should escape double-punctuator characters', () => {
      expect('&').toMatch(regex`[${'&'}&]`);
      expect('!').toMatch(regex`[${'!'}!]`);
      expect('#').toMatch(regex`[${'#'}#]`);
      expect('$').toMatch(regex`[${'$'}$]`);
      expect('%').toMatch(regex`[${'%'}%]`);
      expect('*').toMatch(regex`[${'*'}*]`);
      expect('+').toMatch(regex`[${'+'}+]`);
      expect(',').toMatch(regex`[${','},]`);
      expect('.').toMatch(regex`[${'.'}.]`);
      expect(':').toMatch(regex`[${':'}:]`);
      expect(';').toMatch(regex`[${';'};]`);
      expect('<').toMatch(regex`[${'<'}<]`);
      expect('=').toMatch(regex`[${'='}=]`);
      expect('>').toMatch(regex`[${'>'}>]`);
      expect('?').toMatch(regex`[${'?'}?]`);
      expect('@').toMatch(regex`[${'@'}@]`);
      expect('^').toMatch(regex`[${'^'}^]`);
      expect('`').toMatch(regex`[${'`'}\`]`);
      expect('~').toMatch(regex`[${'~'}~]`);
    });
  });
});
