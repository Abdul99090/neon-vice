// NEON VICE — entry program for make.fun (gta6-cover-art-01).
//
// Copies app/ and screenshots/ from this repository into the output
// directory (/output in the grader; MAKEFUN_OUTPUT_DIR elsewhere) and
// writes dossier.json there with buildDossier from the kit's vendored
// library, byte for byte as the scorer rebuilds it. Standard library
// only, no network, deterministic: two runs produce identical bytes.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};
const DOSSIER_MAX_BYTES = 1572864; // 1.5 MiB, the gate's dossier cap

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(repoDir, "app"), join(outDir, "app"), { recursive: true });
cpSync(join(repoDir, "screenshots"), join(outDir, "screenshots"), {
  recursive: true,
});

const dossier = buildDossier(outDir, CAPS);
const bytes = Buffer.from(dossier);
if (bytes.length > DOSSIER_MAX_BYTES) {
  throw new Error(
    `dossier.json would be ${bytes.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`,
  );
}
writeFileSync(join(outDir, "dossier.json"), bytes);

// Self-check: the scorer rebuilds the dossier from the output directory
// and compares byte for byte, so prove here that what was written is
// exactly what buildDossier produces from the files now on disk.
const rebuilt = Buffer.from(buildDossier(outDir, CAPS));
const onDisk = readFileSync(join(outDir, "dossier.json"));
if (!rebuilt.equals(onDisk)) {
  throw new Error("dossier.json on disk differs from a fresh buildDossier of the output");
}

console.log(
  `NEON VICE: app + screenshots + dossier.json (${bytes.length} bytes, self-check ok) written to ${outDir}`,
);
