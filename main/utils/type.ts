export type StringKeyOf<T> = Extract<keyof T, string>;
export type Thenable<T> = T | Promise<T>;