describe('flag x', () => {
  describe('in default context', () => {
    it('should treat whitespace as insignificant', () => {
      const ws = '\t\n\v\f\r \xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF';
      expect('ab').toMatch(regex({raw: [`^a${ws}b$`]}, []));
    });

    it('should start line comments with # that continue until the next \\n', () => {
      expect('ab').toMatch(regex`^a#comment\nb$`);
    });

    it('should not end line comments with newlines other than \\n', () => {
      const newlines = ['\r', '\u2028', '\u2029'];
      newlines.forEach(n => {
        expect('ab').not.toMatch(regex({raw: [`^a#comment${n}b\n$`]}, []));
      });
    });

    it('should start line comments with # that continue until the end of the string if there are no following newlines', () => {
      expect('ac').toMatch(regex`^a#comment b$`);
    });

    it('should allow mixing whitespace and line comments', function() {
      expect('ab').toMatch(regex({raw: ['\f^ a \t\n ##comment\n #\nb $ # ignored']}, []));
    });

    it('should apply a quantifier following whitespace or line comments to the preceding token', function() {
      expect('aaa').toMatch(regex`^a +$`);
      expect('aaa').toMatch(regex({raw: ['^a#comment\n+$']}, []));
      expect('aaa').toMatch(regex({raw: ['^a  #comment\n +$']}, []));
    });

    it('should not let the token following whitespace or line comments modify the preceding token', () => {
        expect('\u{0}0').toMatch(regex`\0 0`);
        expect('\u{0}1').toMatch(regex`\0 1`);
        expect('\u{0}1').toMatch(regex({raw: ['\0#\n1']}, []));
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
      ];
      values.forEach(v => {
        expect(() => regex({raw: [v]}, [])).withContext(v).toThrow();
      });
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(regex`\ `);
      expect('  ').toMatch(regex` \ \  `);
    });

    it('should allow escaping # to make it significant', () => {
      expect('#').toMatch(regex`\#`);
      expect('##').toMatch(regex` \# \# `);
    });
  });

  describe('in character class context', () => {
    it('should treat space and tab characters as insignificant', () => {
      expect(' ').not.toMatch(regex`[ a]`);
      expect('\t').not.toMatch(regex({raw: ['[\ta]']}, []));
    });

    it('should not treat whitespace characters apart from space and tab as insignificant', () => {
      expect('\n').toMatch(regex({raw: ['[\na]']}, []));
      expect('\xA0').toMatch(regex({raw: ['[\xA0a]']}, []));
      expect('\u2028').toMatch(regex({raw: ['[\u2028a]']}, []));
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
        expect('0').toMatch(regex`[\0 0]`);
        expect('1').toMatch(regex`[\0 1]`);
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
        expect(() => regex({raw: [v]}, [])).withContext(v).toThrow();
      });
    });

    it('should throw if two unescaped hyphens are separated by whitespace', () => {
      const values = [
        '[- -]',
        '[ - -]',
        '[- - ]',
        '[ - - ]',
        '[a- -]',
        '[a - -]',
        '[- -b]',
        '[- - b]',
        '[a- -b]',
        '[a- - b]',
        '[a - -b]',
        '[a - - b]',
      ];
      values.forEach(v => {
        expect(() => regex({raw: [v]}, [])).withContext(v).toThrow();
      });
    });

    it('should allow set operators to be offset by whitespace', () => {
      expect('a').toMatch(regex`[\w -- _]`);
      expect('a').toMatch(regex`[\w-- _]`);
      expect('a').toMatch(regex`[\w --_]`);
      expect('a').toMatch(regex`[\w && [a-z]]`);
      expect('a').toMatch(regex`[\w&& [a-z]]`);
      expect('a').toMatch(regex`[\w &&[a-z]]`);
    });

    it('should match (as a literal character) a lone double-punctuator character separated from its partner by whitespace', () => {
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
      doublePunctuatorChars.forEach(c => {
        expect(c).withContext(`[a${c} ${c}b]`).toMatch(regex({raw: [`[a${c} ${c}b]`]}, []));
        expect(c).withContext(`[a${c} ${c} b]`).toMatch(regex({raw: [`[a${c} ${c} b]`]}, []));
        expect(c).withContext(`[a ${c} ${c}b]`).toMatch(regex({raw: [`[a ${c} ${c}b]`]}, []));
        expect(c).withContext(`[a ${c} ${c} b]`).toMatch(regex({raw: [`[a ${c} ${c} b]`]}, []));
      });
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(regex`[ \ ]`);
      expect(' ').toMatch(regex`[\q{ \ }]`);
    });
  });

  it('should set flag x status with an experimental option', () => {
    expect('a b').not.toMatch(regex({__flagX: true})`a b`);
    expect('a b').toMatch(regex({__flagX: false})`a b`);
  });
});
