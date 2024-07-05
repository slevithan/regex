# Supporting TypeScript

* Creating `.d.ts` files from `.js` files: https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html
  * This produces multiple `.d.ts` files.
  * Single “bundled” `.d.ts` file: use `--outfile`. https://stackoverflow.com/questions/16660277/combine-multiple-typescript-files-into-one-typescript-definition-file
    * I could not get the setup to work with a single compound `.d.ts` file. That would have made the package exports simpler.
* Specifying "types" with package exports: https://www.typescriptlang.org/docs/handbook/modules/reference.html#example-explicit-types-condition
* Overloading function signatures in JSDoc: https://austingil.com/typescript-function-overloads-with-jsdoc/
