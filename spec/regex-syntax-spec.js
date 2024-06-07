// Ensure transformations have not changed native syntax and errors
describe('regex syntax', () => {
  it('should throw for \\0 followed by a digit', () => {
    expect(() => regex`\00`).toThrow();
    expect(() => regex`\01`).toThrow();
    expect(() => regex`[\00]`).toThrow();
    expect(() => regex`[\01]`).toThrow();
  });

  it('should throw for unescaped - on a character class range boundary', () => {
    expect(() => regex`[\0--]`).toThrow();
    expect(() => regex`[--\xFF]`).toThrow();
    // These in fact create invalid set operations via union and subtraction at the same depth
    expect(() => regex`[a\0--b]`).toThrow();
    expect(() => regex`[a--\xFFb]`).toThrow();
  });

  it('should throw for reserved double punctuators in a character class', () => {
    const reservedDoublePunctuatorsExcludingCaret = [
      '!!',
      '##',
      '$$',
      '%%',
      '**',
      '++',
      ',,',
      '..',
      '::',
      ';;',
      '<<',
      '==',
      '>>',
      '??',
      '@@',
      '``',
      '~~',
    ];
    const allDoublePunctuatorsExcludingCaret = [
      ...reservedDoublePunctuatorsExcludingCaret,
      '&&',
      '--',
    ];
    const reservedDoublePunctuators = [
      ...reservedDoublePunctuatorsExcludingCaret,
      '^^',
    ];
    reservedDoublePunctuators.forEach(dp => {
      expect(() => regex({raw: [`[a${dp}b]`]}, [])).withContext(dp).toThrow();
    });
    allDoublePunctuatorsExcludingCaret.forEach(dp => {
      expect(() => regex({raw: [`[${dp}]`]}, [])).withContext(dp).toThrow();
      expect(() => regex({raw: [`[${dp}b]`]}, [])).withContext(dp).toThrow();
      expect(() => regex({raw: [`[a${dp}]`]}, [])).withContext(dp).toThrow();
    });
    expect(() => regex`[^^^]`).withContext('^^').toThrow();
    expect(() => regex`[^^^b]`).withContext('^^').toThrow();
    expect(() => regex`[a^^]`).withContext('^^').toThrow();
  });
});
