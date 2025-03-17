export function concatNamespace(namespace: string, name: string, separator = "-"): string {
    return `${namespace}${name.startsWith(separator) ? "" : separator}${name}`;
}

