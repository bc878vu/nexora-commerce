import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** Hash a plaintext password. Never store or log plaintext passwords. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

/** Constant-time password comparison. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
