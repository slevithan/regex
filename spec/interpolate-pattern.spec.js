describe('interpolation: patterns', () => {
  describe('in default context', () => {
    it('should coerce non-string values', () => {
      expect('99').toMatch(regex`^${pattern(99)}$`);
    });

    it('should be quantified as a complete unit', () => {
      expect('_abc_abc').toMatch(regex`^${pattern`.abc`}+$`);
    });

    it('should sandbox top-level alternation', () => {
      expect('abd').toMatch(regex`^a${pattern`b|c`}d$`);
    });

    it('should allow self-contained groups', () => {
      expect('aa').toMatch(regex`${pattern`(a)+`}`);
      expect('aa').toMatch(regex`${pattern`((a))+`}`);
    });

    it('should not allow unescaped ) that is not part of a self-contained group', () => {
      expect(() => regex`(${pattern`)`}`).toThrow();
      expect(() => regex`(${pattern`)`})`).toThrow();
      expect(() => regex`(${pattern`())`}`).toThrow();
    });

    it('should not allow unescaped ( that is not part of a self-contained group', () => {
      expect(() => regex`${pattern`(`})`).toThrow();
      expect(() => regex`(${pattern`(`})`).toThrow();
      expect(() => regex`${pattern`(()`})`).toThrow();
    });

    it('should not let } end an enclosed token', () => {
      expect(() => regex`\u{${pattern`0}`}`).toThrow();
      expect(() => regex`\u{${pattern`0}`}}`).toThrow();
      expect(() => regex`\u{${pattern`0\}`}}`).toThrow();
      expect(() => regex`\p{${pattern`L}`}`).toThrow();
      expect(() => regex`\p{${pattern`L}`}}`).toThrow();
      expect(() => regex`\p{${pattern`L\}`}}`).toThrow();
      expect(() => regex`\P{${pattern`L}`}`).toThrow();
      expect(() => regex`\P{${pattern`L}`}}`).toThrow();
      expect(() => regex`\P{${pattern`L\}`}}`).toThrow();
    });

    it('should not let } end an interval quantifier', () => {
      expect(() => regex`.{{${pattern`0}`}`).toThrow();
      expect(() => regex`.{{${pattern`0}`}}`).toThrow();
      expect(() => regex`.{{${pattern`0\}`}}`).toThrow();
    });

    it('should not let > end an enclosed token', () => {
      expect(() => regex`(?<n>)\k<${pattern`n>`}`).toThrow();
      expect(() => regex`(?<${pattern`n>`}>)`).toThrow();
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `\${'w'}` since the raw \ escapes the $
      expect(() => regex({raw: ['\\', '']}, pattern`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`\c${pattern`A`}`).toThrow();
      expect(() => regex`\u${pattern`0000`}`).toThrow();
      expect(() => regex`\x${pattern`00`}`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`^\0${pattern`0`}$`);
    });

    it('should not change the meaning of the following token', () => {
      expect('\u{0}0').toMatch(regex`^${pattern`\0`}0$`);
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
        expect(() => regex`.${pattern(q)}`).toThrow();
        expect(() => regex`.${pattern(`${q}?`)}`).toThrow();
        expect(() => regex`.${pattern(`${q}+`)}`).toThrow();
      });
    });
  });

  describe('in character class context', () => {
    const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~'.split('');

    it('should coerce non-string values', () => {
      expect('5').toMatch(regex`^[1-${pattern(9)}]$`);
    });

    it('should allow at range boundary for a lone double-punctuator character', () => {
      doublePunctuatorChars.forEach(char => {
        expect(char).toMatch(regex`[\0-${pattern(char)}]`);
        expect(char).toMatch(regex`[${pattern(char)}-\u{10FFFF}]`);
      });
    });

    it('should allow at range boundary for unescaped strings that do not contain union', () => {
      const values = [
        // expression, string
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
        expect(v[1]).toMatch(regex`[\0-${pattern(v[0])}]`);
        expect(v[1]).toMatch(regex`[${pattern(v[0])}-\u{10FFFF}]`);
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
        expect(() => regex`[\0-${pattern(v)}]`).toThrow();
        expect(() => regex`[${pattern(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should throw at range boundary for unescaped strings that are invalid in range', () => {
      const values = [
        '\\p{L}',
        '\\d',
        '}',
      ];
      values.forEach(v => {
        expect(() => regex`[\0-${pattern(v)}]`).toThrow();
        expect(() => regex`[${pattern(v)}-\u{10FFFF}]`).toThrow();
      });
    });

    it('should not let a leading ^ change the character class type', () => {
      expect('^').toMatch(regex`[${pattern`^`}a]`);
      expect('b').not.toMatch(regex`[${pattern`^`}a]`);
      expect('_').toMatch(regex`[${pattern`^`}-\xFF]`);
      expect(() => regex`[${pattern`^^`}]`).withContext('^^').toThrow();
    });

    it('should not let an unescaped ] that is not part of a self-contained nested class end a class', () => {
      expect(() => regex`[${pattern`]`}`).toThrow();
      expect(() => regex`[a${pattern`]`}b]`).toThrow();
      expect(']').toMatch(regex`[${pattern(String.raw`\]`)}]`);
      expect(() => regex`[a${pattern(String.raw`\\]`)}b]`).toThrow();
      if (envSupportsFlagV) {
        expect(']').toMatch(regex`[${pattern(String.raw`\\\]`)}]`);
      } else {
        expect(() => regex`[${pattern(String.raw`\\\]`)}]`).toThrow();
      }
    });

    it('should not let an unescaped [ that is not part of a self-contained nested class start a class', () => {
      expect(() => regex`${pattern`[`}]`).toThrow();
      expect(() => regex`[a${pattern`[`}b]`).toThrow();
      expect('[').toMatch(regex`[${pattern(String.raw`\[`)}]`);
      expect(() => regex`[a${pattern(String.raw`\\[`)}b]`).toThrow();
      if (envSupportsFlagV) {
        expect('[').toMatch(regex`[${pattern(String.raw`\\\[`)}]`);
      } else {
        expect(() => regex`[${pattern(String.raw`\\\[`)}]`).toThrow();
      }
    });

    it('should not let } end an enclosed token', () => {
      expect(() => regex`[\u{${pattern`0}`}]`).toThrow();
      expect(() => regex`[\u{${pattern`0}`}}]`).toThrow();
      expect(() => regex`[\u{${pattern`0\}`}}]`).toThrow();
      expect(() => regex`[\p{${pattern`L}`}]`).toThrow();
      expect(() => regex`[\p{${pattern`L}`}}]`).toThrow();
      expect(() => regex`[\p{${pattern`L\}`}}]`).toThrow();
      expect(() => regex`[\P{${pattern`L}`}]`).toThrow();
      expect(() => regex`[\P{${pattern`L}`}}]`).toThrow();
      expect(() => regex`[\P{${pattern`L\}`}}]`).toThrow();
    });

    it('should not let an unescaped } end an enclosed \\q token', () => {
      expect(() => regex`[\q{${pattern`a}`}]`).toThrow();
      expect(() => regex`[\q{${pattern`a}`}}]`).toThrow();
      expect(() => regex`[\q{${pattern`a\\}`}}]`).toThrow();
      if (envSupportsFlagV) {
        expect('a}').toMatch(regex`[\q{${pattern`a\}`}}]`);
      } else {
        expect(() => regex`[\q{${pattern`a\}`}}]`).toThrow();
      }
    });

    it('should not let a trailing unescaped \\ change the character after the interpolation', () => {
      expect(() => regex`[${pattern('\\')}w]`).toThrow();
      expect('\\').toMatch(regex`[${pattern('\\\\')}w]`);
      expect(() => regex`[${pattern('\\\\\\')}w]`).toThrow();
    });

    it('should not let a preceding unescaped \\ change the first character inside the interpolation', () => {
      // Raw string syntax prevents `[\${'w'}]` since the raw \ escapes the $
      expect(() => regex({raw: ['[\\', ']']}, pattern`w`)).toThrow();
    });

    it('should not change the error status of the preceding token', () => {
      expect(() => regex`[\c${pattern`A`}]`).toThrow();
      expect(() => regex`[\u${pattern`0000`}]`).toThrow();
      expect(() => regex`[\x${pattern`00`}]`).toThrow();
    });

    it('should not change the meaning of the preceding token', () => {
      expect('\u{0}0').toMatch(regex`^[\0${pattern`0`}]{2}$`);
    });

    it('should not change the meaning of the following token', () => {
      expect('\u{0}0').toMatch(regex`^[${pattern`\0`}0]{2}$`);
    });

    it('should throw for a leading range hyphen', () => {
      expect(() => regex`[a${pattern`-`}z]`).toThrow();
      expect(() => regex`[a${pattern`-z`}]`).toThrow();
    });

    it('should throw for a trailing range hyphen', () => {
      expect(() => regex`[${pattern`a-`}z]`).toThrow();
      expect(() => regex`[${pattern`a-`}]`).toThrow();
    });

    it('should allow a self-contained range', () => {
      expect('a').toMatch(regex`[${pattern`a-z`}]`);
    });

    it('should throw for a leading set operator', () => {
      expect(() => regex`[${pattern`--`}_]`).toThrow();
      expect(() => regex`[\w${pattern`--`}_]`).toThrow();
      expect(() => regex`[\w${pattern`--_`}]`).toThrow();
      expect(() => regex`[${pattern`&&`}[a-z]]`).toThrow();
      expect(() => regex`[\w${pattern`&&`}[a-z]]`).toThrow();
      expect(() => regex`[\w${pattern`&&[a-z]`}]`).toThrow();
    });

    it('should throw for a trailing set operator', () => {
      expect(() => regex`[${pattern`\w--`}]`).toThrow();
      expect(() => regex`[${pattern`\w--`}_]`).toThrow();
      expect(() => regex`[${pattern`\w&&`}]`).toThrow();
      expect(() => regex`[${pattern`\w&&`}[a-z]]`).toThrow();
    });

    it('should allow a self-contained set operation', () => {
      if (envSupportsFlagV) {
        expect('a').toMatch(regex`[${pattern`\w--_`}]`);
        expect('a').toMatch(regex`[${pattern`\w&&a`}]`);
        expect('a').toMatch(regex`[${pattern`\w&&[a-z]`}]`);
      } else {
        expect(() => regex`[${pattern`\w--_`}]`).toThrow();
        expect(() => regex`[${pattern`\w&&a`}]`).toThrow();
        expect(() => regex`[${pattern`\w&&[a-z]`}]`).toThrow();
      }
    });

    it('should throw for a double punctuator without operands', () => {
      const values = doublePunctuatorChars.map(v => v.repeat(2));
      values.push('_^^');
      values.forEach(v => {
        expect(() => regex`[${pattern(v)}]`).withContext(v).toThrow();
      });
    });

    it('should throw for a reserved double punctuator', () => {
      const values = doublePunctuatorChars.map(v => v.repeat(2)).filter(v => v !== '&&');
      values.forEach(v => {
        expect(() => regex`[a${pattern(v)}b]`).withContext(v).toThrow();
      });
    });

    it('should not throw if a lone double-punctuator character is bordered by itself', () => {
      expect('&').toMatch(regex`[&${pattern`&`}&]`);
      expect('!').toMatch(regex`[!${pattern`!`}!]`);
      expect('#').toMatch(regex`[#${pattern`#`}#]`);
      expect('$').toMatch(regex`[$${pattern`$`}$]`);
      expect('%').toMatch(regex`[%${pattern`%`}%]`);
      expect('*').toMatch(regex`[*${pattern`*`}*]`);
      expect('+').toMatch(regex`[+${pattern`+`}+]`);
      expect(',').toMatch(regex`[,${pattern`,`},]`);
      expect('.').toMatch(regex`[.${pattern`.`}.]`);
      expect(':').toMatch(regex`[:${pattern`:`}:]`);
      expect(';').toMatch(regex`[;${pattern`;`};]`);
      expect('<').toMatch(regex`[<${pattern`<`}<]`);
      expect('=').toMatch(regex`[=${pattern`=`}=]`);
      expect('>').toMatch(regex`[>${pattern`>`}>]`);
      expect('?').toMatch(regex`[?${pattern`?`}?]`);
      expect('@').toMatch(regex`[@${pattern`@`}@]`);
      expect('^').not.toMatch(regex`[^${pattern`^`}^]`);
      expect('^').toMatch(regex`[_^${pattern`^`}^]`);
      expect('`').toMatch(regex`[\`${pattern`\``}\`]`);
      expect('~').toMatch(regex`[~${pattern`~`}~]`);
    });

    it('should not throw if a lone double-punctuator character in an implicit union is bordered by itself', () => {
      if (envSupportsFlagV) {
        expect('&').toMatch(regex`[${pattern`a&`}&]`);
        expect('!').toMatch(regex`[${pattern`a!`}!]`);
        expect('#').toMatch(regex`[${pattern`a#`}#]`);
        expect('$').toMatch(regex`[${pattern`a$`}$]`);
        expect('%').toMatch(regex`[${pattern`a%`}%]`);
        expect('*').toMatch(regex`[${pattern`a*`}*]`);
        expect('+').toMatch(regex`[${pattern`a+`}+]`);
        expect(',').toMatch(regex`[${pattern`a,`},]`);
        expect('.').toMatch(regex`[${pattern`a.`}.]`);
        expect(':').toMatch(regex`[${pattern`a:`}:]`);
        expect(';').toMatch(regex`[${pattern`a;`};]`);
        expect('<').toMatch(regex`[${pattern`a<`}<]`);
        expect('=').toMatch(regex`[${pattern`a=`}=]`);
        expect('>').toMatch(regex`[${pattern`a>`}>]`);
        expect('?').toMatch(regex`[${pattern`a?`}?]`);
        expect('@').toMatch(regex`[${pattern`a@`}@]`);
        expect('^').toMatch(regex`[${pattern`a^`}^]`);
        expect('`').toMatch(regex`[${pattern`a\``}\`]`);
        expect('~').toMatch(regex`[${pattern`a~`}~]`);
      } else {
        expect(() => regex`[${pattern`a&`}&]`).toThrow();
      }
    });
  });
});
