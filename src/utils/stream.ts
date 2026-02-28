/**
 * Collect all chunks from an async iterable into an array.
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Create a simple async push/pull channel.
 * Useful for bridging callback-based APIs to async iterables.
 */
export function createChannel<T>(): {
  push: (value: T) => void;
  done: () => void;
  iterable: AsyncIterable<T>;
} {
  const queue: T[] = [];
  let resolve: (() => void) | null = null;
  let finished = false;

  const push = (value: T) => {
    queue.push(value);
    if (resolve) {
      resolve();
      resolve = null;
    }
  };

  const done = () => {
    finished = true;
    if (resolve) {
      resolve();
      resolve = null;
    }
  };

  const iterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<T>> {
          while (queue.length === 0 && !finished) {
            await new Promise<void>((r) => {
              resolve = r;
            });
          }
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          return { value: undefined as any, done: true };
        },
      };
    },
  };

  return { push, done, iterable };
}
