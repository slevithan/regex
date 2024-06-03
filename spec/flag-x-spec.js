describe('flag x', () => {
  describe('in default context', () => {
    it('should treat whitespace as insignificant', () => {
      const ws = '\t\n\v\f\r \xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF';
      expect('ab').toMatch(Regex.make({raw: [`^a${ws}b$`]}, []));
    });

    it('should start line comments with # that continue until the next \\n', () => {
      expect('ab').toMatch(Regex.make`^a#comment\nb$`);
    });

    it('should not end line comments with newlines other than \\n', () => {
      const newlines = ['\r', '\u2028', '\u2029'];
      newlines.forEach(n => {
        expect('ab').not.toMatch(Regex.make({raw: [`^a#comment${n}b\n$`]}, []));
      });
    });

    it('should start line comments with # that continue until the end of the string if there are no following newlines', () => {
      expect('ac').toMatch(Regex.make`^a#comment b$`);
    });

    it('should allow mixing whitespace and line comments', function() {
      expect('ab').toMatch(Regex.make({raw: ['\f^ a \t\n ##comment\n #\nb $ # ignored']}, []));
    });

    it('should apply a quantifier following whitespace or line comments to the preceding token', function() {
      expect('aaa').toMatch(Regex.make`^a +$`);
      expect('aaa').toMatch(Regex.make({raw: ['^a#comment\n+$']}, []));
      expect('aaa').toMatch(Regex.make({raw: ['^a  #comment\n +$']}, []));
    });

    it('should not let the token following whitespace or line comments modify the preceding token', () => {
        expect('\u{0}0').toMatch(Regex.make`\0 0`);
        expect('\u{0}1').toMatch(Regex.make`\0 1`);
        expect('\u{0}1').toMatch(Regex.make({raw: ['\0#\n1']}, []));
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
        expect(() => Regex.make({raw: [v]}, [])).withContext(v).toThrow();
      });
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(Regex.make`\ `);
      expect('  ').toMatch(Regex.make` \ \  `);
    });

    it('should allow escaping # to make it significant', () => {
      expect('#').toMatch(Regex.make`\#`);
      expect('##').toMatch(Regex.make` \# \# `);
    });
  });

  describe('in character class context', () => {
    it('should treat space and tab characters as insignificant', () => {
      expect(' ').not.toMatch(Regex.make`[ a]`);
      expect('\t').not.toMatch(Regex.make({raw: ['[\ta]']}, []));
    });

    it('should not treat whitespace characters apart from space and tab as insignificant', () => {
      expect('\n').toMatch(Regex.make({raw: ['[\na]']}, []));
      expect('\xA0').toMatch(Regex.make({raw: ['[\xA0a]']}, []));
      expect('\u2028').toMatch(Regex.make({raw: ['[\u2028a]']}, []));
    });

    it('should not start comments with #', () => {
      expect('#').toMatch(Regex.make`[#a]`);
    });

    it ('should not let a leading ^ following whitespace change the character class type', () => {
      expect('^').toMatch(Regex.make`[ ^]`);
      expect('_').not.toMatch(Regex.make`[ ^]`);
      expect('^').toMatch(Regex.make`[ ^a]`);
      expect('_').not.toMatch(Regex.make`[ ^a]`);
    });

    it('should not let the token following whitespace modify the preceding token', () => {
        expect('0').toMatch(Regex.make`[\0 0]`);
        expect('1').toMatch(Regex.make`[\0 1]`);
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
        expect(() => Regex.make({raw: [v]}, [])).withContext(v).toThrow();
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
        expect(() => Regex.make({raw: [v]}, [])).withContext(v).toThrow();
      });
    });

    it('should allow set operators to be offset by whitespace', () => {
      expect('a').toMatch(Regex.make`[\w -- _]`);
      expect('a').toMatch(Regex.make`[\w-- _]`);
      expect('a').toMatch(Regex.make`[\w --_]`);
      expect('a').toMatch(Regex.make`[\w && [a-z]]`);
      expect('a').toMatch(Regex.make`[\w&& [a-z]]`);
      expect('a').toMatch(Regex.make`[\w &&[a-z]]`);
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
        expect(c).withContext(`[a${c} ${c}b]`).toMatch(Regex.make({raw: [`[a${c} ${c}b]`]}, []));
        expect(c).withContext(`[a${c} ${c} b]`).toMatch(Regex.make({raw: [`[a${c} ${c} b]`]}, []));
        expect(c).withContext(`[a ${c} ${c}b]`).toMatch(Regex.make({raw: [`[a ${c} ${c}b]`]}, []));
        expect(c).withContext(`[a ${c} ${c} b]`).toMatch(Regex.make({raw: [`[a ${c} ${c} b]`]}, []));
      });
    });

    it('should allow escaping whitespace to make it significant', () => {
      expect(' ').toMatch(Regex.make`[ \ ]`);
      expect(' ').toMatch(Regex.make`[\q{ \ }]`);
    });
  });

  it('should set flag x status with an experimental option', () => {
    expect('a b').not.toMatch(Regex.make({__flag_x: true})`a b`);
    expect('a b').toMatch(Regex.make({__flag_x: false})`a b`);
  });
});
