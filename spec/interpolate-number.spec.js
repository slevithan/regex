describe('interpolation: numbers', () => {
  describe('in default context', () => {
    it('should coerce to string', () => {
      expect('99').toMatch(regex`^${99}$`);
      expect('NaN').toMatch(regex`^${NaN}$`);
    });

    it('should be quantified as a complete unit', () => {
      expect('123123').toMatch(regex`^${123}+$`);
      expect('1233').not.toMatch(regex`^${123}+$`);
    });

    it('should allow in interval quantifier', () => {
      expect('aaa').toMatch(regex`^a{${3}}$`);
      expect('aaa').toMatch(regex`^a{2,${3}}$`);
      expect('aaa').toMatch(regex`^a{${3},}$`);
      expect('1234567890').toMatch(regex`^.{${10}}$`);
      expect('1234567890').toMatch(regex`^.{1${0}}$`);
      expect('1234567890').toMatch(regex`^.{${1}0}$`);
      expect('1234567890').toMatch(regex`^.{${1}${0}}$`);
    });

    it('should convert to hexadecimal in enclosed \\u', () => {
      expect('a').toMatch(regex`^\u{${97}}$`); // 97 = 0x61
      expect('\u{A}').toMatch(regex`\u{0${10}}`);
      expect('\u{10A}').toMatch(regex`\u{10${10}}`);
      expect('\u{A0}').toMatch(regex`\u{${10}0}`);
      expect('\u{A0}').toMatch(regex`\u{${10}${0}}`);
    });

    it('should not convert to hexadecimal in enclosed \\p or \\P', () => {
      // Decimal 12 is 0xC, and `.toString(16)` would return 'c'
      expect(() => regex`\p{${12}}`).toThrow();
      expect(() => regex`\P{${12}}`).toThrow();
      expect(() => regex`\p{C${12}}`).toThrow();
      expect(() => regex`\P{C${12}}`).toThrow();
    });

    it('should not let a preceding unescaped \\ change the interpolation', () => {
      // Raw string syntax prevents `\${0}` since the raw \ escapes the $
      expect(() => regex({raw: ['\\', '']}, 0)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`\c${1}`).toThrow();
      expect(() => regex`\u${1}`).toThrow();
      expect(() => regex`\x${1}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`^\0${0}$`);
    });
  });

  describe('in character class context', () => {
    it('should coerce to string', () => {
      expect('5').toMatch(regex`^[1-${9}]$`);
      if (flagVSupported) {
        expect('99').toMatch(regex`^[\q{${99}}]$`);
      }
    });

    it('should convert to hexadecimal in enclosed \\u', () => {
      expect('a').toMatch(regex`^[\u{${97}}]$`); // 0x61
    });

    it('should not let a preceding unescaped \\ change the interpolation', () => {
      // Raw string syntax prevents `[\${0}]` since the raw \ escapes the $
      expect(() => regex({raw: ['[\\', ']']}, 0)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`[\c${1}]`).toThrow();
      expect(() => regex`[\u${1}]`).toThrow();
      expect(() => regex`[\x${1}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`^[\0${0}]{2}$`);
    });
  });
});
