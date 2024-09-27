describe('interpolation: numbers', () => {
  describe('in default context', () => {
    it('should convert numbers to hexadecimal in enclosed tokens', () => {
      expect('a').toMatch(regex`\u{${97}}`);
    });
  });

  describe('in character class context', () => {
    it('should convert numbers to hexadecimal in enclosed tokens', () => {
      expect('a').toMatch(regex`[\u{${97}}]`);
    });
  });
});
