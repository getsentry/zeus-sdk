function createWriteStream(): any {
  return {
    on: (action: any, callback: any) => {
      if (action === 'finish') {
        callback();
      }
    },
  };
}

const existsSync = jest.fn();
const lstatSync = jest.fn();
export { createWriteStream, existsSync, lstatSync };
