export function getImportFilePath(args: string[]): string | undefined {
  const fileFlagIndex = args.indexOf("--file");
  if (fileFlagIndex >= 0) {
    return args[fileFlagIndex + 1];
  }

  return args.find((argument) => !argument.startsWith("-"));
}
