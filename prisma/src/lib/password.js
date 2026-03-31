import bcrypt from "bcrypt";
const SALT_ROUNDS = 10;
export async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}
export async function verifyPassword(password, storedPassword) {
    try {
        return await bcrypt.compare(password, storedPassword);
    }
    catch {
        return false;
    }
}
