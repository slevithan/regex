import {expectTypeOf} from 'expect-type';

// I wasn't able to get `tsc` to be happy importing the whole package, but it also balks at
// importing a non-type from a declaration file
//
// @ts-expect-error
import {type RegexTag, regex} from '../../types/regex.d.ts';

class Subclass extends RegExp {}

class NonSubclass {
  constructor(foo: string, bar: string) {}
}

class InvalidClass {
  constructor(count: number) {}
}

expectTypeOf(regex).toEqualTypeOf<RegexTag<RegExp>>();

const subclassTag = regex.bind(Subclass);
const nonSubclassTag = regex.bind(NonSubclass);

// InvalidClass doesn't have a constructor which takes two strings, which is a requirement for use
// as an alternate regex class
//
// @ts-expect-error
regex.bind(InvalidClass);

// Ensure that `RegExp` gets replaced with the bound class when binding a constructor
expectTypeOf(subclassTag).toEqualTypeOf<RegexTag<Subclass>>();
expectTypeOf(nonSubclassTag).toEqualTypeOf<RegexTag<NonSubclass>>();

// …even if it was already bound to something else
expectTypeOf(subclassTag.bind(NonSubclass)).toEqualTypeOf<RegexTag<NonSubclass>>();

// Ensure that the correct type is returned when using a tag
expectTypeOf(regex`foo`).toMatchTypeOf<RegExp>();
expectTypeOf(subclassTag`foo`).toMatchTypeOf<Subclass>();
expectTypeOf(nonSubclassTag`foo`).toMatchTypeOf<NonSubclass>();

// Ensure that adding flags doesn't change the type
expectTypeOf(regex('gi')).toEqualTypeOf<RegexTag<RegExp>>();
expectTypeOf(subclassTag('gi')).toEqualTypeOf<RegexTag<Subclass>>();
expectTypeOf(nonSubclassTag('gi')).toEqualTypeOf<RegexTag<NonSubclass>>();

// Ensure that adding options doesn't change the type
expectTypeOf(regex({flags: 'gi'})).toEqualTypeOf<RegexTag<RegExp>>();
expectTypeOf(subclassTag({flags: 'gi'})).toEqualTypeOf<RegexTag<Subclass>>();
expectTypeOf(nonSubclassTag({flags: 'gi'})).toEqualTypeOf<RegexTag<NonSubclass>>();
