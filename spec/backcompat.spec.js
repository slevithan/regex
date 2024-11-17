describe('backcompat', () => {
  it('should implicitly add flag u when flag v unavailable', () => {
    expect(regex({disable: {v: true}})``.flags).toContain('u');
    expect(regex({disable: {v: true}})``.unicode).toBeTrue();
    expect(regex({disable: {v: true}, flags: 'g'})``.unicode).toBeTrue();
    if (!envSupportsFlagV) {
      expect(regex``.flags).toContain('u');
      expect(regex``.unicode).toBeTrue();
      expect(regex('g')``.unicode).toBeTrue();
    }
  });

  it('should not allow explicitly adding implicit flag u', () => {
    expect(() => regex({disable: {v: true}, flags: 'u'})``).toThrow();
    expect(() => regex({disable: {v: true}, flags: 'ium'})``).toThrow();
  });

  it('should require escaping characters in character classes when escapes are required by flag v but optional without it', () => {
    expect(() => regex({disable: {v: true}})`[(]`).toThrow();
    expect(() => regex({disable: {v: true}})`[)]`).toThrow();
    expect(() => regex({disable: {v: true}})`[[]`).toThrow();
    expect(() => regex({disable: {v: true}})`[{]`).toThrow();
    expect(() => regex({disable: {v: true}})`[}]`).toThrow();
    expect(() => regex({disable: {v: true}})`[/]`).toThrow();
    expect(() => regex({disable: {v: true}})`[-]`).toThrow();
    expect(() => regex({disable: {v: true}})`[|]`).toThrow();
    // Literal `-` in character class
    expect(() => regex({disable: {v: true}})`[a-]`).toThrow();
    expect(() => regex({disable: {v: true}})`[-a]`).toThrow();
    expect(() => regex({disable: {v: true}})`[\0--]`).toThrow();
    expect(() => regex({disable: {v: true}})`[--\uFFFF]`).toThrow();
    expect(() => regex({disable: {v: true}})`[a-\d]`).toThrow();
    expect(() => regex({disable: {v: true}})`[\d-a]`).toThrow();
  });

  it('should allow unescaped { and } in character classes when part of a valid token', () => {
    expect('a').toMatch(regex({disable: {v: true}})`^[\u{61}]$`);
    expect('a').toMatch(regex({disable: {v: true}})`^[\p{L}]$`);
    expect('a').toMatch(regex({disable: {v: true}})`^[^\P{L}]$`);
  });

  it('should allow escaping characters in character classes when escapes are permitted by flag v but invalid without it', () => {
    expect('&').toMatch(regex({disable: {v: true}})`^[\&]$`);
    expect('!').toMatch(regex({disable: {v: true}})`^[\!]$`);
    expect('#').toMatch(regex({disable: {v: true}})`^[\#]$`);
    expect('%').toMatch(regex({disable: {v: true}})`^[\%]$`);
    expect(',').toMatch(regex({disable: {v: true}})`^[\,]$`);
    expect(':').toMatch(regex({disable: {v: true}})`^[\:]$`);
    expect(';').toMatch(regex({disable: {v: true}})`^[\;]$`);
    expect('<').toMatch(regex({disable: {v: true}})`^[\<]$`);
    expect('=').toMatch(regex({disable: {v: true}})`^[\=]$`);
    expect('>').toMatch(regex({disable: {v: true}})`^[\>]$`);
    expect('@').toMatch(regex({disable: {v: true}})`^[\@]$`);
    expect('`').toMatch(regex({disable: {v: true}})({raw: ['^[\\`]$']}));
    expect('~').toMatch(regex({disable: {v: true}})`^[\~]$`);
  });

  it('should throw for character class set operations when flag v unavailable', () => {
    expect(() => regex({disable: {v: true}})`[a--b]`).toThrow();
    expect(() => regex({disable: {v: true}})`[a&&b]`).toThrow();
  });

  it('should throw for reserved double punctuators when flag v unavailable', () => {
    const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~'.split('');
    doublePunctuatorChars.forEach(dp => {
      expect(dp).toMatch(regex({disable: {v: true}})({raw: ['^[a' + dp + 'b]$']}));
      if (dp !== '&') {
        expect(() => regex({disable: {v: true}})({raw: ['[a' + dp + dp + 'b]']})).toThrow();
      }
    });
  });

  it('should throw for nested character classes when flag v unavailable', () => {
    expect(() => regex({disable: {v: true}})`[[]]`).toThrow();
    expect(() => regex({disable: {v: true}})`[^[]]`).toThrow();
    expect(() => regex({disable: {v: true}})`[]]`).toThrow();
  });
});
