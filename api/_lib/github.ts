import { LigneFtConfigurationError, LigneFtGithubError } from "./errors.js";

// Le viewer n'écrit/lit qu'une seule cible : le repo lim-logs (privé), où vit le
// fichier LTV canonique unique. Token réutilisé de l'écosystème existant.
type GithubConfig = { token: string; owner: string; repo: string; branch: string };

const DEFAULT_BRANCH = "main";

export function getGithubConfig(): GithubConfig {
  const token =
    process.env.LIM_LOGS_GITHUB_TOKEN?.trim() ||
    process.env.LIGNEFT_LIM2_GITHUB_TOKEN?.trim() ||
    process.env.LIGNEFT_EDITOR_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();

  if (!token) {
    throw new LigneFtConfigurationError(
      "Missing GitHub token for lim-logs (set LIM_LOGS_GITHUB_TOKEN or reuse an existing token)"
    );
  }

  return {
    token,
    owner: process.env.LIM_LOGS_GITHUB_OWNER?.trim() || "michaelecalle",
    repo: process.env.LIM_LOGS_GITHUB_REPO?.trim() || "lim-logs",
    branch: process.env.LIM_LOGS_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH,
  };
}

function apiUrl(path: string): string {
  const { owner, repo } = getGithubConfig();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path.replace(/^\/+/, "")}`;
}

function headers(): HeadersInit {
  const { token } = getGithubConfig();
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fail(response: Response): Promise<never> {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    try {
      details = await response.text();
    } catch {
      details = undefined;
    }
  }
  throw new LigneFtGithubError(`GitHub request failed with status ${response.status}`, details);
}

export async function githubGetFile(path: string): Promise<{ content: string; sha: string }> {
  const { branch } = getGithubConfig();
  const url = new URL(apiUrl(path));
  url.searchParams.set("ref", branch);

  const response = await fetch(url.toString(), { method: "GET", headers: headers(), cache: "no-store" });
  if (!response.ok) await fail(response);

  const json = (await response.json()) as { type: string; encoding: string; content: string; sha: string };
  if (json.type !== "file" || json.encoding !== "base64") {
    throw new LigneFtGithubError(`Unexpected GitHub file response for path: ${path}`, json);
  }
  return { content: Buffer.from(json.content, "base64").toString("utf-8"), sha: json.sha };
}

// Métadonnées d'un fichier existant : sha (pour écraser) + size (octets, pour la
// dédup). Renvoie null si le fichier n'existe pas encore (404).
export async function githubGetFileMeta(path: string): Promise<{ sha: string; size: number } | null> {
  const { branch } = getGithubConfig();
  const url = new URL(apiUrl(path));
  url.searchParams.set("ref", branch);

  const response = await fetch(url.toString(), { method: "GET", headers: headers(), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) await fail(response);

  const json = (await response.json()) as { sha?: string; size?: number };
  if (!json.sha) return null;
  return { sha: json.sha, size: typeof json.size === "number" ? json.size : -1 };
}

export async function githubGetFileSha(path: string): Promise<string | null> {
  const meta = await githubGetFileMeta(path);
  return meta?.sha ?? null;
}

export async function githubPutFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ path: string; sha: string }> {
  // Contenu texte (UTF-8) → base64. Pour du binaire, utiliser githubPutFileBase64.
  return githubPutFileBase64(path, Buffer.from(content, "utf-8").toString("base64"), message, sha);
}

// Écrit un fichier dont le contenu est DÉJÀ en base64 (binaire : PDF, images…).
// L'API GitHub Contents attend le contenu en base64 ; ici on ne ré-encode PAS en
// UTF-8 (ce qui corromprait les octets d'un PDF).
export async function githubPutFileBase64(
  path: string,
  base64Content: string,
  message: string,
  sha?: string
): Promise<{ path: string; sha: string }> {
  const { branch } = getGithubConfig();

  const response = await fetch(apiUrl(path), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!response.ok) await fail(response);

  const json = (await response.json()) as { content?: { path: string; sha: string } };
  if (!json.content?.path || !json.content?.sha) {
    throw new LigneFtGithubError(`Invalid GitHub PUT response for path: ${path}`, json);
  }
  return { path: json.content.path, sha: json.content.sha };
}
