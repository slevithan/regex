// Ensure transformations have not changed native syntax
describe('regex syntax', () => {
  it('should throw for \\0 followed by a digit', () => {
    expect(() => Regex.make`\00`).toThrow();
    expect(() => Regex.make`\01`).toThrow();
    expect(() => Regex.make`[\00]`).toThrow();
    expect(() => Regex.make`[\01]`).toThrow();
  });
});
