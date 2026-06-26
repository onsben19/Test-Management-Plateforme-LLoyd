export function generateSecurePassword(length = 12): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*';
    const all = upper + lower + digits + symbols;

    const pick = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));

    let password = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
    for (let i = password.length; i < length; i++) {
        password += pick(all);
    }

    return password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
}
