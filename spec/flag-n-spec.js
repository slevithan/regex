describe('flag n', () => {
  it('should cause () to be noncapturing', function() {
    expect(regex`()`.exec('').length).toBe(1);
  });

  it('should continue to treat (?:) as noncapturing', function() {
    expect(regex`(?:)`.exec('').length).toBe(1);
  });

  it('should continue to allow (?<name>) for capturing', function() {
    expect(regex`(?<name>)`.exec('').length).toBe(2);
    expect(regex`(?<name>)()`.exec('').length).toBe(2);
  });

  it('should not allow numbered backreferences', function() {
    expect(() => regex`()\1`).toThrow();
  });

  it('should not allow numbered backreferences within partials', function() {
    expect(() => regex`${partial`()\1`}`).toThrow();
    expect(() => regex`()${partial`\1`}`).toThrow();
    expect(() => regex`${partial`()`}\1`).toThrow();
  });

  it('should not apply to interpolated regexes', () => {
    expect('aa').toMatch(regex`${/(a)\1/}`);
  });

  it('should set flag n status with an experimental option', () => {
    expect(() => regex({__flagN: true})`()\1`).toThrow();
    expect('aa').toMatch(regex({__flagN: false})`(a)\1`);
  });
});
