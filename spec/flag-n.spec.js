describe('flag n', () => {
  it('should cause () to be noncapturing', () => {
    expect(regex`()`.exec('').length).toBe(1);
  });

  it('should continue to treat (?:) as noncapturing', () => {
    expect(regex`(?:)`.exec('').length).toBe(1);
  });

  it('should continue to allow (?<name>) for capturing', () => {
    expect(regex`(?<name>)`.exec('').length).toBe(2);
    expect(regex`(?<name>)()`.exec('').length).toBe(2);
  });

  it('should not allow numbered backreferences', () => {
    expect(() => regex`()\1`).toThrow();
  });

  it('should not allow numbered backreferences within interpolated patterns', () => {
    expect(() => regex`${pattern`()\1`}`).toThrow();
    expect(() => regex`()${pattern`\1`}`).toThrow();
    expect(() => regex`${pattern`()`}\1`).toThrow();
  });

  it('should not apply to interpolated regexes', () => {
    expect('aa').toMatch(regex`${/(a)\1/}`);
  });

  it('should allow controlling implicit flag n via disable.n', () => {
    expect(() => regex({disable: {n: true}})`()\1`).not.toThrow();
    expect(() => regex({disable: {n: false}})`()\1`).toThrow();
  });
});
