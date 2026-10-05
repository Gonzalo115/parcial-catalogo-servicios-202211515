import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const template = await readFile(".env.example", "utf8");
const env = template
  .replace(
    /^POSTGRES_PASSWORD=.*$/m,
    `POSTGRES_PASSWORD=${randomBytes(24).toString("hex")}`,
  )
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString("hex")}`);
try {
  await writeFile(".env", env, { flag: "wx", mode: 0o600 });
  console.log(
    ".env creado. Consulta las contraseñas de evaluación localmente en ese archivo.",
  );
} catch (error) {
  if (error.code === "EEXIST") {
    console.error(".env ya existe; se conserva sin cambios.");
    process.exitCode = 1;
  } else throw error;
}
