export class BoundedCache<K, V> {

  private map = new Map<K, V>();

  constructor(private readonly maxSize: number) {}

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key); // Refresh order
    }

    this.map.set(key, value);

    if (this.map.size > this.maxSize) {
      const lruKey = this.map.keys().next().value;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
      }
    }
  }

  getLastVisitedUri(): K | undefined {
    const lastVisitedUri = Array.from(this.map.keys()).pop();
    return lastVisitedUri;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;

    const value = this.map.get(key)!;
    this.map.delete(key); // Refresh order
    this.map.set(key, value);
    return value;
  }


  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  values(): IterableIterator<V> {
    return this.map.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  /**
   * Required for VS Code's subscription lifecycle.
   * Ensures the cache is cleaned up when the extension is disposed.
   */
  dispose(): void {
    this.clear();
  }

}