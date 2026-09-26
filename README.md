# Site do Luigol

Site estático: HTML, CSS e JavaScript puros, sem dependências.

## Estrutura

```
index.html        ← todos os textos (é aqui que você edita o conteúdo)
css/style.css     ← cores, fontes, layout, animações e versão mobile
js/main.js        ← animação ao rolar, carrossel e abas de habilidades
assets/
  img/            ← foto e logos
  video/          ← vídeo do hero (webm + mp4) e imagem de capa
  fonts/          ← Poppins Light (SIL Open Font License)
```

## Ver no computador

Na pasta do projeto:

```bash
python -m http.server 8000
```

Depois abra http://localhost:8000. Abrir o `index.html` direto também funciona, mas o vídeo pode não rodar em alguns navegadores.

## Editar

- **Textos:** estão todos no `index.html`, separados por comentários (HERO, O QUE EU ENTREGO, EMPRESAS, TRAJETÓRIA, HABILIDADES).
- **Nova empresa no carrossel:** copie um `<li class="marquee__item">` e troque a imagem. O script repete a lista sozinho.
- **Cores:** variáveis no topo do `css/style.css` (`--red`, `--bg` etc.).
- **Velocidade do carrossel:** `PX_POR_SEGUNDO` no `js/main.js`.

## Pendências

- [ ] Link do GitHub no topo (procure `TODO` no `index.html`).
- [ ] Botão "Fale comigo": hoje abre um e-mail; troque se preferir WhatsApp ou LinkedIn.

## Publicar

Suba a pasta no GitHub Pages, Netlify ou Vercel. Não há build: é só publicar os arquivos como estão.
