export class AuthMeResponse {
  constructor(
    public readonly uuid: string,
    public readonly email: string,
  ) {}
}
