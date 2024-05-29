describe('partial', () => {
  describe('strings', () => {
    it('should accept empty arguments', () => {
      expect(String(Regex.partial())).toBe('');
      expect(String(Regex.partial(undefined))).toBe('');
    });

    it('should coerce to string', () => {
      expect(String(Regex.partial('1'))).toBe('1');
      expect(String(Regex.partial(1))).toBe('1');
      expect(String(Regex.partial(NaN))).toBe('NaN');
    });
  });

  describe('templates', () => {
    it('should accept a template', () => {
      expect(Regex.partial``).toBeInstanceOf(Regex.partial('').constructor);
    });
  
    it('should process templates as raw strings', () => {
      expect(String(Regex.partial`\\`)).toBe('\\\\');
    });
  
    it('should process templates with interpolated values', () => {
      expect(String(Regex.partial`1${'2'}${3}4`)).toBe('1234');
    });
  });
});
