describe('partial', () => {
  describe('strings', () => {
    it('should accept empty arguments', () => {
      expect(String(partial())).toBe('');
      expect(String(partial(undefined))).toBe('');
    });

    it('should coerce to string', () => {
      expect(String(partial('1'))).toBe('1');
      expect(String(partial(1))).toBe('1');
      expect(String(partial(NaN))).toBe('NaN');
    });
  });

  describe('templates', () => {
    it('should accept a template', () => {
      expect(partial``).toBeInstanceOf(partial('').constructor);
    });
  
    it('should process templates as raw strings', () => {
      expect(String(partial`\\`)).toBe('\\\\');
    });
  
    it('should process templates with interpolated values', () => {
      expect(String(partial`1${'2'}${3}4`)).toBe('1234');
    });
  });
});
