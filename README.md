# Minha Carta Celeste

MVP de uma loja de mapas celestes personalizados, pronto para deploy no Netlify.

## O que já funciona

- Mapa do céu calculado a partir de latitude, longitude, data, hora e fuso horário.
- Busca de cidade/local via função serverless do Netlify + OpenStreetMap/Nominatim.
- Catálogo estelar até magnitude 6 e linhas das constelações carregados do projeto open-source d3-celestial.
- Personalização de nome, mensagem, local, cores, tipografia e linhas das constelações.
- Prévia responsiva em tempo real.
- Exportação de prévia PNG.
- Fluxo opcional de pagamento Stripe Checkout.
- Depois de um Checkout verificado, download em SVG vetorial e PNG de alta resolução.

## Deploy no Netlify

1. No Netlify, escolha **Add new project > Import an existing project > GitHub**.
2. Selecione `suzyrt/minha-carta-celeste`.
3. Build command: deixe vazio.
4. Publish directory: `.`
5. Faça o deploy.

O arquivo `netlify.toml` já contém as configurações necessárias.

## Pagamento Stripe (opcional durante desenvolvimento)

No Netlify, em **Site configuration > Environment variables**, crie:

- `STRIPE_SECRET_KEY` = sua chave secreta Stripe (`sk_...`)
- `SITE_URL` = URL final do site, por exemplo `https://minha-carta-celeste.netlify.app`
- `PRODUCT_PRICE_CENTS` = preço em centavos, por exemplo `4990` para R$ 49,90

Sem essas variáveis o editor e a prévia continuam funcionando, mas o botão de compra informa que o checkout ainda não foi configurado.

## Precisão astronômica

O motor converte ascensão reta/declinação para altitude/azimute usando tempo sideral de Greenwich, coordenadas geográficas e instante UTC. Para o MVP, as posições catalogadas são J2000 sem correção fina de precessão, nutação, refração atmosférica ou movimento próprio. Isso é mais do que suficiente para a aparência de um pôster do céu nas últimas décadas, mas uma versão científica/observacional pode adicionar essas correções.

## Dados e atribuições

Os dados estelares e linhas de constelações são carregados em tempo de execução a partir do projeto [d3-celestial](https://github.com/ofrohn/d3-celestial), de Olaf Frohn, licenciado sob BSD-3-Clause. Consulte `THIRD_PARTY_NOTICES.md`.

A busca geográfica usa OpenStreetMap/Nominatim por meio de uma função serverless para evitar expor a integração diretamente no navegador.
