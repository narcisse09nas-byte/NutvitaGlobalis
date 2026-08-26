// Shared temporary-password generator for staff-provisioned accounts — lifted from
// app/api/ppm/staff/route.ts's generator (ambiguous characters excluded), reused by the new
// Maximus invoicing "new client" flow. Not retrofitted into the other routes that already carry
// their own copy (app/api/ppm/staff, app/api/partner/clients, app/api/medical/patients).
export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i += 1) password += alphabet[Math.floor(Math.random() * alphabet.length)];
  return password;
}
