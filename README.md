# Minha Carta Celeste

Loja digital de cartas celestes personalizadas, hospedada no Netlify e integrada ao Mercado Pago.

## Fluxo atual

1. A pessoa informa data, hora, fuso e local.
2. Personaliza título, mensagem, cor, tipografia, tamanho e presença visual de Sol, Lua, planetas e constelações.
3. A prévia é calculada no navegador.
4. Antes do checkout, o design é salvo no backend (Netlify Blobs).
5. O Mercado Pago processa o pagamento.
6. Após confirmação `approved`, o backend gera o SVG final em alta usando o design salvo.
7. O arquivo fica protegido por um token assinado e é liberado por `/api/download`.
8. Se o Resend estiver configurado, o comprador recebe o link por e-mail junto com uma leitura curta, educativa e poética sobre o céu daquele instante.

## Tamanhos

- A4 — 21 × 29,7 cm
- A3 — 29,7 × 42 cm
- Grande — 42,4 × 60 cm (mesma proporção da série A)

## Catálogo astronômico local no deploy

O navegador não consulta o GitHub do d3-celestial a cada visita. Durante o build, `scripts/fetch-sky-data.mjs` copia uma versão fixada dos arquivos `stars.6.json` e `constellations.lines.json` para `/data`. Depois do deploy eles são servidos pelo próprio domínio do Minha Carta Celeste.

A origem está fixada no commit `7e720a3de062059d4c5400a379146a601d9010e0` do d3-celestial para evitar mudanças inesperadas entre builds.

## Variáveis de ambiente no Netlify

Obrigatórias para pagamento:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `SITE_URL` — URL pública final, sem barra no fim

Preços (em centavos):

- `PRICE_A4_CENTS` — padrão `4990`
- `PRICE_A3_CENTS` — padrão `5990`
- `PRICE_60_CENTS` — padrão `6990`

Para e-mail automático:

- `RESEND_API_KEY`
- `EMAIL_FROM` — remetente verificado no Resend, por exemplo `Minha Carta Celeste <cartas@seudominio.com.br>`

## Segurança do pagamento

- O Access Token do Mercado Pago nunca fica no JavaScript do navegador.
- O webhook valida `x-signature` com HMAC-SHA256 antes de processar notificações.
- O backend consulta o pagamento diretamente na API do Mercado Pago antes de liberar a arte.
- O design comprado é armazenado antes do checkout; a versão final não depende de um `localStorage` de “pago”.
- A arte final é gerada no backend e guardada no Netlify Blobs.

## Deploy no Netlify

Importe o repositório GitHub. O `netlify.toml` define o build automaticamente. O comando executado é `npm run prepare-data` e o diretório publicado é `.`.

## Precisão astronômica

O projeto usa posições estelares de catálogo J2000 e um modelo de baixa precisão para Sol, Lua e planetas. A projeção converte ascensão reta/declinação para altitude/azimute a partir do instante UTC e das coordenadas informadas. O objetivo é um produto gráfico astronômico; não substitui efemérides de observatório de alta precisão.

Consulte `THIRD_PARTY_NOTICES.md` para dados e licenças de terceiros.
