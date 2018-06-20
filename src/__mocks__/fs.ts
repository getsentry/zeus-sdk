function createWriteStream(): any {
  return {
    on: (action, callback) => {
      if (action === 'finish') {
        callback();
      }
    },
  };
}

const existsSync = jest.fn();
const lstatSync = jest.fn();
export { createWriteStream, existsSync, lstatSync };
