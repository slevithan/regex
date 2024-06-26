describe('backcompat', () => {
  it('should implicitly add flag u when flag v unavailable', () => {
    expect(regex({__flagV: false})``.flags).toContain('u');
    expect(regex({__flagV: false})``.unicode).toBeTrue();
    expect(regex({__flagV: false, flags: 'g'})``.unicode).toBeTrue();

    if (!flagVSupported) {
      expect(regex``.flags).toContain('u');
      expect(regex``.unicode).toBeTrue();
      expect(regex('g')``.unicode).toBeTrue();
    }
  });

  it('should not allow explicitly adding implicit flag u', () => {
    expect(() => regex({__flagV: false, flags: 'u'})``).toThrow();
    expect(() => regex({__flagV: false, flags: 'ium'})``).toThrow();
  });

  it('should require escaping characters in character classes when escapes are required by flag v but optional without it', () => {
    expect(() => regex({__flagV: false})`[(]`).toThrow();
    expect(() => regex({__flagV: false})`[)]`).toThrow();
    expect(() => regex({__flagV: false})`[[]`).toThrow();
    expect(() => regex({__flagV: false})`[{]`).toThrow();
    expect(() => regex({__flagV: false})`[}]`).toThrow();
    expect(() => regex({__flagV: false})`[/]`).toThrow();
    expect(() => regex({__flagV: false})`[-]`).toThrow();
    expect(() => regex({__flagV: false})`[|]`).toThrow();
    // Literal `-` in character class
    expect(() => regex({__flagV: false})`[a-]`).toThrow();
    expect(() => regex({__flagV: false})`[-a]`).toThrow();
    expect(() => regex({__flagV: false})`[\0--]`).toThrow();
    expect(() => regex({__flagV: false})`[--\uFFFF]`).toThrow();
    expect(() => regex({__flagV: false})`[a-\d]`).toThrow();
    expect(() => regex({__flagV: false})`[\d-a]`).toThrow();
  });

  it('should allow escaping characters in character classes when escapes are permitted by flag v but invalid without it', () => {
    expect('&').toMatch(regex({__flagV: false})`^[\&]$`);
    expect('!').toMatch(regex({__flagV: false})`^[\!]$`);
    expect('#').toMatch(regex({__flagV: false})`^[\#]$`);
    expect('%').toMatch(regex({__flagV: false})`^[\%]$`);
    expect(',').toMatch(regex({__flagV: false})`^[\,]$`);
    expect(':').toMatch(regex({__flagV: false})`^[\:]$`);
    expect(';').toMatch(regex({__flagV: false})`^[\;]$`);
    expect('<').toMatch(regex({__flagV: false})`^[\<]$`);
    expect('=').toMatch(regex({__flagV: false})`^[\=]$`);
    expect('>').toMatch(regex({__flagV: false})`^[\>]$`);
    expect('@').toMatch(regex({__flagV: false})`^[\@]$`);
    expect('`').toMatch(regex({__flagV: false})({raw: ['^[\\`]$']}));
    expect('~').toMatch(regex({__flagV: false})`^[\~]$`);
  });

  it('should throw for character class set operations when flag v unavailable', () => {
    expect(() => regex({__flagV: false})`[a--b]`).toThrow();
    expect(() => regex({__flagV: false})`[a&&b]`).toThrow();
  });

  it('should throw for reserved double punctuators when flag v unavailable', () => {
    const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~'.split('');
    doublePunctuatorChars.forEach(dp => {
      expect(dp).toMatch(regex({__flagV: false})({raw: ['^[a' + dp + 'b]$']}));
      if (dp !== '&') {
        expect(() => regex({__flagV: false})({raw: ['[a' + dp + dp + 'b]']})).toThrow();
      }
    });
  });

  it('should throw for nested character classes when flag v unavailable', () => {
    expect(() => regex({__flagV: false})`[[]]`).toThrow();
    expect(() => regex({__flagV: false})`[^[]]`).toThrow();
    expect(() => regex({__flagV: false})`[]]`).toThrow();
  });

  it('should throw for doubly negated sets with flag i when flag v unavailable', () => {
    expect(() => regex({__flagV: false, flags: 'i'})`[^\P{Ll}]`).toThrow();
  });
});
