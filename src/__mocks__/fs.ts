function createWriteStream(): any {
  return {
    on: (action, callback) => {
      if (action === 'finish') {
        callback();
      }
    },
  };
}

export { createWriteStream };
