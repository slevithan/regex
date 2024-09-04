describe('flag x', () => {
  describe('in default context', () => {
    it('should treat whitespace as insignificant', () => {
      const ws = '\t\n\v\f\r \xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF';
      expect('ab').toMatch(regex({raw: [`^a${ws}b$`]}));
    });

    it('should start line comments with # that continue until the next \\n', () => {
      expect('ab').toMatch(regex`^a#comment\nb$`);
    });

    it('should not end line comments with newlines other than \\n', () => {
      const newlines = ['\r', '\u2028', '\u2029'];
      newlines.forEach(n => {
        expect('ab').not.toMatch(regex({raw: [`^a#comment${n}b\n$`]}));
      });
    });

    it('should start line comments with # that continue until the end of the string if there are no following newlines', () => {
      expect('ac').toMatch(regex`^a#comment b$`);
    });

    it('should allow mixing whitespace and line comments', () => {
      expect('ab').toMatch(regex({raw: ['\f^ a \t\n ##comment\n #\nb $ # ignored']}));
    });

    it('should apply a quantifier following whitespace or line comments to the preceding token', () => {
      expect('aaa').toMatch(regex`^a +$`);
      expect('aaa').toMatch(regex`^(a) +$`);
      expect('aaa').toMatch(regex({raw: ['^a#comment\n+$']}));
      expect('aaa').toMatch(regex({raw: ['^a  #comment\n +$']}));
      expect(() => regex`a | ?`).toThrow();
      expect(() => regex` ?`).toThrow();
    });

    // Follows Perl, PCRE, Java, .NET
    // Not allowed in Python or Ruby
    it('should allow whitespace or line comments between a quantifier and the ? that makes it lazy', () => {
      expect(regex`^aa? ?`.exec('aaa')[0]).toBe('a');
      expect(regex`^aa ? ?`.exec('aaa')[0]).toBe('a');
      expect(regex`^aa* ?`.exec('aaa')[0]).toBe('a');
      expect(regex`^aa * ?`.exec('aaa')[0]).toBe('a');
      expect(regex`^aa+ ?`.exec('aaa')[0]).toBe('aa');
      expect(regex`^aa + ?`.exec('aaa')[0]).toBe('aa');
      expect(regex`^aa{1,2} ?`.exec('aaa')[0]).toBe('aa');
      expect(regex`^aa {1,2} ?`.exec('aaa')[0]).toBe('aa');
      // Separating line comments
      expect('aaa').toMatch(regex({raw: ['^a+#comment\n?$']}));
      expect('aaa').toMatch(regex({raw: ['^a+  #comment\n ?$']}));
    });

    // Follows Perl, PCRE, Java
    // Not allowed in Python or Ruby
    it('should allow whitespace or line comments between a quantifier and the + that makes it possessive', () => {
      expect(regex`^aa? +`.exec('aaa')[0]).toBe('aa');
      expect(regex`^aa ? +`.exec('aaa')[0]).toBe('aa');
      expect(regex`^aa* +`.exec('aaa')[0]).toBe('aaa');
      expect(regex`^aa * +`.exec('aaa')[0]).toBe('aaa');
      expect(regex`^aa+ +`.exec('aaa')[0]).toBe('aaa');
      expect(regex`^aa + +`.exec('aaa')[0]).toBe('aaa');
      expect(regex`^aa{1,2} +`.exec('aaa')[0]).toBe('aaa');
      expect(regex`^aa {1,2} +`.exec('aaa')[0]).toBe('aaa');
      // Separating line comments
      expect('aaa').toMatch(regex({raw: ['^a+#comment\n+$']}));
      expect('aaa').toMatch(regex({raw: ['^a+  #comment\n +$']}));
    });

    it('should not allow whitespace-separated quantifiers to follow other complete quantifiers', () => {
      expect(() => regex`a* *`).toThrow();
      expect(() => regex`a{2} {2}`).toThrow();
      // Lazy
      expect(() => regex`a?? ?`).toThrow();
      expect(() => regex`a?? +`).toThrow();
      expect(() => regex`a*? ?`).toThrow();
      expect(() => regex`a*? +`).toThrow();
      expect(() => regex`a+? ?`).toThrow();
      expect(() => regex`a+? +`).toThrow();
      expect(() => regex`a{2}? ?`).toThrow();
      expect(() => regex`a{2}? +`).toThrow();
      // Possessive
      expect(() => regex({disable: {atomic: true}})`a? +`).toThrow();
      expect(() => regex({disable: {atomic: true}})`a* +`).toThrow();
      expect(() => regex({disable: {atomic: true}})`a+ +`).toThrow();
      expect(() => regex({disable: {atomic: true}})`a{2} +`).toThrow();
      expect(() => regex`a?+ ?`).toThrow();
      expect(() => regex`a?+ +`).toThrow();
      expect(() => regex`a*+ ?`).toThrow();
      expect(() => regex`a*+ +`).toThrow();
      expect(() => regex`a++ ?`).toThrow();
      expect(() => regex`a++ +`).toThrow();
      expect(() => regex`a{2}+ ?`).toThrow();
      expect(() => regex`a{2}+ +`).toThrow();
    });

    it('should not let the token following whitespace modify the preceding token', () => {
      expect('\u{0}0').toMatch(regex`^\0 0$`);
      expect('\u{0}1').toMatch(regex`^\0 1$`);
    });

    it('should not let the token following a line comment modify the preceding token', () => {
      expect('\u{0}1').toMatch(regex({raw: ['^\0#\n1$']}));
    });

    it('should preserve the error status of incomplete tokens separated from their completing chars by whitespace', () => {
      const values = [
        '\\c A',
        '\\u 0000',
        '\\u0 000',
        '\\u00 00',
        '\\u000 0',
        '\\x 00',
        '\\x0 0',
        '(? :)',
      ];
      values.forEach(v => {
        expect(() => regex({raw: [v]})).withContext(v).toThrow();
      });
    });

    it('should not allow quantifying ( with ? when separated by whitespace and followed by group type char', () => {
      expect(() => regex`( ?:)`).toThrow();
      expect(() => regex`( ?=)`).toThrow();
      expect(() => regex`( ? : )`).toThrow();
      expect(() => regex`( ? = )`).toThrow();
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(regex`^\ $`);
      expect('  ').toMatch(regex`^ \ \  $`);
      expect(' t').toMatch(regex`^\ t$`);
    });

    it('should allow escaping # to make it significant', () => {
      expect('#').toMatch(regex`\#`);
      expect('##').toMatch(regex` \# \# `);
    });

    it('should treat whitespace in enclosed tokens as significant', () => {
      expect(() => regex`a{ 6 }`).toThrow();
      expect(() => regex`\p{ L }`).toThrow();
      expect(() => regex`\P{ L }`).toThrow();
      expect(() => regex`\u{ 0 }`).toThrow();
      expect(() => regex`(?< n >)`).toThrow();
      expect(() => regex`(?<n>)\k< n >`).toThrow();
    });

    describe('token separator cleanup', () => {
      it('should avoid adding token separators when it is safe to do so', () => {
        expect(regex` ^ (?! a \s b . c | d [] e ) $ `.source).toBe('^(?!a\\sb.c|d[]e)$');
      });

      it('should not remove (?:) when followed by a quantifier', () => {
        expect('').toMatch(regex`(?:)?`);
        expect('').toMatch(regex`^(?:)?$`);
        expect(':').toMatch(regex({disable: {n: true}})`^((?:)?:)$`);
        expect('=').toMatch(regex({disable: {n: true}})`^((?:)?=)$`);
        expect('!').toMatch(regex({disable: {n: true}})`^((?:)?!)$`);
        expect('DEFINE').toMatch(regex({disable: {n: true}})`^((?:)?(DEFINE))$`);
      });

      it('should maintain the error status of invalid syntax', () => {
        expect(() => regex`(?(?:):)`).toThrow();
        expect(() => regex`(?(?:)=)`).toThrow();
        expect(() => regex`(?(?:)!)`).toThrow();
        expect(() => regex`(?(?:)i:)`).toThrow();
        expect(() => regex`(?i(?:):)`).toThrow();
        expect(() => regex`(?i-(?:):)`).toThrow();
        expect(() => regex`(?i-m(?:):)`).toThrow();
        expect(() => regex`(?(?:)-i:)`).toThrow();
        expect(() => regex`(?-(?:)i:)`).toThrow();
        expect(() => regex`(?-i(?:):)`).toThrow();
        expect(() => regex`(?(?:)(DEFINE))`).toThrow();
        expect(() => regex`(?((?:)DEFINE))`).toThrow();
        expect(() => regex`(?(DEFINE(?:)))`).toThrow();
        expect(() => regex`\c(?:)A`).toThrow();
        expect(() => regex`\x(?:)00`).toThrow();
        expect(() => regex`\u(?:)0000`).toThrow();
        expect(() => regex`\p(?:){Letter}`).toThrow();
        expect(() => regex`\p{(?:)Letter}`).toThrow();
        expect(() => regex`\p{Letter(?:)}`).toThrow();
        expect(() => regex`.{(?:)1}`).toThrow();
        expect(() => regex`.{1(?:)}`).toThrow();
        expect(() => regex`.{1(?:),2}`).toThrow();
        expect(() => regex`.{1,(?:)2}`).toThrow();
        expect(() => regex`(?(?:)<a>)`).toThrow();
        expect(() => regex`(?<(?:)a>)`).toThrow();
        expect(() => regex`(?<a(?:)>)`).toThrow();
        expect(() => regex`(?<a>)\k(?:)<a>`).toThrow();
        expect(() => regex`(?<a>)\k<(?:)a>`).toThrow();
        expect(() => regex`(?<a>)\k<a(?:)>`).toThrow();
        expect(() => regex`(?<a>)\g(?:)<a>`).toThrow();
        expect(() => regex`(?<a>)\g<(?:)a>`).toThrow();
        expect(() => regex`(?<a>)\g<a(?:)>`).toThrow();
      });
    });
  });

  describe('in character class context', () => {
    it('should treat space and tab characters as insignificant', () => {
      expect(' ').not.toMatch(regex`[ a]`);
      expect('\t').not.toMatch(regex({raw: ['[\ta]']}));
    });

    it('should not treat whitespace characters apart from space and tab as insignificant', () => {
      expect('\n').toMatch(regex({raw: ['[\na]']}));
      expect('\xA0').toMatch(regex({raw: ['[\xA0a]']}));
      expect('\u2028').toMatch(regex({raw: ['[\u2028a]']}));
    });

    it('should not start comments with #', () => {
      expect('#').toMatch(regex`[#a]`);
    });

    it ('should not let a leading ^ following whitespace change the character class type', () => {
      expect('^').toMatch(regex`[ ^]`);
      expect('_').not.toMatch(regex`[ ^]`);
      expect('^').toMatch(regex`[ ^a]`);
      expect('_').not.toMatch(regex`[ ^a]`);
    });

    it('should not let the token following whitespace modify the preceding token', () => {
        expect('0').toMatch(regex`^[\0 0]$`);
        expect('1').toMatch(regex`^[\0 1]$`);
    });

    it('should preserve the error status of incomplete tokens separated from their completing chars by whitespace', () => {
      const values = [
        '[\\c A]',
        '[\\u 0000]',
        '[\\u0 000]',
        '[\\u00 00]',
        '[\\u000 0]',
        '[\\x 00]',
        '[\\x0 0]',
      ];
      values.forEach(v => {
        expect(() => regex({raw: [v]})).withContext(v).toThrow();
      });
    });

    it('should throw if two unescaped hyphens are separated by whitespace', () => {
      const values = [
        '[- -]',
        '[ - -]',
        '[- - ]',
        '[ - - ]',
        '[\\0- -]',
        '[\\0 - -]',
        '[- -b]',
        '[- - b]',
        '[\\0- -b]',
        '[\\0- - b]',
        '[\\0 - -b]',
        '[\\0 - - b]',
      ];
      values.forEach(v => {
        expect(() => regex()({raw: [v]})).withContext(v).toThrow();
        expect(() => regex({disable: {v: true}})({raw: [v]})).withContext(v).toThrow();
        // Doesn't throw if using flag u syntax; unescaped non-range hyphens are matched literally
        expect(() => regex({disable: {v: true}, unicodeSetsPlugin: null})({raw: [v]})).withContext(v).not.toThrow();
      });
    });

    it('should not interfere with two unescaped hyphens not separated by whitespace', () => {
      const invalid = [
        '[--]',
        '[ --]',
        '[-- ]',
        '[ -- ]',
        '[\\0--]',
        '[\\0 --]',
        '[--b]',
        '[-- b]',
      ];
      invalid.forEach(v => {
        expect(() => regex()({raw: [v]})).withContext(v).toThrow();
        // Invalid unescaped hyphen error from built-in `unicodeSetsPlugin`
        expect(() => regex({disable: {v: true}})({raw: [v]})).withContext(v).toThrow();
        // Doesn't throw if using flag u syntax; unescaped non-range hyphens are matched literally
        expect(() => regex({disable: {v: true}, unicodeSetsPlugin: null})({raw: [v]})).withContext(v).not.toThrow();
      });
      const valid = [
        '[\\0--b]',
        '[\\0-- b]',
        '[\\0 --b]',
        '[\\0 -- b]',
      ];
      valid.forEach(v => {
        if (flagVSupported) {
          expect(() => regex()({raw: [v]})).withContext(v).not.toThrow();
        }
        // Invalid set operator error from built-in `unicodeSetsPlugin`
        expect(() => regex({disable: {v: true}})({raw: [v]})).withContext(v).toThrow();
        // Doesn't throw if using flag u syntax; unescaped non-range hyphens are matched literally
        expect(() => regex({disable: {v: true}, unicodeSetsPlugin: null})({raw: [v]})).withContext(v).not.toThrow();
      });
    });

    it('should allow set operators to be offset by whitespace', () => {
      if (flagVSupported) {
        expect('a').toMatch(regex`[\w -- _]`);
        expect('a').toMatch(regex`[\w-- _]`);
        expect('a').toMatch(regex`[\w --_]`);
        expect('a').toMatch(regex`[\w && [a-z]]`);
        expect('a').toMatch(regex`[\w&& [a-z]]`);
        expect('a').toMatch(regex`[\w &&[a-z]]`);
      } else {
        expect(() => regex`[\w -- _]`).toThrow();
      }
    });

    it('should match (as a literal character) a lone double-punctuator character separated from its partner by whitespace', () => {
      const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~'.split('');
      doublePunctuatorChars.forEach(c => {
        expect(c).withContext(`[a${c} ${c}b]`).toMatch(regex({raw: [`[a${c} ${c}b]`]}));
        expect(c).withContext(`[a${c} ${c} b]`).toMatch(regex({raw: [`[a${c} ${c} b]`]}));
        expect(c).withContext(`[a ${c} ${c}b]`).toMatch(regex({raw: [`[a ${c} ${c}b]`]}));
        expect(c).withContext(`[a ${c} ${c} b]`).toMatch(regex({raw: [`[a ${c} ${c} b]`]}));
      });
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(regex`^[ \ ]$`);
      expect('t ').toMatch(regex`^[\ t]{2}$`);
      if (flagVSupported) {
        expect(' ').toMatch(regex`^[\q{ \ }]$`);
      } else {
        expect(() => regex`^[\q{ \ }]$`).toThrow();
      }
    });

    it('should treat whitespace in enclosed tokens as significant', () => {
      expect(() => regex`[\p{ L }]`).toThrow();
      expect(() => regex`[\P{ L }]`).toThrow();
      expect(() => regex`[\u{ 0 }]`).toThrow();
    });

    it('should treat whitespace in [\\q{}] as insignificant', () => {
      if (flagVSupported) {
        expect('ab').toMatch(regex`^[\q{ a b | c }]$`);
      } else {
        expect(() => regex`^[\q{ a b | c }]$`).toThrow();
      }
    });

    it('should handle empty character classes with insignificant whitespace', () => {
      expect(/[]/.test('a')).toBe(regex`[ ]`.test('a'));
      expect(/[^]/.test('a')).toBe(regex`[^ ]`.test('a'));
      if (flagVSupported) {
        expect(new RegExp('[\\q{}]', 'v').test('a')).toBe(regex`[ \q{ } ]`.test('a'));
      } else {
        expect(() => regex`[ \q{ } ]`).toThrow();
      }
    });
  });

  it('should allow controlling implicit flag x via disable.x', () => {
    expect('a b').toMatch(regex({disable: {x: true}})`a b`);
    expect('a b').not.toMatch(regex({disable: {x: false}})`a b`);
  });
});
