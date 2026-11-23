export const PASSWORD_POLICY_MESSAGE = "Use 12 or more characters, including a letter (maximum 72 UTF-8 bytes).";

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 12 &&
    /[a-zA-Z]/.test(password) && new TextEncoder().encode(password).length <= 72;
}
