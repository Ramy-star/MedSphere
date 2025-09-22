export function naturalSort(a: string, b: string) {
  return new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare(a, b);
}
