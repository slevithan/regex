describe('interpolation: partial patterns', () => {
  describe('in default context', () => {
    it('should coerce non-string values', () => {
      expect('9').toMatch(regex`${partial(9)}`);
    });

    it('should be quantified as an atomic unit', () => {
      expect('_abc_abc').toMatch(regex`^${partial`.abc`}+$`);
    });

    it('should sandbox top-level alternation', () => {
      expect('abd').toMatch(regex`^a${partial`b|c`}d$`);
    });

    it('should allow self-contained groups', () => {
      expect('aa').toMatch(regex`${partial`(a)+`}`);
      expect('aa').toMatch(regex`${partial`((a))+`}`);
    });

    it('should not allow unescaped ) that is not part of a self-contained group', () => {
      expect(() => regex`(${partial`)`}`).toThrow();
      expect(() => regex`(${partial`)`})`).toThrow();
      expect(() => regex`(${partial`())`}`).toThrow();
    });

    it('should not allow unescaped ( that is not part of a self-contained group', () => {
      expect(() => regex`${partial`(`})`).toThrow();
      expect(() => regex`(${partial`(`})`).toThrow();
      expect(() => regex`${partial`(()`})`).toThrow();
    });

    it('should not let } end an enclosed token', () => {
      expect(() => regex`\u{${partial`0}`}`).toThrow();
      expect(() => regex`\u{${partial`0}`}}`).toThrow();
      expect(() => regex`\u{${partial`0\}`}}`).toThrow();
      expect(() => regex`\p{${partial`L}`}`).toThrow();
      expect(() => regex`\p{${partial`L}`}}`).toThrow();
      expect(() => regex`\p{${partial`L\}`}}`).toThrow();
      expect(() => regex`\P{${partial`L}`}`).toThrow();
      expect(() => regex`\P{${partial`L}`}}`).toThrow();
      expect(() => regex`\P{${partial`L\}`}}`).toThrow();
    });

    it('should not let } end an interval quantifier', () => {
      expect(() => regex`.{{${partial`0}`}`).toThrow();
      expect(() => regex`.{{${partial`0}`}}`).toThrow();
      expect(() => regex`.{{${partial`0\}`}}`).toThrow();
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `\${'w'}` since the raw \ escapes the $
      expect(() => regex({raw: ['\\', '']}, partial`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`\c${partial`A`}`).toThrow();
      expect(() => regex`\u${partial`0000`}`).toThrow();
      expect(() => regex`\x${partial`00`}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`\0${partial`0`}`);
    });

    it('should not change the meaning of the following token', () => {
      expect('\u{0}0').toMatch(regex`${partial`\0`}0`);
    });

    it('should not allow a leading quantifier', () => {
      const quantifiers = [
        '?',
        '*',
        '+',
        '{1}',
        '{1,}',
        '{1,2}',
      ];
      quantifiers.forEach(q => {
        expect(() => regex`.${partial(q)}`).toThrow();
        expect(() => regex`.${partial(`${q}?`)}`).toThrow();
      });
    });
  });

  describe('in character class context', () => {
    const doublePunctuatorChars = [
      '&',
      '!',
      '#',
      '$',
      '%',
      '*',
      '+',
      ',',
      '.',
      ':',
      ';',
      '<',
      '=',
      '>',
      '?',
      '@',
      '^',
      '`',
      '~',
    ];

    it('should coerce non-string values', () => {
      expect('5').toMatch(regex`[1-${partial(9)}]`);
    });

    it('should allow at range boundary for a lone double-punctuator character', () => {
      doublePunctuatorChars.forEach(char => {
        expect(char).toMatch(regex`[\0-${partial(char)}]`);
        expect(char).toMatch(regex`[${partial(char)}-\u{10FFFF}]`);
      });
    });

    it('should allow at range boundary for unescaped strings that do not contain union', () => {
      const values = [
        // pattern, string
        ['a', 'a'],
        ['\\b', '\b'],
        ['\\t', '\t'],
        ['\\0', '\0'],
        ['\\cA', '\x01'],
        ['\\x01', '\x01'],
        ['\\u0001', '\u0001'],
        ['\\u{10000}', '\u{10000}'],
        ['\\u{00000000001}', '\u{00000000001}'],
        ['\\{', '{'],
        ['^', '^'],
        ['\\^', '^'],
        ['\\-', '-'],
        ['\\]', ']'],
        ['\\\\', '\\'],
      ];
      values.forEach(v => {
        expect(v[1]).toMatch(regex`[\0-${partial(v[0])}]`);
        expect(v[1]).toMatch(regex`[${partial(v[0])}-\u{10FFFF}]`);
      });
    });

    it('should throw at range boundary for unescaped strings that contain union', () => {
      const values = [
        'ab',
        '\\t\\t',
        '~~',
        '[a]',
        '[ab]',
        '\\q{a}',
        '\\q{a|bc}',
        '\\p{RGI_Emoji}',
      ];
      values.forEach(v => {
        expect(() => regex`[\0-${partial(v)}]`).toThrow();
        expect(() => regex`[${partial(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should throw at range boundary for unescaped strings that are invalid in range', () => {
      const values = [
        '\\p{L}',
        '\\d',
        '}',
      ];
      values.forEach(v => {
        expect(() => regex`[\0-${partial(v)}]`).toThrow();
        expect(() => regex`[${partial(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should not let a leading ^ change the character class type', () => {
      expect('^').toMatch(regex`[${partial`^`}a]`);
      expect('b').not.toMatch(regex`[${partial`^`}a]`);
      expect('_').toMatch(regex`[${partial`^`}-\xFF]`);
      expect(() => regex`[${partial`^^`}]`).withContext('^^').toThrow();
    });

    it('should not let an unescaped ] that is not part of a self-contained nested class end a class', () => {
      expect(() => regex`[${partial`]`}`).toThrow();
      expect(() => regex`[a${partial`]`}b]`).toThrow();
      expect(']').toMatch(regex`[${partial(String.raw`\]`)}]`);
      expect(() => regex`[a${partial(String.raw`\\]`)}b]`).toThrow();
      expect(']').toMatch(regex`[${partial(String.raw`\\\]`)}]`);
    });

    it('should not let an unescaped [ that is not part of a self-contained nested class start a class', () => {
      expect(() => regex`${partial`[`}]`).toThrow();
      expect(() => regex`[a${partial`[`}b]`).toThrow();
      expect('[').toMatch(regex`[${partial(String.raw`\[`)}]`);
      expect(() => regex`[a${partial(String.raw`\\[`)}b]`).toThrow();
      expect('[').toMatch(regex`[${partial(String.raw`\\\[`)}]`);
    });

    it('should not let } end an enclosed token', () => {
      expect(() => regex`[\u{${partial`0}`}]`).toThrow();
      expect(() => regex`[\u{${partial`0}`}}]`).toThrow();
      expect(() => regex`[\u{${partial`0\}`}}]`).toThrow();
      expect(() => regex`[\p{${partial`L}`}]`).toThrow();
      expect(() => regex`[\p{${partial`L}`}}]`).toThrow();
      expect(() => regex`[\p{${partial`L\}`}}]`).toThrow();
      expect(() => regex`[\P{${partial`L}`}]`).toThrow();
      expect(() => regex`[\P{${partial`L}`}}]`).toThrow();
      expect(() => regex`[\P{${partial`L\}`}}]`).toThrow();
    });

    it('should not let an unescaped } end an enclosed \\q token', () => {
      expect(() => regex`[\q{${partial`a}`}]`).toThrow();
      expect(() => regex`[\q{${partial`a}`}}]`).toThrow();
      expect('a}').toMatch(regex`[\q{${partial`a\}`}}]`);
      expect(() => regex`[\q{${partial`a\\}`}}]`).toThrow();
    });

    it('should not let a trailing unescaped \\ change the character after the interpolation', () => {
      expect(() => regex`[${partial('\\')}w]`).toThrow();
      expect('\\').toMatch(regex`[${partial('\\\\')}w]`);
      expect(() => regex`[${partial('\\\\\\')}w]`).toThrow();
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `[\${'w'}]` since the raw \ escapes the $
      expect(() => regex({raw: ['[\\', ']']}, partial`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`[\c${partial`A`}]`).toThrow();
      expect(() => regex`[\u${partial`0000`}]`).toThrow();
      expect(() => regex`[\x${partial`00`}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`[\0${partial`0`}]{2}`);
    });

    it('should not change the meaning of the following token', () => {
      expect('\u{0}0').toMatch(regex`[${partial`\0`}0]{2}`);
    });

    it('should throw for a leading range hyphen', () => {
      expect(() => regex`[a${partial`-`}z]`).toThrow();
      expect(() => regex`[a${partial`-z`}]`).toThrow();
    });

    it('should throw for a trailing range hyphen', () => {
      expect(() => regex`[${partial`a-`}z]`).toThrow();
      expect(() => regex`[${partial`a-`}]`).toThrow();
    });

    it('should allow a self-contained range', () => {
      expect('a').toMatch(regex`[${partial`a-z`}]`);
    });

    it('should throw for a leading set operator', () => {
      expect(() => regex`[${partial`--`}_]`).toThrow();
      expect(() => regex`[\w${partial`--`}_]`).toThrow();
      expect(() => regex`[\w${partial`--_`}]`).toThrow();
      expect(() => regex`[${partial`&&`}[a-z]]`).toThrow();
      expect(() => regex`[\w${partial`&&`}[a-z]]`).toThrow();
      expect(() => regex`[\w${partial`&&[a-z]`}]`).toThrow();
    });

    it('should throw for a trailing set operator', () => {
      expect(() => regex`[${partial`\w--`}]`).toThrow();
      expect(() => regex`[${partial`\w--`}_]`).toThrow();
      expect(() => regex`[${partial`\w&&`}]`).toThrow();
      expect(() => regex`[${partial`\w&&`}[a-z]]`).toThrow();
    });

    it('should allow a self-contained set operation', () => {
      expect('a').toMatch(regex`[${partial`\w--_`}]`);
      expect('a').toMatch(regex`[${partial`\w&&[a-z]`}]`);
    });

    it('should throw for a double punctuator without operands', () => {
      const values = doublePunctuatorChars.map(v => v.repeat(2));
      values.push('_^^');
      values.forEach(v => {
        expect(() => regex`[${partial(v)}]`).withContext(v).toThrow();
      });
    });

    it('should throw for a reserved double punctuator', () => {
      const values = doublePunctuatorChars.map(v => v.repeat(2)).filter(v => v !== '&&');
      values.forEach(v => {
        expect(() => regex`[a${partial(v)}b]`).withContext(v).toThrow();
      });
    });

    it('should not throw if a lone double-punctuator character is bordered by itself', () => {
      expect('&').toMatch(regex`[&${partial`&`}&]`);
      expect('!').toMatch(regex`[!${partial`!`}!]`);
      expect('#').toMatch(regex`[#${partial`#`}#]`);
      expect('$').toMatch(regex`[$${partial`$`}$]`);
      expect('%').toMatch(regex`[%${partial`%`}%]`);
      expect('*').toMatch(regex`[*${partial`*`}*]`);
      expect('+').toMatch(regex`[+${partial`+`}+]`);
      expect(',').toMatch(regex`[,${partial`,`},]`);
      expect('.').toMatch(regex`[.${partial`.`}.]`);
      expect(':').toMatch(regex`[:${partial`:`}:]`);
      expect(';').toMatch(regex`[;${partial`;`};]`);
      expect('<').toMatch(regex`[<${partial`<`}<]`);
      expect('=').toMatch(regex`[=${partial`=`}=]`);
      expect('>').toMatch(regex`[>${partial`>`}>]`);
      expect('?').toMatch(regex`[?${partial`?`}?]`);
      expect('@').toMatch(regex`[@${partial`@`}@]`);
      expect('^').not.toMatch(regex`[^${partial`^`}^]`);
      expect('^').toMatch(regex`[_^${partial`^`}^]`);
      expect('`').toMatch(regex`[\`${partial`\``}\`]`);
      expect('~').toMatch(regex`[~${partial`~`}~]`);
    });

    it('should not throw if a lone double-punctuator character in an implicit union is bordered by itself', () => {
      expect('&').toMatch(regex`[${partial`a&`}&]`);
      expect('!').toMatch(regex`[${partial`a!`}!]`);
      expect('#').toMatch(regex`[${partial`a#`}#]`);
      expect('$').toMatch(regex`[${partial`a$`}$]`);
      expect('%').toMatch(regex`[${partial`a%`}%]`);
      expect('*').toMatch(regex`[${partial`a*`}*]`);
      expect('+').toMatch(regex`[${partial`a+`}+]`);
      expect(',').toMatch(regex`[${partial`a,`},]`);
      expect('.').toMatch(regex`[${partial`a.`}.]`);
      expect(':').toMatch(regex`[${partial`a:`}:]`);
      expect(';').toMatch(regex`[${partial`a;`};]`);
      expect('<').toMatch(regex`[${partial`a<`}<]`);
      expect('=').toMatch(regex`[${partial`a=`}=]`);
      expect('>').toMatch(regex`[${partial`a>`}>]`);
      expect('?').toMatch(regex`[${partial`a?`}?]`);
      expect('@').toMatch(regex`[${partial`a@`}@]`);
      expect('^').toMatch(regex`[${partial`a^`}^]`);
      expect('`').toMatch(regex`[${partial`a\``}\`]`);
      expect('~').toMatch(regex`[${partial`a~`}~]`);
    });
  });
});
