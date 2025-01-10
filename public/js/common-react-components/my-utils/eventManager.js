export const eventManager = {
  list: new Map(),
  emitQueue: new Map(),

  on(event, callback) {
    if (!this.list.has(event)) this.list.set(event, []);
    this.list.get(event).push(callback);
    return this;
  },

  off(event) {
    this.list.delete(event);
    return this;
  },

  cancelEmit(event) {
    const timers = this.emitQueue.get(event);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.emitQueue.delete(event);
    }

    return this;
  },

  emit(event, ...args) {
    if (this.list.has(event)) {
      this.list.get(event).forEach(callback => {
        const timer = setTimeout(() => {
          callback(...args);
        }, 0);

        if (!this.emitQueue.has(event)) this.emitQueue.set(event, []);
        this.emitQueue.get(event).push(timer);
      });
    }
  }
};
