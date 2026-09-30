export type AuthenticatedSession = {
  user: { uuid: string; email: string };
  token: string;
};
