interface Node<T> {
  children: Map<string, Node<T>>;
  /**
   * The key that ends here, as longest() returns it: built once and frozen,
   * since every call that finds the key shares it, so that reading a letter
   * allocates nothing.
   */
  match?: { readonly value: T; readonly length: number };
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
    let length = 0;

    for (const char of key) {
      length++;
      let child = node.children.get(char);

      if (!child) {
        child = { children: new Map() };
        node.children.set(char, child);
      }

      node = child;
    }

    node.match = Object.freeze({ value, length });
  }

  /**
   * Returns the longest key that starts at `start`, reading `lowered`, the
   * input's characters already lowercased. The result is shared by every
   * call that finds the same key: it must not be changed.
   */
  longest(
    lowered: readonly string[],
    start: number,
  ): { readonly value: T; readonly length: number } | undefined {
    let node = this.#root;
    let match: Node<T>["match"];

    for (let i = start; i < lowered.length; i++) {
      const child = node.children.get(lowered[i]);

      if (!child) break;

      node = child;
      if (node.match !== undefined) match = node.match;
    }

    return match;
  }
}
