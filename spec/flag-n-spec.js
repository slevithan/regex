describe('flag n', () => {
  it('should cause () to be noncapturing', function() {
    expect(Regex.make`()`.exec('').length).toBe(1);
  });

  it('should continue to treat (?:) as noncapturing', function() {
    expect(Regex.make`(?:)`.exec('').length).toBe(1);
  });

  it('should continue to allow (?<name>) for capturing', function() {
    expect(Regex.make`(?<name>)`.exec('').length).toBe(2);
    expect(Regex.make`(?<name>)()`.exec('').length).toBe(2);
  });

  it('should not allow numbered backreferences', function() {
    expect(() => Regex.make`()\1`).toThrow();
  });

  it('should not allow numbered backreferences within partials', function() {
    expect(() => Regex.make`${Regex.partial`()\1`}`).toThrow();
    expect(() => Regex.make`()${Regex.partial`\1`}`).toThrow();
    expect(() => Regex.make`${Regex.partial`()`}\1`).toThrow();
  });

  it('should not apply to interpolated regexes', () => {
    expect('aa').toMatch(Regex.make`${/(a)\1/}`);
  });

  it('should set flag n status with an experimental option', () => {
    expect(() => Regex.make({__flagN: true})`()\1`).toThrow();
    expect('aa').toMatch(Regex.make({__flagN: false})`(a)\1`);
  });
});
