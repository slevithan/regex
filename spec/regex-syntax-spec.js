// Ensure transformations have not changed native syntax and errors
describe('regex syntax', () => {
  it('should throw for \\0 followed by a digit', () => {
    expect(() => Regex.make`\00`).toThrow();
    expect(() => Regex.make`\01`).toThrow();
    expect(() => Regex.make`[\00]`).toThrow();
    expect(() => Regex.make`[\01]`).toThrow();
  });

  it('should throw for unescaped - on a character class range boundary', () => {
    expect(() => Regex.make`[\0--]`).toThrow();
    expect(() => Regex.make`[--\xFF]`).toThrow();
    // These in fact create invalid set operations via union and subtraction at the same depth
    expect(() => Regex.make`[a\0--b]`).toThrow();
    expect(() => Regex.make`[a--\xFFb]`).toThrow();
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
      expect(() => Regex.make({raw: [`[a${dp}b]`]}, [])).withContext(dp).toThrow();
    });
    allDoublePunctuatorsExcludingCaret.forEach(dp => {
      expect(() => Regex.make({raw: [`[${dp}]`]}, [])).withContext(dp).toThrow();
      expect(() => Regex.make({raw: [`[${dp}b]`]}, [])).withContext(dp).toThrow();
      expect(() => Regex.make({raw: [`[a${dp}]`]}, [])).withContext(dp).toThrow();
    });
    expect(() => Regex.make`[^^^]`).withContext('^^').toThrow();
    expect(() => Regex.make`[^^^b]`).withContext('^^').toThrow();
    expect(() => Regex.make`[a^^]`).withContext('^^').toThrow();
  });
});
