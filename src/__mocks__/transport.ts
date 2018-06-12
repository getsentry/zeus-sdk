export class Transport {
  public static instance: Transport;
  public postForm: jest.Mock;
  public request: jest.Mock;
  public requestJson: jest.Mock;

  public constructor() {
    Transport.instance = this;
    this.postForm = jest.fn();
    this.request = jest.fn();
    this.requestJson = jest.fn();
  }
}
