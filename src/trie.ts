interface Node<T> {
  children: Map<string, Node<T>>;
  value?: T;
}

export class Trie<T> {
  readonly #root: Node<T> = {
    children: new Map(),
  };

  constructor(entries: Iterable<readonly [string, T]>) {
    for (const [key, value] of entries) this.#insert(key, value);
  }

  #insert(key: string, value: T) {
    let node = this.#root;

    for (const char of key) {
      let child = node.children.get(char);

      if (!child) {
        child = { children: new Map() };
        node.children.set(char, child);
      }

      node = child;
    }

    node.value = value;
  }
  /**
   * Returns the longest key that starts at `start`, reading `lowered`, the
   * input's characters already lowercased.
   */
  longest(
    lowered: readonly string[],
    start: number,
  ): { value: T; length: number } | undefined {
    let node = this.#root;
    let value: T | undefined;
    let length = 0;

    for (let i = start; i < lowered.length; i++) {
      const child = node.children.get(lowered[i]);

      if (!child) break;

      node = child;

      if (node.value !== undefined) {
        value = node.value;
        length = i - start + 1;
      }
    }

    return value === undefined ? undefined : { value, length };
  }
}
