import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
export async function checkRole(address: string, allowedRoles: Role[]) {
  if (!address) return false;

  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) return false;

  return allowedRoles.includes(user.role);
}

export async function getRole(address: string) {
  if (!address) return Role.INVESTOR;

  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  return user?.role || Role.INVESTOR;
}
