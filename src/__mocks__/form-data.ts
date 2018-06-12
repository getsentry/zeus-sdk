'use strict';

module.exports = class FormData {
  private readonly options: any;
  private readonly data: Record<string, any>;

  public constructor(options: any) {
    this.options = options;
    this.data = {};
  }

  public append(field: string, value: any, options: any): void {
    this.data[field] = { value, options };
  }

  public getHeaders(): Record<string, string> {
    return {
      'content-type': 'multipart/form-data; boundary=---feedface',
    };
  }

  public getLength(cb: (e?: Error, len?: number) => void): void {
    cb(undefined, 42);
  }
};
