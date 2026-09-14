export const SPAM_LIMIT = 10;
export const SPAM_WINDOW_MS = 60_000;

export interface RegistroSpam {
  contagem: number;
  janela_inicio: string | null;
}

export interface ResultadoSpam {
  bloqueado: boolean;
  contagem: number;
  janelaInicio: string;
}

function parseISO(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

export function dentroDaJanela(
  janelaInicio: string | null,
  agora: Date,
  janelaMs: number = SPAM_WINDOW_MS,
): boolean {
  const inicio = parseISO(janelaInicio);
  if (inicio === null) return false;
  return agora.getTime() - inicio < janelaMs;
}

export function calcularSpam(
  registro: RegistroSpam | null,
  agora: Date,
  limite: number = SPAM_LIMIT,
  janelaMs: number = SPAM_WINDOW_MS,
): ResultadoSpam {
  if (!registro || !dentroDaJanela(registro.janela_inicio, agora, janelaMs)) {
    return { bloqueado: false, contagem: 1, janelaInicio: agora.toISOString() };
  }
  const contagem = Number(registro.contagem ?? 0) + 1;
  return {
    bloqueado: contagem > limite,
    contagem,
    janelaInicio: registro.janela_inicio ?? agora.toISOString(),
  };
}

export async function registrarContagemSpam(
  db: { prepare: (sql: string) => any },
  numero: string,
  agora: Date = new Date(),
): Promise<ResultadoSpam> {
  const row = (await db
    .prepare('SELECT contagem, janela_inicio FROM spam_contador WHERE numero = ?')
    .bind(numero)
    .first()) as RegistroSpam | null | undefined;

  const resultado = calcularSpam(row ?? null, agora);

  await db
    .prepare(
      'INSERT INTO spam_contador (numero, janela_inicio, contagem) VALUES (?, ?, ?) ON CONFLICT(numero) DO UPDATE SET janela_inicio = excluded.janela_inicio, contagem = excluded.contagem',
    )
    .bind(numero, resultado.janelaInicio, resultado.contagem)
    .run();

  return resultado;
}