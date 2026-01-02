const makeShelfCode = (len = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const generateUniqueShelfCode = async (prisma, len = 6) => {
  let shelfCode = makeShelfCode(len);

  while (await prisma.teacher.findUnique({ where: { shelfCode } })) {
    shelfCode = makeShelfCode(len);
  }

  return shelfCode;
};

module.exports = { makeShelfCode, generateUniqueShelfCode };
