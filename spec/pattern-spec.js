describe('pattern', () => {
  it('should not modify strings', () => {
    expect(String(pattern('1'))).toBe('1');
    expect(String(pattern('.'))).toBe('.');
  });

  it('should coerce non-string values', () => {
    expect(String(pattern(1))).toBe('1');
    expect(String(pattern(NaN))).toBe('NaN');
  });

  it('should accept empty arguments', () => {
    expect(String(pattern())).toBe('');
    expect(String(pattern(undefined))).toBe('');
  });

  describe('templates', () => {
    it('should accept a template', () => {
      expect(pattern``).toBeInstanceOf(pattern('').constructor);
    });
  
    it('should process templates as raw strings', () => {
      expect(String(pattern`\\`)).toBe('\\\\');
    });
  
    it('should process templates with interpolated values', () => {
      expect(String(pattern`1${'2'}${3}4`)).toBe('1234');
    });
  });
});
