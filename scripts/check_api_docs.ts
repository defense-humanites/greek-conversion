/**
 * Lints the documentation of the public API, as `deno doc --lint` did until
 * 1.0.0-rc.7: every export of the two entry points, and every member of an
 * exported class or interface, has a JSDoc comment; no export refers to a type
 * that is not exported; every `{@link}` resolves.
 *
 * The members of an inline object type, such as the literal defaults of
 * `DefaultConversionOptions`, are documented by the property that holds the
 * type, not one by one.
 *
 * Run with `node scripts/check_api_docs.ts`.
 */
import {
  Application,
  DeclarationReflection,
  type Reflection,
  ReflectionKind,
  ReflectionType,
  TSConfigReader,
} from "typedoc";

const app = await Application.bootstrapWithPlugins({
  entryPoints: ["src/mod.ts", "src/document.ts"],
  tsconfig: "tsconfig.build.json",
  logLevel: "Warn",
  validation: {
    notExported: true,
    invalidLink: true,
    rewrittenLink: true,
    notDocumented: false,
  },
}, [new TSConfigReader()]);

const project = await app.convert();
if (project === undefined) process.exit(1);
app.validate(project);

const REQUIRED = ReflectionKind.Enum | ReflectionKind.EnumMember |
  ReflectionKind.Variable | ReflectionKind.Function | ReflectionKind.Class |
  ReflectionKind.Interface | ReflectionKind.Property | ReflectionKind.Method |
  ReflectionKind.Accessor | ReflectionKind.Constructor |
  ReflectionKind.TypeAlias;

const undocumented: string[] = [];
for (const reflection of project.getReflectionsByKind(REQUIRED)) {
  if (insideInlineType(reflection)) continue;
  // Members inherited from `Error` are documented there.
  if (
    reflection instanceof DeclarationReflection &&
    reflection.inheritedFrom !== undefined
  ) continue;
  if (documented(reflection)) continue;
  undocumented.push(
    `${reflection.getFriendlyFullName()} (${
      ReflectionKind[reflection.kind]
    }) has no documentation`,
  );
}

for (const message of undocumented) console.error(message);
const problems = undocumented.length + (app.logger.hasErrors() ? 1 : 0) +
  (app.logger.hasWarnings() ? 1 : 0);
if (problems > 0) {
  console.error("\nThe public API documentation has problems.");
  process.exit(1);
}
console.log(
  `${project.getReflectionsByKind(REQUIRED).length} documented declarations.`,
);

/** A member of an inline object type, or a parameter's. */
function insideInlineType(reflection: Reflection): boolean {
  for (let parent = reflection.parent; parent; parent = parent.parent) {
    if (parent.kindOf(ReflectionKind.TypeLiteral | ReflectionKind.Parameter)) {
      return true;
    }
  }
  return false;
}

/**
 * Functions, methods, and constructors are documented through their
 * signatures; an overload set needs one comment, on any signature.
 */
function documented(reflection: Reflection): boolean {
  if (reflection.hasComment()) return true;
  if (!(reflection instanceof DeclarationReflection)) return false;
  const signatures = reflection.type instanceof ReflectionType
    ? reflection.type.declaration.getNonIndexSignatures()
    : reflection.getNonIndexSignatures();
  if (reflection.getSignature !== undefined) {
    signatures.push(reflection.getSignature);
  }
  if (reflection.setSignature !== undefined) {
    signatures.push(reflection.setSignature);
  }
  return signatures.some((signature) => signature.hasComment());
}
