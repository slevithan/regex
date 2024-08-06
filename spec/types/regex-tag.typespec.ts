import {expectTypeOf} from 'expect-type';

// I wasn't able to get `tsc` to be happy importing the whole package, but it also balks at
// importing a non-type from a declaration file
// @ts-expect-error
import {type RegexTag, regex} from '../../types/regex.d.ts';

expectTypeOf(regex).toEqualTypeOf<RegexTag<RegExp>>();

// Ensure that the correct type is returned when using a tag
expectTypeOf(regex``).toEqualTypeOf<RegExp>();

// Ensure that adding flags doesn't change the type
expectTypeOf(regex('')).toEqualTypeOf<RegexTag<RegExp>>();

// Ensure that adding options doesn't change the type
expectTypeOf(regex({flags: ''})).toEqualTypeOf<RegexTag<RegExp>>();

// Ensure that the `subclass` option changes the type to a `RegExp` subclass
expectTypeOf(regex({subclass: true})).not.toEqualTypeOf<RegexTag<RegExp>>();
expectTypeOf(regex({subclass: true})).toMatchTypeOf<RegexTag<RegExp>>();
