describe('pattern', () => {
  it('should not modify strings', () => {
    expect(String(pattern('1'))).toBe('1');
    expect(String(pattern('.'))).toBe('.');
  });

  it('should accept empty arguments', () => {
    expect(String(pattern())).toBe('');
    expect(String(pattern(undefined))).toBe('');
  });

  it('should coerce non-string values', () => {
    expect(String(pattern(null))).toBe('null');
    expect(String(pattern(0))).toBe('0');
    expect(String(pattern(99))).toBe('99');
    expect(String(pattern(NaN))).toBe('NaN');
    expect(String(pattern(true))).toBe('true');
    expect(String(pattern(false))).toBe('false');
    expect(String(pattern(/\./))).toBe('/\\./');
    expect(String(pattern([]))).toBe('');
    expect(String(pattern(['^']))).toBe('^');
    expect(String(pattern({}))).toBe('[object Object]');
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
